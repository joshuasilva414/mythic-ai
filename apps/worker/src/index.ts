import {
	smoothStream,
	streamText,
	type ModelMessage,
	experimental_generateSpeech as generateSpeech,
	experimental_transcribe as transcribe,
	stepCountIs,
	tool,
} from 'ai';
import { DurableObject } from 'cloudflare:workers';
// import { chatModel, ttsModel, sttModel } from './agent';
import { createModels } from 'shared/ai/models';
import PQueue from 'p-queue';
import z from 'zod';
import { dungeonMasterPrompt } from 'shared/ai/prompts/dm';
import { createClient } from '@libsql/client/web';
import { createDatabase, campaigns } from 'db';
import { getWorldSetting } from 'shared/queries/campaign';

export class DungeonMasterDurableObject extends DurableObject<Env> {
	env: Env;
	campaignId: number;
	msgHistory: ModelMessage[];
	worldSetting?: string;
	queue: PQueue;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.env = env;
		this.campaignId = Number.parseInt(ctx.id.name!);
		this.msgHistory = [];
		this.queue = new PQueue({ concurrency: 1 });
	}

	async init(campaignId: number) {
		this.campaignId = campaignId;
		if (!this.worldSetting) {
			const client = createClient({
				url: this.env.TURSO_DATABASE_URL,
				authToken: this.env.TURSO_AUTH_TOKEN,
			});
			const db = createDatabase(client);
			this.worldSetting = await getWorldSetting(db, campaigns, this.campaignId);
		}
	}

	// Handle requests forwarded via stub.fetch()
	// This is the entry point for WebSocket connections
	async fetch(request: Request): Promise<Response> {
		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader !== 'websocket') {
			return new Response('Expected websocket upgrade', { status: 426 });
		}

		// Get campaignId from URL and initialize
		const url = new URL(request.url);
		const campaignId = url.searchParams.get('campaignId');
		if (campaignId) {
			await this.init(Number.parseInt(campaignId));
		}

		// Creates two ends of a WebSocket connection
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		// Use acceptWebSocket() for Hibernatable WebSockets API
		// This connects the WebSocket to the Durable Object and allows hibernation
		this.ctx.acceptWebSocket(server);

		// Send ready status (server is now managed by the DO, we can send on it)
		server.send(JSON.stringify({ type: 'status', text: 'ready' }));

		console.log('WebSocket connection established for campaign:', this.campaignId);

		// Return the client end of the WebSocket to the caller
		return new Response(null, { status: 101, webSocket: client });
	}

	// Hibernatable WebSocket handler - called when a message is received
	async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
		const models = createModels({
			openaiApiKey: this.env.OPENAI_API_KEY,
			elevenlabsApiKey: this.env.ELEVENLABS_API_KEY,
		});
		// handle chat commands
		if (typeof message === 'string') {
			try {
				const { type, data } = JSON.parse(message);
				if (type === 'cmd' && data === 'clear') {
					this.msgHistory.length = 0; // clear chat history
				}
			} catch {
				// Not JSON, ignore
			}
			return; // end processing here for string messages
		}

		// transcribe audio buffer to text (stt)
		const { text } = await transcribe({
			model: models.sttModel,
			audio: message as ArrayBuffer,
		});
		console.log('>>', text);

		// Check if WebSocket is still open before sending transcription
		if (ws.readyState === WebSocket.READY_STATE_OPEN) {
			ws.send(JSON.stringify({ type: 'text', text })); // send transcription to client
		}
		this.msgHistory.push({ role: 'user', content: text });

		// run inference
		console.log('Starting inference...');

		const result = await streamText({
			model: models.chatModel,
			messages: this.msgHistory,
			// tools: {
			// 	weather: tool({
			// 		description: 'Get the weather in a location',
			// 		inputSchema: z.object({
			// 			location: z.string().describe('The location to get the weather for'),
			// 		}),
			// 		execute: async ({ location }) => ({
			// 			location,
			// 			temperature: 72 + Math.floor(Math.random() * 21) - 10,
			// 		}),
			// 	}),
			// },
			stopWhen: stepCountIs(5),
			system: dungeonMasterPrompt(this.worldSetting!),
			maxOutputTokens: 2000, // GPT-5 reasoning consumes tokens before text output
			// Sentence-based chunking for low-latency TTS
			experimental_transform: smoothStream({
				delayInMs: null,
				chunking: (buf: string) => {
					// emit a sentence if we see ., !, ? followed by space/end
					const m = buf.match(/^(.+?[.!?\n])(?:\s+|$)/);
					if (m) return m[0];
					// otherwise emit a clause if it's getting long
					// if (buf.length > 120) return buf;
					return null;
				},
			}),
		});

		let fullReply = '';

		// Process each sentence as it streams in
		for await (const chunk of result.textStream) {
			const sentence = String(chunk).trim();
			if (!sentence) continue;

			fullReply += (fullReply ? ' ' : '') + sentence;

			// Check if WebSocket is still open before sending
			if (ws.readyState === WebSocket.READY_STATE_OPEN) {
				ws.send(JSON.stringify({ type: 'status', text: 'Speaking…' }));
			}

			console.log('<<', sentence);

			// Queue TTS for this sentence immediately (don't wait for full response)
			void this.queue.add(async () => {
				try {
					// Check if WebSocket is still open before generating and sending TTS
					if (ws.readyState !== WebSocket.READY_STATE_OPEN) {
						console.log('WebSocket closed, skipping TTS for:', sentence);
						return;
					}

					const tts = await generateSpeech({ model: models.ttsModel, text: sentence, voice: this.env.VOICE_ID });

					// normalize to a base64 string
					let b64: string;
					if (typeof tts === 'string') {
						b64 = tts;
					} else if (tts && typeof tts === 'object' && 'audio' in tts) {
						b64 = tts.audio.base64;
					} else {
						// Convert Uint8Array to base64
						b64 = btoa(String.fromCharCode(...new Uint8Array(tts as ArrayBuffer)));
					}

					// Check again after TTS generation (it might have closed during generation)
					if (ws.readyState === WebSocket.READY_STATE_OPEN) {
						ws.send(JSON.stringify({ type: 'audio', text: sentence, audio: b64 }));
					}
				} catch (error) {
					console.error('TTS error for sentence:', sentence, error);
				}
			});
		}

		// wait for audio queue to drain before closing the turn
		await this.queue.onIdle();

		// Only after the model finishes: add one assistant turn to history
		this.msgHistory.push({ role: 'assistant', content: fullReply });

		// Check if WebSocket is still open before sending final status
		if (ws.readyState === WebSocket.READY_STATE_OPEN) {
			ws.send(JSON.stringify({ type: 'status', text: 'Idle' }));
		}

		// Optional debug:
		console.log('finishReason:', await result.finishReason);
	}

	// Hibernatable WebSocket handler - called when the connection is closed
	async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		console.log('WebSocket closed:', code, reason, wasClean);
		ws.close(code, 'Durable Object is closing WebSocket');
	}

	// Hibernatable WebSocket handler - called on WebSocket errors
	async webSocketError(ws: WebSocket, error: unknown) {
		console.error('WebSocket error:', error);
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.url.includes('/websocket')) {
			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				return new Response('Expected upgrade to websocket', {
					status: 426,
					headers: { 'Content-Type': 'text/plain' },
				});
			}
			try {
				const campaignId = new URL(request.url).searchParams.get('campaignId');
				if (!campaignId) {
					return new Response('Missing campaignId', {
						status: 400,
						headers: { 'Content-Type': 'text/plain' },
					});
				}
				// Get the Durable Object stub
				const id = env.DUNGEON_MASTER_DURABLE_OBJECT.idFromName(campaignId);
				const stub = env.DUNGEON_MASTER_DURABLE_OBJECT.get(id);

				// Forward the request directly to the Durable Object
				// The DO's fetch() method will handle the WebSocket upgrade
				return stub.fetch(request);
			} catch (error) {
				console.error('WebSocket handler error:', error);
				return new Response(`WebSocket error: ${error instanceof Error ? error.message : String(error)}`, {
					status: 500,
					headers: { 'Content-Type': 'text/plain' },
				});
			}
		}

		return new Response(null, {
			status: 400,
			statusText: 'Bad Request',
			headers: { 'Content-Type': 'text/plain' },
		});
	},
} satisfies ExportedHandler<Env>;

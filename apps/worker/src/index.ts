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
import { chatModel, ttsModel, sttModel } from './agent';
import PQueue from 'p-queue';
import { openai } from '@ai-sdk/openai';
import z from 'zod';
import { env } from 'cloudflare:workers';

/* Todo
 * ✅ 1. WS with frontend
 * ✅ 2. Get audio to backend
 * ✅ 3. Convert audio to text
 * ✅ 4. Run inference
 * ✅ 5. Convert result to audio
 * ✅ 6. Send audio to frontend
 */

export class DungeonMasterDurableObject extends DurableObject {
	env: Env;
	msgHistory: ModelMessage[];
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.env = env;
		this.msgHistory = [];
	}
	async fetch(request: Request) {
		// set up ws pipeline
		const webSocketPair = new WebSocketPair();
		const [socket, ws] = Object.values(webSocketPair);

		console.log('request', request.method, request.url);

		ws.accept();
		ws.send(JSON.stringify({ type: 'status', text: 'ready' })); // tell the client it’s safe to send
		// const workersai = createWorkersAI({ binding: this.env.AI });
		const queue = new PQueue({ concurrency: 1 });

		ws.addEventListener('message', async (event) => {
			// handle chat commands
			if (typeof event.data === 'string') {
				const { type, data } = JSON.parse(event.data);
				if (type === 'cmd' && data === 'clear') {
					this.msgHistory.length = 0; // clear chat history
				}
				return; // end processing here for this event type
			}

			// transcribe audio buffer to text (stt)
			const { text } = await transcribe({
				model: openai.transcription('whisper-1'),
				audio: [...new Uint8Array(event.data as ArrayBuffer)],
			});
			console.log('>>', text);
			ws.send(JSON.stringify({ type: 'text', text })); // send transcription to client
			this.msgHistory.push({ role: 'user', content: text });

			// run inference
			console.log('Starting inference...');

			const result = await streamText({
				model: chatModel,
				messages: this.msgHistory,
				tools: {
					weather: tool({
						description: 'Get the weather in a location',
						inputSchema: z.object({
							location: z.string().describe('The location to get the weather for'),
						}),
						execute: async ({ location }) => ({
							location,
							temperature: 72 + Math.floor(Math.random() * 21) - 10,
						}),
					}),
				},
				stopWhen: stepCountIs(5),
				system: 'You are a helpful assistant in a voice conversation with the user',
				maxOutputTokens: 160,
				temperature: 0.7,
				// IMPORTANT: sentence chunking, no artificial delay
				experimental_transform: smoothStream({
					delayInMs: null,
					chunking: (buf: string) => {
						// emit a sentence if we see ., !, ? followed by space/end
						const m = buf.match(/^(.+?[.!?])(?:\s+|$)/);
						if (m) return m[0];
						// otherwise emit a clause if it’s getting long
						if (buf.length > 120) return buf;
						return null;
					},
				}),
			});

			let fullReply = '';
			for await (const chunk of result.textStream) {
				const sentence = String(chunk).trim();
				if (!sentence) continue;

				fullReply += (fullReply ? ' ' : '') + sentence;
				ws.send(JSON.stringify({ type: 'status', text: 'Speaking…' }));

				console.log('<<', sentence);

				// serialize TTS per sentence (keeps order) but don't block the reader too long
				// DO NOT await here – let the reader continue; queue enforces order=1
				void queue.add(async () => {
					const tts = await generateSpeech({ model: ttsModel as any, text: sentence, voice: this.env.VOICE_ID });

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

					ws.send(JSON.stringify({ type: 'audio', text: sentence, audio: b64 }));
				});
			}

			// wait for audio queue to drain before closing the turn
			await queue.onIdle();

			// Only after the model finishes: add one assistant turn to history
			this.msgHistory.push({ role: 'assistant', content: fullReply });
			ws.send(JSON.stringify({ type: 'status', text: 'Idle' }));

			// Optional debug:
			console.log('finishReason:', await result.finishReason);
		});

		ws.addEventListener('close', (cls) => {
			ws.close(cls.code, 'Durable Object is closing WebSocket');
		});

		return new Response(null, { status: 101, webSocket: socket });
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// console.log('ctx.name:', ctx.props.name);
		if (request.url.endsWith('/websocket')) {
			const upgradeHeader = request.headers.get('Upgrade');
			if (!upgradeHeader || upgradeHeader !== 'websocket') {
				return new Response('Expected upgrade to websocket', { status: 426 });
			}
			const id: DurableObjectId = env.DUNGEON_MASTER_DURABLE_OBJECT.idFromName(crypto.randomUUID());
			const stub = env.DUNGEON_MASTER_DURABLE_OBJECT.get(id);
			return stub.fetch(request);
		}

		return new Response(null, {
			status: 400,
			statusText: 'Bad Request',
			headers: { 'Content-Type': 'text/plain' },
		});
	},
} satisfies ExportedHandler<Env>;

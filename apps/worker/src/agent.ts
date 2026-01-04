import { createOpenAI } from '@ai-sdk/openai';
import { createElevenLabs } from '@ai-sdk/elevenlabs';
import { env } from 'cloudflare:workers';

export const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
export const elevenlabs = createElevenLabs({ apiKey: env.ELEVENLABS_API_KEY });

export const chatModel = openai.chat('gpt-5');
export const ttsModel = elevenlabs.speech('eleven_v3');
export const sttModel = elevenlabs.transcription('scribe_v1');

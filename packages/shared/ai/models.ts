import { createOpenAI } from "@ai-sdk/openai";
import { createElevenLabs } from "@ai-sdk/elevenlabs";

export interface AIConfig {
  openaiApiKey: string;
  elevenlabsApiKey: string;
}

export function createModels(config: AIConfig) {
  const openai = createOpenAI({ apiKey: config.openaiApiKey });
  const elevenlabs = createElevenLabs({ apiKey: config.elevenlabsApiKey });

  return {
    chatModel: openai.chat("gpt-5"),
    ttsModel: elevenlabs.speech("eleven_v3"),
    sttModel: elevenlabs.transcription("scribe_v1"),
  };
}

// Type exports for consumers
export type AIModels = ReturnType<typeof createModels>;

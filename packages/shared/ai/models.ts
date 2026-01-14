import { createOpenAI } from "@ai-sdk/openai";
// import { createElevenLabs } from "@ai-sdk/elevenlabs";

export interface AIConfig {
  openaiApiKey: string;
  elevenlabsApiKey: string;
}

export function createModels(config: AIConfig) {
  const openai = createOpenAI({ apiKey: config.openaiApiKey });
  // const elevenlabs = createElevenLabs({ apiKey: config.elevenlabsApiKey });

  return {
    chatModel: openai.responses("gpt-5-nano"), // Use responses API for gpt-5
    ttsModel: openai.speech("gpt-4o-mini-tts"),
    sttModel: openai.transcription("gpt-4o-mini-transcribe"),
  };
}

// Type exports for consumers
export type AIModels = ReturnType<typeof createModels>;

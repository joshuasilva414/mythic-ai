import { generateText, type LanguageModel } from "ai";
import { campaignPrompt } from "./prompts/campaign";

export async function generateWorld(model: LanguageModel) {
  console.log("Generating!");
  const { text: world } = await generateText({
    model,
    prompt: campaignPrompt,
  });
  console.log("Generated!");

  return world;
}

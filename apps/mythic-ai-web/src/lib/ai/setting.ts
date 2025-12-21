import { generateText, generateObject } from "ai";
import { gpt5 } from "@/lib/ai/models";
import { z } from "zod";
import { campaignPrompt } from "./prompts/campaign";

async function generateWorld() {
  const model = gpt5;

  console.log("Generating!");
  const { text: world } = await generateText({
    model,
    prompt: campaignPrompt,
  });
  console.log("Generated!");

  return world;
}

export { generateWorld };

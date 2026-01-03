import { campaigns } from "@/db/schema";

export type Campaign = typeof campaigns.$inferSelect;

export type Role = "user" | "assistant" | "system";
export type ChatMsg = { role: Role; content: string };

// WebSocket message types
export type WebSocketMessage =
  | { type: "status"; text: string }
  | { type: "text" | "transcript"; text: string }
  | {
      type: "audio" | "assistant";
      text?: string;
      audio?: string | { audio: string };
    };
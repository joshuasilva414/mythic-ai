"use client";

import { useCallback } from "react";
import { useAgentConversation } from "../hooks/useAgentConversation";
import { Orb } from "@/components/ui/orb";
import { Button } from "@/components/ui/button";

export function Conversation({ prompt }: { prompt: string }) {
  const { startConversation, stopConversation, conversation, transcript } =
    useAgentConversation(prompt);

  const handleStart = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await startConversation();
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }, [startConversation]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Orb agentState={null} />
      <div className="flex gap-2">
        <Button
          onClick={handleStart}
          disabled={conversation?.status == "connected"}
        >
          Start Conversation
        </Button>
        <Button
          onClick={stopConversation}
          disabled={conversation?.status != "connected"}
        >
          Stop Conversation
        </Button>
      </div>
      <div className="flex flex-col items-center">
        <p>Status: {conversation?.status}</p>
      </div>
      <div className="flex flex-col items-center">
        {transcript.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p className="text-sm text-muted-foreground">
              {message.role === "user" ? "You" : "Agent"}
            </p>
            <p className="text-sm">{message.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

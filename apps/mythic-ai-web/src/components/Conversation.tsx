"use client";

import { useCallback } from "react";
import { useAgentConversation } from "../hooks/useAgentConversation";
import { Orb } from "@/components/ui/orb";
import { Button } from "@/components/ui/button";

export function Conversation() {
  const { startConversation, stopConversation, conversation } =
    useAgentConversation();

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
    </div>
  );
}

"use client";

import { useCallback } from "react";
import { useAgentConversation } from "../hooks/useAgentConversation";
import { Orb } from "@/components/ui/orb";
import { Button } from "@/components/ui/button";

export function Conversation() {
  const {
    messages,
    status,
    connected,
    listening,
    playbackEl,
    aiSpeaking,
    audioCtx,
    onStart,
    onStop,
    onClear,
    chatContainerRef,
    vad,
  } = useAgentConversation();

  const handleStart = useCallback(async () => {
    try {
      // await navigator.mediaDevices.getUserMedia({ audio: true });
      await onStart();
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }, [onStart]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Orb agentState={null} />
      <div className="flex gap-2">
        <Button onClick={handleStart} disabled={connected}>
          Start Conversation
        </Button>
        <Button onClick={onStop} disabled={!connected}>
          Stop Conversation
        </Button>
      </div>
      <div className="flex flex-col items-center">
        <p>Status: {status}</p>
      </div>
      <div className="flex flex-col items-center">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p className="text-sm text-muted-foreground">
              {message.role === "user" ? "You" : "Agent"}
            </p>
            <p className="text-sm">{message.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

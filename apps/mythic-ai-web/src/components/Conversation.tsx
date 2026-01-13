"use client";

import { useCallback, useState } from "react";
import { useAgentConversation } from "../hooks/useAgentConversation";
import { AgentState, Orb } from "@/components/ui/orb";
import { Button } from "@/components/ui/button";
import { ChatMsg } from "@/lib/types/campaign";
import { RefObject } from "react";

import { Pause, Play, Square, Mic, MicOff } from "lucide-react";
import { Card } from "./ui/card";

export function Conversation({ campaignId }: { campaignId: string }) {
  const {
    messages,
    status,
    listening,
    aiSpeaking,
    onStart,
    onStop,
    onClear,
    onMute,
    onUnmute,
    muted,
    chatContainerRef,
    playStatus,
  } = useAgentConversation(campaignId);

  const handleStart = useCallback(async () => {
    try {
      // await navigator.mediaDevices.getUserMedia({ audio: true });
      await onStart();
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  }, [onStart]);

  const getAgentState = useCallback((): AgentState | null => {
    if (listening) {
      return "listening";
    } else if (aiSpeaking) {
      return "talking";
    } else if (status == "Thinking...") {
      return "thinking";
    }
    return null;
  }, [listening, aiSpeaking, status]);

  return (
    <div className="h-full gap-2 w-full min-h-0 flex flex-col justify-center items-center">
      <div className="w-1/2 flex flex-col justify-center items-center gap-4">
        <div className="max-w-2/3">
          <Orb agentState={getAgentState()} />
        </div>
        <Card className="w-min p-2 mx-auto">
          <div className="flex gap-2 justify-center">
            {muted ? (
              <Button
                className="bg-gray-400 hover:bg-gray-500"
                onClick={() => onUnmute()}
              >
                <MicOff />
              </Button>
            ) : (
              <Button onClick={() => onMute()}>
                <Mic />
              </Button>
            )}
            {playStatus == "paused" ? (
              <Button onClick={handleStart}>
                <Play />
              </Button>
            ) : (
              <Button onClick={onStop}>
                <Pause />
              </Button>
            )}

            <Button onClick={onStop} className="bg-red-500">
              <Square />
            </Button>
          </div>
        </Card>
        <div className="flex flex-col items-center">
          <p>Status: {status}</p>
        </div>
      </div>
      <div className="w-2/3 flex-1 min-h-0 overflow-hidden">
        <ChatContainer
          messages={messages}
          chatContainerRef={chatContainerRef}
        />
      </div>
    </div>
  );
}

function ChatContainer({
  messages,
  chatContainerRef,
}: {
  messages: ChatMsg[];
  chatContainerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="flex flex-col p-8 overflow-y-auto h-full"
      ref={chatContainerRef}
    >
      {messages.map((message, index) => (
        <div
          key={index}
          className={`nth-last-1:*:font-semibold nth-last-1:*:text-black flex flex-col ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <p className="text-sm text-muted-foreground">
            {message.role === "user" ? "You" : "Dungeon Master"}
          </p>
          <p className="text-lg text-muted-foreground">{message.content}</p>
        </div>
      ))}
    </div>
  );
}

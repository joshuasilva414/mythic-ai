"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMicVAD } from "@ricky0123/vad-react";
import { encodeWavPCM16 } from "@/lib/audio";
import VoiceVisualStatus from "@/components/campaigns/VoiceVisualStatus";
import { Role, ChatMsg, WebSocketMessage } from "@/lib/types/campaign";
import { useAgentConversation } from "@/hooks/useAgentConversation";

export default function VoiceChat() {
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

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={chatContainerRef}
        className="rounded-xl border bg-white p-4 h-[420px] overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-gray-400">
            No messages yet. Click &ldquo;Start Conversation&rdquo; to talk.
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, i) => (
              <li
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={[
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : m.role === "assistant"
                        ? "bg-gray-200 text-gray-900"
                        : "bg-amber-100 text-amber-900",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VoiceVisualStatus
        mode={aiSpeaking ? "playback" : "mic"}
        audioContext={audioCtx}
        playbackEl={playbackEl}
        statusText={status}
        listening={listening}
        vadLoading={vad.loading}
        userSpeaking={vad.userSpeaking}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onStart}
          disabled={listening}
          className={`rounded-lg px-4 py-2 font-medium ${
            listening
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:opacity-90 active:scale-95"
          } text-white shadow`}
        >
          Start Conversation
        </button>

        <button
          onClick={onStop}
          disabled={!listening}
          className={`rounded-lg px-4 py-2 font-medium ${
            !listening
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-600 hover:opacity-90 active:scale-95"
          } text-white shadow`}
        >
          Stop Conversation
        </button>

        <button
          onClick={onClear}
          className="ml-auto rounded-lg px-4 py-2 font-medium bg-gray-700 text-white shadow hover:opacity-90 active:scale-95"
        >
          Clear Chat
        </button>

        <span
          className={`text-xs ${
            connected ? "text-green-700" : "text-gray-400"
          }`}
        >
          {connected ? "WS connected" : "WS disconnected"}
        </span>
      </div>
    </div>
  );
}

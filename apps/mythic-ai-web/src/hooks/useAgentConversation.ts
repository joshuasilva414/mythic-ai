import { useConversation } from "@elevenlabs/react";
import { useState } from "react";

export const useAgentConversation = (prompt: string) => {
  const [transcript, setTranscript] = useState<
    { role: string; message: string }[]
  >([]);
  const conversation = useConversation({
    overrides: {
      agent: {
        prompt: {prompt}
      },
    },
    micMuted: false,
    onMessage: ({ message, role }) => {
      setTranscript((prev) => [...prev, { role, message }]);
    },
  });

  const startConversation = async () => {
    const response = await fetch("/api/agent_url", {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch signed URL");
    }
    const signedUrl = await response.text();
    const session = await conversation.startSession({
      signedUrl,
      connectionType: "websocket",
    });
    return session;
  };

  const stopConversation = async () => {
    await conversation.endSession();
  };

  return {
    startConversation,
    stopConversation,
    conversation,
    transcript,
  };
};

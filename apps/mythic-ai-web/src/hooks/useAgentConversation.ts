import { useConversation } from "@elevenlabs/react";

export const useAgentConversation = () => {
  const conversation = useConversation({
    micMuted: false,
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
  };
};

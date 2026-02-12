"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import { getMessageText, toChatUIState } from "@/utils/chat-message-utils";
import type { ChatUIState } from "@/types";

export interface UseAnalysisChatReturn {
  chatState: ChatUIState;
  resultText: string;
  error: Error | null;
  handleSubmit: (content: string) => void;
  handleCancel: () => void;
}

export function useAnalysisChat(): UseAnalysisChatReturn {
  const { messages, status, error, sendMessage, stop, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const chatState = toChatUIState(status);

  const lastAssistantMessage = useMemo(() => {
    const assistant = [...messages].reverse().find((m) => m.role === "assistant");
    return assistant ?? null;
  }, [messages]);

  const resultText = useMemo(() => {
    if (!lastAssistantMessage) return "";
    return getMessageText(lastAssistantMessage);
  }, [lastAssistantMessage]);

  const handleSubmit = (content: string) => {
    clearError();
    sendMessage({ text: content });
  };

  const handleCancel = () => {
    stop();
  };

  return {
    chatState,
    resultText,
    error: error ?? null,
    handleSubmit,
    handleCancel,
  };
}

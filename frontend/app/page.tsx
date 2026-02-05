"use client";

import { AnalysisResult } from "@/components/AnalysisResult";
import { ImageUpload } from "@/components/ImageUpload";
import { ShoupaiInput } from "@/components/ShoupaiInput";
import { Tab, TabList, TabPanel, Tabs } from "@/components/Tabs";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, type UIMessage } from "ai";
import { useMemo, useState } from "react";

const TAB_IMAGE = "image";
const TAB_MANUAL = "manual";

/** useChat の status を UI 用にまとめる（依存はここだけ） */
type ChatUIState = "idle" | "waiting" | "streaming";

function toChatUIState(status: string): ChatUIState {
  if (status === "submitted") return "waiting";
  if (status === "streaming") return "streaming";
  return "idle";
}

/** メッセージの parts から表示用テキストを結合する */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => isTextUIPart(p))
    .map((p) => p.text)
    .join("");
}

export default function Home() {
  const [activeTab, setActiveTab] = useState(TAB_IMAGE);

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

  return (
    <div className="min-h-screen bg-zinc-50 px-2 py-6 font-sans dark:bg-zinc-900 md:px-4 md:py-8">
      <main className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-2 md:mb-4">
          手牌分析
        </h1>

        <section>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value={TAB_IMAGE}>写真から</Tab>
              <Tab value={TAB_MANUAL}>手で入力</Tab>
            </TabList>
            <TabPanel value={TAB_IMAGE}>
              <ImageUpload onSubmit={handleSubmit} disabled={chatState !== "idle"} />
            </TabPanel>
            <TabPanel value={TAB_MANUAL}>
              <ShoupaiInput onSubmit={handleSubmit} disabled={chatState !== "idle"} />
            </TabPanel>
          </Tabs>
        </section>

        {chatState === "waiting" && (
          <section className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              分析中...
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              キャンセル
            </button>
          </section>
        )}

        {error && (
          <section
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
            role="alert"
          >
            <p className="font-medium">エラー</p>
            <p className="mt-1">{error.message}</p>
          </section>
        )}

        {(resultText || chatState === "streaming") && (
          <AnalysisResult
            content={resultText}
            isStreaming={chatState === "streaming"}
            title="分析結果"
          />
        )}
      </main>
    </div>
  );
}

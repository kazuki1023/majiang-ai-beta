"use client";

import { AnalysisResult } from "@/components/AnalysisResult";
import { ImageUpload } from "@/components/ImageUpload";
import { ShoupaiInput } from "@/components/ShoupaiInput";
import { Tab, TabList, TabPanel, Tabs } from "@/components/Tabs";
import { streamMajiangAnalysis } from "@/lib/mastra-client";
import { useEffect, useRef, useState } from "react";

const TAB_IMAGE = "image";
const TAB_MANUAL = "manual";

/** 1回で届いたテキストを少しずつ表示する刻み幅 */
const STREAM_CHUNK_SIZE = 24;
/** 刻み間隔（ms） */
const STREAM_CHUNK_MS = 28;

export default function Home() {
  const [activeTab, setActiveTab] = useState(TAB_IMAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  /** 受信した全文（表示は resultText がこれに追いつくまで徐々に） */
  const pendingTextRef = useRef("");
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setResultText((prev) => {
        const target = pendingTextRef.current;
        if (prev.length >= target.length) return prev;
        const nextLen = Math.min(prev.length + STREAM_CHUNK_SIZE, target.length);
        return target.slice(0, nextLen);
      });
    }, STREAM_CHUNK_MS);
    streamIntervalRef.current = id;
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    };
  }, []);

  const handleSubmit = async (content: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResultText("");
    pendingTextRef.current = "";

    try {
      await streamMajiangAnalysis(
        [{ role: "user", content }],
        {
          signal: controller.signal,
          onTextDelta: (delta) => {
            pendingTextRef.current += delta;
          },
        }
      );
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          const final = pendingTextRef.current + "\n\n[キャンセルされました]";
          pendingTextRef.current = final;
          setResultText(final);
        } else {
          setError(err.message);
        }
      } else {
        setError(String(err));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="min-h-screen bg-zinc-50 px-2 py-6 font-sans dark:bg-zinc-900 md:px-4 md:py-8">
      <main className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
          手牌分析
        </h1>

        <section>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value={TAB_IMAGE}>写真から</Tab>
              <Tab value={TAB_MANUAL}>手で入力</Tab>
            </TabList>
            <TabPanel value={TAB_IMAGE}>
              <ImageUpload onSubmit={handleSubmit} disabled={isLoading} />
            </TabPanel>
            <TabPanel value={TAB_MANUAL}>
              <ShoupaiInput onSubmit={handleSubmit} disabled={isLoading} />
            </TabPanel>
          </Tabs>
        </section>

        {isLoading && (
          <section className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              表示中...
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
            <p className="mt-1">{error}</p>
          </section>
        )}

        {resultText && (
          <AnalysisResult
            content={resultText}
            isStreaming={isLoading}
            title="分析結果"
          />
        )}
      </main>
    </div>
  );
}

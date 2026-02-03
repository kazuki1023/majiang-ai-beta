"use client";

import { ShoupaiInput } from "@/components/ShoupaiInput";
import { streamMajiangAnalysis } from "@/lib/mastra-client";
import { useRef, useState } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSubmit = async (content: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResultText("");

    try {
      await streamMajiangAnalysis(
        [{ role: "user", content }],
        {
          signal: controller.signal,
          onTextDelta: (delta) => {
            setResultText((prev) => prev + delta);
          },
        }
      );
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setResultText((prev) => prev + "\n\n[キャンセルされました]");
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
          <ShoupaiInput onSubmit={handleSubmit} disabled={isLoading} />
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
          <section className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              分析結果
            </h2>
            <div
              className="whitespace-pre-wrap break-words text-sm text-zinc-800 dark:text-zinc-200"
              aria-live="polite"
            >
              {resultText}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

"use client";

import { MarkdownContent } from "@/lib/markdown-renderer";

/**
 * 分析結果（推奨打牌・理由・表など）を表示する。
 * ストリーミング時は text-delta を親で連結した文字列を渡す。
 * 本文の Markdown レンダリングは lib/markdown-renderer に委譲する。
 */
export interface AnalysisResultProps {
  /** 表示するテキスト（プレーンテキストまたは Markdown） */
  content: string;
  /** ストリーミング中か。true のときは末尾にカーソル表示などが可能 */
  isStreaming?: boolean;
  /** 見出しラベル（アクセシビリティ・見た目用） */
  title?: string;
}

export function AnalysisResult({
  content,
  isStreaming = false,
  title = "分析結果",
}: AnalysisResultProps) {
  if (!content.trim() && !isStreaming) {
    return null;
  }

  return (
    <section
      className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
      aria-live={isStreaming ? "polite" : undefined}
      aria-busy={isStreaming}
    >
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
      </h2>
      <MarkdownContent content={content} className="wrap-break-word text-sm" />
      {isStreaming && (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-zinc-500 align-middle"
          aria-hidden
        />
      )}
    </section>
  );
}

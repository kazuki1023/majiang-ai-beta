"use client";

import type { ChatUIState } from "@/types";

export interface ChatStatusBarProps {
  chatState: ChatUIState;
  onCancel: () => void;
}

export function ChatStatusBar({ chatState, onCancel }: ChatStatusBarProps) {
  if (chatState !== "waiting") return null;

  return (
    <section className="flex items-center gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        分析中...
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        キャンセル
      </button>
    </section>
  );
}

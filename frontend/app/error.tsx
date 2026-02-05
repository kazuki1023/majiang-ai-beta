"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          問題が発生しました
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {error.message || "予期しないエラーが発生しました。"}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          再試行
        </button>
      </div>
    </div>
  );
}

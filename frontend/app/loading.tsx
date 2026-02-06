/**
 * ルートのローディングUI。
 * データ取得・認証チェックなどで Segment がサスペンドしたときに表示される。
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-50 px-1 mobile:px-2 py-2 font-sans dark:bg-zinc-900 md:px-4 md:py-4">
      <main className="mx-auto max-w-2xl space-y-6">
        <div className="h-7 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex items-center justify-center py-12">
          <span
            className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400"
            aria-hidden
          />
          <span className="sr-only">読み込み中</span>
        </div>
      </main>
    </div>
  );
}

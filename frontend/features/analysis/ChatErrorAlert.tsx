/**
 * 分析エラー表示（共有コンポーネント）。
 * hooks・イベントを使わないため "use client" 不要。Client からも Server からも利用可能。
 */
export interface ChatErrorAlertProps {
  error: Error;
}

export function ChatErrorAlert({ error }: ChatErrorAlertProps) {
  return (
    <section
      className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
      role="alert"
    >
      <p className="font-medium">エラー</p>
      <p className="mt-1">{error.message}</p>
    </section>
  );
}

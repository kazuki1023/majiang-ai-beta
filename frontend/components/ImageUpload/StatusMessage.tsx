"use client";

export type UploadPhase = "uploading" | "recognizing";

const LABELS: Record<UploadPhase, string> = {
  uploading: "写真を送信中...",
  recognizing: "手牌を読み取っています...",
};

export interface StatusMessageProps {
  phase: UploadPhase;
  className?: string;
}

export function StatusMessage({ phase, className = "" }: StatusMessageProps) {
  return (
    <p
      className={`text-sm text-zinc-600 dark:text-zinc-400 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {LABELS[phase]}
    </p>
  );
}

"use client";

import { useImageRecognition } from "@/hooks/use-image-recognition";
import { ShoupaiInput } from "@/components/ShoupaiInput";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatusMessage } from "./StatusMessage";

export interface ImageUploadProps {
  /** 認識した手牌から分析を実行するときに呼ばれる（省略時は分析ボタンなし） */
  onSubmit?: (content: string) => void;
  /** 分析中は true。送信ボタンのみ無効化し、手牌の編集は許可する */
  submitDisabled?: boolean;
}

export function ImageUpload({ onSubmit, submitDisabled = false }: ImageUploadProps) {
  const {
    state,
    isBusy,
    statusPhase,
    pendingReplace,
    handleFileSelect,
    confirmReplace,
    dismissReplace,
  } = useImageRecognition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFileSelect(file ?? null);
  };

  return (
    <section className="space-y-4 rounded-lg bg-white md:p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <label className="block cursor-pointer">
        <span className="inline-block rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700">
          {state.previewUrl ? "写真を再選択" : "写真を選択"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </label>

      {state.previewUrl && (
        <div className="space-y-2">
          <div className="inline-block max-w-full overflow-hidden rounded border border-zinc-200 dark:border-zinc-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.previewUrl}
              alt="選択した画像"
              className="block max-h-48 w-auto object-contain sm:max-h-64"
            />
          </div>
          {statusPhase && (
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-400"
                aria-hidden
              />
              <StatusMessage phase={statusPhase} />
            </div>
          )}
        </div>
      )}

      {state.recognizedShoupaiString !== null && state.phase === "recognized" && (
        <div className="space-y-2 rounded p-1 md:p-2 dark:border-zinc-600 dark:bg-zinc-800/50">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            間違いがあれば牌をタップして修正し、下の「最適な打牌を分析する」を押してください。
          </p>
          <ShoupaiInput
            key={state.recognizedShoupaiString}
            initialShoupaiString={state.recognizedShoupaiString}
            onSubmit={onSubmit ?? (() => {})}
            submitDisabled={submitDisabled}
          />
        </div>
      )}

      {state.errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.errorMessage}
        </p>
      )}

      <ConfirmDialog
        open={pendingReplace.showCancelConfirm}
        title="写真を変更しますか？"
        message="別の写真を選ぶと、今の送信・読み取りはキャンセルされます。"
        confirmLabel="OK"
        cancelLabel="キャンセル"
        onConfirm={confirmReplace}
        onCancel={dismissReplace}
      />
    </section>
  );
}

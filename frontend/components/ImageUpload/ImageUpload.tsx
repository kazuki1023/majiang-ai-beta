"use client";

import { ShoupaiInput } from "@/components/ShoupaiInput";
import { generateImageRecognition } from "@/lib/mastra-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatusMessage, type UploadPhase } from "./StatusMessage";

export interface ImageUploadProps {
  /** 認識した手牌から分析を実行するときに呼ばれる（省略時は分析ボタンなし） */
  onSubmit?: (content: string) => void;
  /** 分析中は true（認識結果の ShoupaiInput を disabled にする） */
  disabled?: boolean;
}

type Phase = "idle" | "uploading" | "recognizing" | "recognized" | "error";

export function ImageUpload({ onSubmit, disabled = false }: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [gcsUri, setGcsUri] = useState<string | null>(null);
  const [recognizedShoupaiString, setRecognizedShoupaiString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 写真選び直し時: 確認ダイアログ用 */
  const [pendingNewFile, setPendingNewFile] = useState<File | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const runIdRef = useRef(0);

  const applyNewFile = useCallback((file: File) => {
    runIdRef.current += 1;
    setPreviewUrl(null);
    setGcsUri(null);
    setRecognizedShoupaiString(null);
    setError(null);
    setPendingNewFile(null);
    setShowCancelConfirm(false);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("uploading");
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /** 選択ファイルに応じて自動でアップロード → 認識まで実行（state のリセットは applyNewFile で実施） */
  useEffect(() => {
    if (!selectedFile) return;

    const runId = ++runIdRef.current;
    const formData = new FormData();
    formData.append("file", selectedFile);

    fetch("/api/upload", { method: "POST", body: formData })
      .then((res) => res.json().then((data: { gcsUri?: string; error?: string }) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (runId !== runIdRef.current) return;
        if (!ok) throw new Error(data.error ?? "アップロードに失敗しました");
        const uri = data.gcsUri;
        if (!uri) throw new Error("アップロードに失敗しました");
        setGcsUri(uri);
        setPhase("recognizing");
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
  }, [selectedFile]);

  // アップロード完了後に認識を開始するため、gcsUri の変化で認識を実行する形に変更
  useEffect(() => {
    if (!gcsUri || phase !== "recognizing") return;

    const runId = runIdRef.current;

    generateImageRecognition(gcsUri)
      .then((shoupai) => {
        if (runId !== runIdRef.current) return;
        setRecognizedShoupaiString(shoupai);
        setPhase("recognized");
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase("error");
      });
  }, [gcsUri, phase]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("画像ファイルを選択してください");
        return;
      }

      const isBusy = phase === "uploading" || phase === "recognizing";
      if (isBusy) {
        setPendingNewFile(file);
        setShowCancelConfirm(true);
        return;
      }

      applyNewFile(file);
    },
    [phase, applyNewFile]
  );



  const handleConfirmCancel = useCallback(() => {
    const file = pendingNewFile;
    if (!file) {
      setPendingNewFile(null);
      setShowCancelConfirm(false);
      return;
    }
    applyNewFile(file);
  }, [pendingNewFile, applyNewFile]);

  const handleDismissCancel = useCallback(() => {
    setPendingNewFile(null);
    setShowCancelConfirm(false);
  }, []);

  const isBusy = phase === "uploading" || phase === "recognizing";
  const statusPhase: UploadPhase | null =
    phase === "uploading" ? "uploading" : phase === "recognizing" ? "recognizing" : null;

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        画像から手牌を読み取る
      </h2>

      <label className="block cursor-pointer">
        <span className="inline-block rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700">
          写真を選択
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isBusy}
        />
      </label>

      {previewUrl && (
        <div className="space-y-2">
          <div className="inline-block max-w-full overflow-hidden rounded border border-zinc-200 dark:border-zinc-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
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

      {recognizedShoupaiString !== null && phase === "recognized" && (
        <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            認識結果（必要なら編集してから分析）
          </p>
          <ShoupaiInput
            key={recognizedShoupaiString}
            initialShoupaiString={recognizedShoupaiString}
            onSubmit={onSubmit ?? (() => {})}
            disabled={disabled}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        title="写真を変更しますか？"
        message="別の写真を選ぶと、今の送信・読み取りはキャンセルされます。"
        confirmLabel="OK"
        cancelLabel="キャンセル"
        onConfirm={handleConfirmCancel}
        onCancel={handleDismissCancel}
      />
    </section>
  );
}

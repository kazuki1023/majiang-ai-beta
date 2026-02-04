"use client";

import { ShoupaiInput } from "@/components/ShoupaiInput";
import { generateImageRecognition } from "@/lib/mastra-client";
import { useCallback, useEffect, useState } from "react";

export interface ImageUploadProps {
  /** 認識した手牌から分析を実行するときに呼ばれる（省略時は分析ボタンなし） */
  onSubmit?: (content: string) => void;
  /** 分析中は true（認識結果の ShoupaiInput を disabled にする） */
  disabled?: boolean;
}

export function ImageUpload({ onSubmit, disabled = false }: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gcsUri, setGcsUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedShoupaiString, setRecognizedShoupaiString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setGcsUri(null);
      setRecognizedShoupaiString(null);
      setError(null);
      if (file) {
        if (!file.type.startsWith("image/")) {
          setError("画像ファイルを選択してください");
          setSelectedFile(null);
          return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setSelectedFile(null);
      }
    },
    [previewUrl]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "アップロードに失敗しました");
      }
      setGcsUri(data.gcsUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile]);

  const handleRecognize = useCallback(async () => {
    if (!gcsUri) return;
    setIsRecognizing(true);
    setError(null);
    try {
      const shoupai = await generateImageRecognition(gcsUri);
      setRecognizedShoupaiString(shoupai);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRecognizing(false);
    }
  }, [gcsUri]);

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        画像アップロード
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <label className="cursor-pointer rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700">
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          ファイルを選択
        </label>
        {selectedFile && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          >
            {isUploading ? "アップロード中..." : "GCS にアップロード"}
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">プレビュー</p>
          <div className="inline-block max-w-xs overflow-hidden rounded border border-zinc-200 dark:border-zinc-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="選択した画像"
              className="block max-h-48 w-auto object-contain"
            />
          </div>
        </div>
      )}

      {gcsUri && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
          <p className="font-medium">アップロード完了</p>
          <p className="mt-1 break-all font-mono text-xs">{gcsUri}</p>
          <button
            type="button"
            onClick={handleRecognize}
            disabled={isRecognizing}
            className="mt-2 rounded border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isRecognizing ? "認識中..." : "認識"}
          </button>
        </div>
      )}

      {recognizedShoupaiString !== null && (
        <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            認識結果（編集して分析できます）
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
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

export function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gcsUri, setGcsUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
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
          <p className="mt-2 text-xs opacity-80">
            画像認識は Phase 4 で実装予定です。「認識」ボタンは準備中です。
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}

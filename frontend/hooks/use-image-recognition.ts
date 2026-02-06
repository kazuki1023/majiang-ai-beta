"use client";

import { generateImageRecognition } from "@/lib/mastra-client";
import type { ImageRecognitionState } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

const initialState: ImageRecognitionState = {
  phase: "idle",
  previewUrl: null,
  gcsUri: null,
  recognizedShoupaiString: null,
  errorMessage: null,
};

function transitionToUploading(
  file: File,
  previewUrl: string
): ImageRecognitionState {
  return {
    ...initialState,
    phase: "uploading",
    previewUrl,
    gcsUri: null,
    recognizedShoupaiString: null,
    errorMessage: null,
  };
}

function transitionToRecognizing(
  prev: ImageRecognitionState,
  gcsUri: string
): ImageRecognitionState {
  return {
    ...prev,
    phase: "recognizing",
    gcsUri,
  };
}

function transitionToRecognized(
  prev: ImageRecognitionState,
  recognizedShoupaiString: string
): ImageRecognitionState {
  return {
    ...prev,
    phase: "recognized",
    recognizedShoupaiString,
  };
}

function transitionToError(
  prev: ImageRecognitionState,
  errorMessage: string
): ImageRecognitionState {
  return {
    ...prev,
    phase: "error",
    errorMessage,
  };
}

/** 写真選び直しの保留用（UI 用） */
export interface PendingReplace {
  pendingNewFile: File | null;
  showCancelConfirm: boolean;
}

export interface UseImageRecognitionReturn {
  state: ImageRecognitionState;
  isBusy: boolean;
  statusPhase: "uploading" | "recognizing" | null;
  pendingReplace: PendingReplace;
  startWithFile: (file: File) => void;
  confirmReplace: () => void;
  dismissReplace: () => void;
  handleFileSelect: (file: File | null) => void;
}

export function useImageRecognition(): UseImageRecognitionReturn {
  const [state, setState] = useState<ImageRecognitionState>(initialState);
  const [pendingNewFile, setPendingNewFile] = useState<File | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const runIdRef = useRef(0);
  /** アップロード API に渡す File（uploading 開始時にセット） */
  const uploadingFileRef = useRef<File | null>(null);

  const startWithFile = useCallback((file: File) => {
    uploadingFileRef.current = file;
    const previewUrl = URL.createObjectURL(file);
    setState((prev) => transitionToUploading(file, previewUrl));
  }, []);

  const confirmReplace = useCallback(() => {
    const file = pendingNewFile;
    setPendingNewFile(null);
    setShowCancelConfirm(false);
    if (file) startWithFile(file);
  }, [pendingNewFile, startWithFile]);

  const dismissReplace = useCallback(() => {
    setPendingNewFile(null);
    setShowCancelConfirm(false);
  }, []);

  const handleFileSelect = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setState((prev) =>
          transitionToError(prev, "画像ファイルを選択してください")
        );
        return;
      }
      const isBusy =
        state.phase === "uploading" || state.phase === "recognizing";
      if (isBusy) {
        setPendingNewFile(file);
        setShowCancelConfirm(true);
        return;
      }
      startWithFile(file);
    },
    [state.phase, startWithFile]
  );

  useEffect(() => {
    return () => {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    };
  }, [state.previewUrl]);

  useEffect(() => {
    if (state.phase !== "uploading") return;
    const file = uploadingFileRef.current;
    // 防御的チェック＋型絞り込み。phase が "uploading" になるのは startWithFile 経由のみで、
    // そのとき必ず uploadingFileRef をセットしているため、通常は null にならない。
    if (!file) return;

    // fetch を開始する場合のみ runId を進め、完了時の runId チェックで古いレスポンスを無視する。
    const runId = ++runIdRef.current;
    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/upload", { method: "POST", body: formData })
      .then((res) =>
        res.json().then((data: { gcsUri?: string; error?: string }) => ({
          ok: res.ok,
          data,
        }))
      )
      .then(({ ok, data }) => {
        if (runId !== runIdRef.current) return;
        if (!ok) throw new Error(data.error ?? "アップロードに失敗しました");
        const uri = data.gcsUri;
        if (!uri) throw new Error("アップロードに失敗しました");
        setState((prev) => transitionToRecognizing(prev, uri));
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setState((prev) =>
          transitionToError(
            prev,
            err instanceof Error ? err.message : String(err)
          )
        );
      });
  }, [state.phase]);

  useEffect(() => {
    if (state.phase !== "recognizing" || !state.gcsUri) return;
    const runId = runIdRef.current;

    generateImageRecognition(state.gcsUri)
      .then((shoupai) => {
        if (runId !== runIdRef.current) return;
        setState((prev) => transitionToRecognized(prev, shoupai));
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setState((prev) =>
          transitionToError(
            prev,
            err instanceof Error ? err.message : String(err)
          )
        );
      });
  }, [state.phase, state.gcsUri]);

  const isBusy =
    state.phase === "uploading" || state.phase === "recognizing";
  const statusPhase: "uploading" | "recognizing" | null =
    state.phase === "uploading"
      ? "uploading"
      : state.phase === "recognizing"
        ? "recognizing"
        : null;

  return {
    state,
    isBusy,
    statusPhase,
    pendingReplace: {
      pendingNewFile,
      showCancelConfirm,
    },
    startWithFile,
    confirmReplace,
    dismissReplace,
    handleFileSelect,
  };
}

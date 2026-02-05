import type { ApiError, RecognizeShoupaiOutput } from "@/types";
import { getBaseUrl } from "./url";

/**
 * Mastra API クライアント（generate 用）
 * - 手牌分析: generateMajiangAnalysis（一括取得）
 * - 画像認識: generateImageRecognition（GCS URI → 手牌文字列）
 * チャット・ストリーミングは useChat + /api/chat を利用する。
 */

const AGENT_NAME = "majiangAnalysisAgent";

// --- generate の型（Mastra 公式 Returns に準拠）---
export interface GenerateResponse {
  text?: string;
  error?: { message?: string; name?: string };
  finishReason?: string;
  usage?: { promptTokens?: number; completionTokens?: number };
  toolCalls?: unknown[];
  toolResults?: unknown[];
  steps?: unknown[];
  response?: { messages?: unknown[] };
  [key: string]: unknown;
}

export interface GenerateMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * 手牌分析（一括取得）
 * POST /api/generate/majiangAnalysisAgent/generate
 */
export async function generateMajiangAnalysis(
  messages: GenerateMessage[],
  options?: { signal?: AbortSignal }
): Promise<GenerateResponse> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/generate/${AGENT_NAME}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal: options?.signal,
  });

  const data = (await res.json()) as GenerateResponse;

  if (!res.ok) {
    const err = data?.error ?? { message: res.statusText };
    throw new Error(
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: string }).message)
        : String(err)
    );
  }

  return data;
}

const IMAGE_RECOGNITION_AGENT = "imageRecognitionAgent";

/**
 * 画像認識（GCS URI から手牌文字列を取得）
 * POST /api/generate/imageRecognitionAgent/generate
 * @returns 認識した手牌文字列（共通型 ShoupaiString）。API が RecognizeShoupaiOutput を返す場合は error を throw する
 */
export async function generateImageRecognition(
  gcsUri: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/generate/${IMAGE_RECOGNITION_AGENT}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user" as const, content: gcsUri }],
    }),
    signal: options?.signal,
  });

  const data = (await res.json()) as GenerateResponse | RecognizeShoupaiOutput;

  if (!res.ok) {
    const err = (data as GenerateResponse)?.error ?? { message: res.statusText };
    throw new Error(
      typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: string }).message)
        : String(err)
    );
  }

  // 構造化レスポンス（RecognizeShoupaiOutput）の場合は error をチェック
  const structured = data as RecognizeShoupaiOutput;
  if ("error" in structured && structured.error) {
    const apiErr = structured.error as ApiError;
    throw new Error(apiErr.message ?? "画像認識に失敗しました");
  }
  if ("shoupaiString" in structured && typeof structured.shoupaiString === "string") {
    return structured.shoupaiString;
  }

  const text = (data as GenerateResponse)?.text ?? "";
  return extractShoupaiFromAgentText(text);
}

/** AI の応答テキストから手牌文字列（m...p...s...z...）を抽出 */
function extractShoupaiFromAgentText(text: string): string {
  const trimmed = text.trim();
  const oneLine = trimmed.split(/\s/)[0] ?? "";
  if (/^[mpsz]\d+([mpsz]\d+)*$/i.test(oneLine)) return oneLine;
  const match = trimmed.match(/[mpsz]\d+([mpsz]\d+)*/gi);
  if (match?.[0]) return match[0];
  return trimmed || text;
}

import type {
  AnalysisStreamEvent,
  ApiError,
  RecognizeShoupaiOutput,
} from "@/types";
import { getBaseUrl } from "./url";

/**
 * Mastra API クライアント（majiangAnalysisAgent 用）
 * - generate: 一括取得
 * - stream: ストリーミング（text-delta を逐次返す）
 * ストリーミングで受け取るイベントは共通型 AnalysisStreamEvent に準拠する想定。
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

/** ストリームで受信する生のイベント（Mastra の type + payload / agent-execution-event-text-delta のネスト対応）。共通型 AnalysisStreamEvent と併用。 */
export interface StreamEvent {
  type: string;
  payload?: {
    textDelta?: string;
    delta?: string;
    type?: string;
    payload?: { textDelta?: string; delta?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  from?: string;
  [key: string]: unknown;
}

export interface StreamOptions {
  signal?: AbortSignal;
  onTextDelta?: (delta: string) => void;
}

/** Mastra の text-delta / agent-execution-event-text-delta から表示用テキストを1つ取り出す */
function getTextDeltaFromEvent(json: StreamEvent | null): string {
  if (!json?.payload) return "";
  if (json.type === "text-delta") {
    const p = json.payload as { textDelta?: string; delta?: string };
    return (p.textDelta ?? p.delta ?? "") as string;
  }
  if (json.type === "agent-execution-event-text-delta" && json.payload?.type === "text-delta") {
    const inner = json.payload.payload as { textDelta?: string; delta?: string } | undefined;
    return (inner?.textDelta ?? inner?.delta ?? "") as string;
  }
  return "";
}

/**
 * 手牌分析（一括取得）
 * POST /api/agents/majiangAnalysisAgent/generate
 */
export async function generateMajiangAnalysis(
  messages: GenerateMessage[],
  options?: { signal?: AbortSignal }
): Promise<GenerateResponse> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/agents/${AGENT_NAME}/generate`, {
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
 * POST /api/agents/imageRecognitionAgent/generate
 * @returns 認識した手牌文字列（共通型 ShoupaiString）。API が RecognizeShoupaiOutput を返す場合は error を throw する
 */
export async function generateImageRecognition(
  gcsUri: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/agents/${IMAGE_RECOGNITION_AGENT}/generate`, {
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

/**
 * 手牌分析（ストリーミング）
 * POST /api/agents/majiangAnalysisAgent/stream
 * - ReadableStream を読み、SSE または NDJSON をパースして text-delta をコールバックで返す
 * Memo: AI/SDKを使えばもっと簡単にかけると思うので、必要なら変更する
 */
export async function streamMajiangAnalysis(
  messages: GenerateMessage[],
  options?: StreamOptions
): Promise<void> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/agents/${AGENT_NAME}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let errMessage = res.statusText;
    try {
      const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
      errMessage = json?.error?.message ?? json?.message ?? errMessage;
    } catch {
      if (text) errMessage = text.slice(0, 200);
    }
    throw new Error(errMessage);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let json: StreamEvent | AnalysisStreamEvent | null = null;
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]" || data === "") continue;
          try {
            json = JSON.parse(data) as StreamEvent | AnalysisStreamEvent;
          } catch {
            continue;
          }
        } else {
          try {
            json = JSON.parse(trimmed) as StreamEvent | AnalysisStreamEvent;
          } catch {
            continue;
          }
        }

        const delta = getTextDeltaFromEvent(json as StreamEvent);
        if (delta && options?.onTextDelta) options.onTextDelta(delta);
      }
    }

    if (buffer.trim()) {
      let json: StreamEvent | AnalysisStreamEvent | null = null;
      if (buffer.startsWith("data:")) {
        const data = buffer.slice(5).trim();
        if (data && data !== "[DONE]") {
          try {
            json = JSON.parse(data) as StreamEvent | AnalysisStreamEvent;
          } catch {
            // ignore
          }
        }
      } else {
        try {
          json = JSON.parse(buffer.trim()) as StreamEvent | AnalysisStreamEvent;
        } catch {
          // ignore
        }
      }
      const delta = getTextDeltaFromEvent(json as StreamEvent);
      if (delta && options?.onTextDelta) options.onTextDelta(delta);
    }
  } finally {
    reader.releaseLock();
  }
}

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

/** ストリームAPIの調査用ログ。デバッグ時のみ true にすること */
const STREAM_DEBUG = false;
const LOG_PREFIX = "[stream]";

/** イベントの形だけを短く要約（content は長さのみ）。STREAM_DEBUG 時のみ使用 */
function summarizeEvent(json: unknown): string {
  if (json === null || typeof json !== "object") return String(json);
  const o = json as Record<string, unknown>;
  const keys = Object.keys(o).sort().join(",");
  const type = "type" in o ? String(o.type) : "-";
  const role = "role" in o ? String(o.role) : "-";
  let contentInfo = "-";
  if ("content" in o && typeof o.content === "string") contentInfo = `string(${o.content.length})`;
  else if (o.payload && typeof o.payload === "object" && "textDelta" in o.payload) contentInfo = `payload.textDelta(${(o.payload as { textDelta?: string }).textDelta?.length ?? 0})`;
  else if (o.payload && typeof o.payload === "object" && "delta" in o.payload) contentInfo = `payload.delta(${(o.payload as { delta?: string }).delta?.length ?? 0})`;
  return `keys=[${keys}] type=${type} role=${role} content=${contentInfo}`;
}

/** オブジェクトの構造を再帰的に要約（文字列は長さのみ、深さ制限付き）。調査用 */
function structureOf(obj: unknown, depth = 0, maxDepth = 3): string {
  if (depth > maxDepth) return "...";
  if (obj === null) return "null";
  if (typeof obj !== "object") return typeof obj === "string" ? `string(${obj.length})` : String(obj);
  const o = obj as Record<string, unknown>;
  const entries = Object.keys(o)
    .sort()
    .map((k) => {
      const v = o[k];
      if (depth + 1 > maxDepth) return `${k}:?`;
      if (typeof v === "string") return `${k}:string(${v.length})`;
      if (v && typeof v === "object" && !Array.isArray(v)) return `${k}:{${structureOf(v, depth + 1, maxDepth)}}`;
      if (Array.isArray(v)) return `${k}:[${v.length}]`;
      return `${k}:${String(v)}`;
    });
  return entries.join(" ");
}

/** Mastra のイベントから表示用テキストを1つ取り出す（複数形式に対応） */
function getTextDeltaFromEvent(json: StreamEvent | null): string {
  if (!json) return "";
  // 形式: { "role": "assistant", "content": "..." }
  const withContent = json as unknown as { role?: string; content?: string };
  if (withContent.role === "assistant" && typeof withContent.content === "string") {
    return withContent.content;
  }
  if (!json.payload) return "";
  const payload = json.payload as Record<string, unknown>;
  // 形式: payload.output.text（Mastra の run 完了イベントで本文が入る）
  if (payload?.output && typeof payload.output === "object" && payload.output !== null && "text" in payload.output && typeof (payload.output as { text: unknown }).text === "string") {
    return (payload.output as { text: string }).text;
  }
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

  if (STREAM_DEBUG) {
    console.log(`${LOG_PREFIX} Content-Type: ${res.headers.get("content-type") ?? "(none)"}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let chunkIndex = 0;
  let lineIndex = 0;
  let totalWithDelta = 0;
  const lastEvents: unknown[] = [];
  const LAST_N = 3;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (STREAM_DEBUG) {
          console.log(`${LOG_PREFIX} stream done chunks=${chunkIndex} lines=${lineIndex} withText=${totalWithDelta}`);
          for (let i = 0; i < lastEvents.length; i++) {
            console.log(`${LOG_PREFIX} last#${lastEvents.length - i} structure: ${structureOf(lastEvents[i])}`);
          }
        }
        break;
      }

      const decoded = decoder.decode(value, { stream: true });
      buffer += decoded;
      chunkIndex += 1;
      let chunkWithDelta = 0;

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
            if (STREAM_DEBUG) console.log(`${LOG_PREFIX} parse error (data:) len=${data.length} head=${data.slice(0, 60)}`);
            continue;
          }
        } else {
          try {
            json = JSON.parse(trimmed) as StreamEvent | AnalysisStreamEvent;
          } catch {
            if (STREAM_DEBUG) console.log(`${LOG_PREFIX} parse error (raw) len=${trimmed.length} head=${trimmed.slice(0, 60)}`);
            continue;
          }
        }

        lineIndex += 1;
        if (STREAM_DEBUG && lineIndex <= 3) {
          console.log(`${LOG_PREFIX} line#${lineIndex} structure: ${structureOf(json)}`);
        }
        lastEvents.push(json);
        if (lastEvents.length > LAST_N) lastEvents.shift();
        const delta = getTextDeltaFromEvent(json as StreamEvent);
        if (delta) {
          totalWithDelta += 1;
          chunkWithDelta += 1;
          if (STREAM_DEBUG) console.log(`${LOG_PREFIX} line#${lineIndex} TEXT ${summarizeEvent(json)} → delta.length=${delta.length}`);
        }
        if (delta && options?.onTextDelta) options.onTextDelta(delta);
      }

      if (STREAM_DEBUG && chunkWithDelta > 0) {
        console.log(`${LOG_PREFIX} chunk#${chunkIndex} decoded=${decoded.length} linesWithText=${chunkWithDelta}`);
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
            if (STREAM_DEBUG) console.log(`${LOG_PREFIX} tail parse error (data:) len=${data.length}`);
          }
        }
      } else {
        try {
          json = JSON.parse(buffer.trim()) as StreamEvent | AnalysisStreamEvent;
        } catch {
          if (STREAM_DEBUG) console.log(`${LOG_PREFIX} tail parse error (raw) len=${buffer.length}`);
        }
      }
      if (STREAM_DEBUG && json) console.log(`${LOG_PREFIX} tail structure: ${structureOf(json)}`);
      const delta = getTextDeltaFromEvent(json as StreamEvent);
      if (STREAM_DEBUG && json) console.log(`${LOG_PREFIX} tail ${delta.length > 0 ? "TEXT " : ""}→ delta.length=${delta.length}`);
      if (delta && options?.onTextDelta) options.onTextDelta(delta);
    }
  } finally {
    reader.releaseLock();
  }
}

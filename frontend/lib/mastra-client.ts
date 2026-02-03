import { getBaseUrl } from "./url";
/**
 * Mastra API クライアント（majiangAnalysisAgent 用）
 * - generate: 一括取得
 * - stream: ストリーミング（text-delta を逐次返す）
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

// --- stream イベントの型（Mastra の type + payload / agent-execution-event-text-delta のネスト対応）---
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

/** payload からテキストらしい文字列を1つ取り出す（複数キー・形式に対応） */
function getTextFromPayload(
  payload: Record<string, unknown> | string | undefined
): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return "";
  const p = payload as Record<string, unknown>;
  const candidate =
    (p.textDelta as string) ??
    (p.delta as string) ??
    (p.content as string) ??
    (p.text as string);
  return typeof candidate === "string" ? candidate : "";
}

/** Mastra の text-delta / agent-execution-event-text-delta から表示用テキストを1つ取り出す */
function getTextDeltaFromEvent(json: StreamEvent | null): string {
  if (!json) return "";
  const asRecord = json as Record<string, unknown>;
  if (json.type === "text-delta") {
    const fromPayload = getTextFromPayload(json.payload as Record<string, unknown> | undefined);
    if (fromPayload) return fromPayload;
    // payload がなくトップレベルに textDelta 等がある形式
    return getTextFromPayload(asRecord);
  }
  if (json.type === "agent-execution-event-text-delta") {
    const innerPayload =
      json.payload?.type === "text-delta"
        ? (json.payload.payload as Record<string, unknown> | undefined)
        : (json.payload as Record<string, unknown> | undefined);
    return getTextFromPayload(innerPayload);
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

        let json: StreamEvent | null = null;
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]" || data === "") continue;
          try {
            json = JSON.parse(data) as StreamEvent;
          } catch {
            continue;
          }
        } else {
          try {
            json = JSON.parse(trimmed) as StreamEvent;
          } catch {
            continue;
          }
        }

        const delta = getTextDeltaFromEvent(json);
        if (delta && options?.onTextDelta) options.onTextDelta(delta);
      }
    }

    if (buffer.trim()) {
      let json: StreamEvent | null = null;
      if (buffer.startsWith("data:")) {
        const data = buffer.slice(5).trim();
        if (data && data !== "[DONE]") {
          try {
            json = JSON.parse(data) as StreamEvent;
          } catch {
            // ignore
          }
        }
      } else {
        try {
          json = JSON.parse(buffer.trim()) as StreamEvent;
        } catch {
          // ignore
        }
      }
      const delta = getTextDeltaFromEvent(json);
      if (delta && options?.onTextDelta) options.onTextDelta(delta);
    }
  } finally {
    reader.releaseLock();
  }
}

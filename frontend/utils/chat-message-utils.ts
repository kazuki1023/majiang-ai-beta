import { isTextUIPart, type UIMessage } from "ai";
import type { ChatUIState } from "@/types";

/** useChat の status を UI 用の ChatUIState に変換する */
export function toChatUIState(status: string): ChatUIState {
  if (status === "submitted") return "waiting";
  if (status === "streaming") return "streaming";
  return "idle";
}

/** メッセージの parts から表示用テキストを結合する（AI-SDK の UIMessage 型に依存） */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => isTextUIPart(p))
    .map((p) => p.text)
    .join("");
}

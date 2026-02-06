/** useChat の status を UI 用にまとめた状態（AI-SDK 依存は utils/chat-message-utils に閉じる） */
export type ChatUIState = "idle" | "waiting" | "streaming";

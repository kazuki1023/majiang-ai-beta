/**
 * Mastra API のベース URL（クライアント用）
 * プロキシ採用のため同一オリジンの /api/agents/... を呼ぶ。空文字で相対パスになる。
 * サーバー側のプロキシは MASTRA_API_URL で Mastra に中継する。
 */
export function getBaseUrl(): string {
  return "";
}

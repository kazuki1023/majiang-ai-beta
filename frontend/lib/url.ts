/**
 * Mastra API のベース URL（クライアント用）
 * プロキシ採用のため同一オリジンの /api/chat および /api/generate/... を呼ぶ。空文字で相対パスになる。
 * サーバー側のプロキシは MASTRA_URL / MASTRA_API_URL で Mastra に中継する。
 */
export function getBaseUrl(): string {
  return "";
}

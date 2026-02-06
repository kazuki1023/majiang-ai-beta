/**
 * 日付パーティション用の YYYY/MM/DD を返す（UTC）。
 * @param date 対象日時。省略時は現在時刻（単体テストでは固定値を渡せる）
 */
export function getDatePrefix(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

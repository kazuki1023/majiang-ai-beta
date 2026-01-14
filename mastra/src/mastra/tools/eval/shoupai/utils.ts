/**
 * 共通ユーティリティ関数
 */

/**
 * 待ち牌に赤牌を追加する
 * @param tingpai 待ち牌の配列
 * @returns 赤牌を含む待ち牌の配列
 */
/**
 * 牌の形式を正規化する（'3s' -> 's3'）
 * majiang-coreは種類+数字の形式（'s3'）を期待するが、
 * 入力が数字+種類（'3s'）の形式で来る場合があるため変換する
 */
export function normalizePai(pai: string): string {
  // 既に正しい形式（種類+数字）の場合はそのまま返す
  if (pai.match(/^[mpsz]\d/)) {
    return pai;
  }
  // 数字+種類の形式（'3s'）を種類+数字（'s3'）に変換
  const match = pai.match(/^(\d+)([mpsz])$/);
  if (match) {
    return match[2] + match[1];
  }
  // 変換できない場合はそのまま返す
  return pai;
}

export function addHongpai(tingpai: string[]): string[] {
  const pai: string[] = [];
  for (const p of tingpai) {
    if (p[0] !== 'z' && p[1] === '5') {
      pai.push(p.replace(/5/, '0'));
    }
    pai.push(p);
  }
  return pai;
}

/**
 * 牌の文字列をフォーマット（末尾の_を除去）
 * @param tile 牌の文字列
 * @returns フォーマットされた牌の文字列
 */
export function formatTile(tile: string): string {
  return tile.substring(0, 2);
}

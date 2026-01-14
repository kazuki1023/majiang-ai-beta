/**
 * 共通ユーティリティ関数
 */

/**
 * 待ち牌に赤牌を追加する
 * @param tingpai 待ち牌の配列
 * @returns 赤牌を含む待ち牌の配列
 */
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

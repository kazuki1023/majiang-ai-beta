/**
 * 手牌の牌セットと文字列変換
 * - 牌ID: m1〜m9（萬子）, p1〜p9（筒子）, s1〜s9（索子）, z1〜z7（字牌: 東南西北白發中）
 */

export const MANZU_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;
export const PINZU_LABELS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"] as const;
export const SOZU_LABELS = ["１", "２", "３", "４", "５", "６", "７", "８", "９"] as const;
export const JIPAI_LABELS = ["東", "南", "西", "北", "白", "發", "中"] as const;

export interface TileDef {
  id: string;
  label: string;
  suit: "m" | "p" | "s" | "z";
  num: number;
}

const MANZU: TileDef[] = MANZU_LABELS.map((label, i) => ({
  id: `m${i + 1}`,
  label: `${label}萬`,
  suit: "m",
  num: i + 1,
}));
const PINZU: TileDef[] = PINZU_LABELS.map((label, i) => ({
  id: `p${i + 1}`,
  label: `${label}筒`,
  suit: "p",
  num: i + 1,
}));
const SOZU: TileDef[] = SOZU_LABELS.map((label, i) => ({
  id: `s${i + 1}`,
  label: `${label}索`,
  suit: "s",
  num: i + 1,
}));
const JIPAI: TileDef[] = JIPAI_LABELS.map((label, i) => ({
  id: `z${i + 1}`,
  label,
  suit: "z",
  num: i + 1,
}));

/** 全34種の牌（萬子・筒子・索子・字牌） */
export const TILE_SET: TileDef[] = [...MANZU, ...PINZU, ...SOZU, ...JIPAI];

const TILE_MAP = new Map(TILE_SET.map((t) => [t.id, t]));

/** 牌IDから表示ラベルを取得 */
export function getTileLabel(tileId: string): string {
  return TILE_MAP.get(tileId)?.label ?? tileId;
}

/**
 * 選択した牌の配列を手牌文字列（m123p456...）に変換する
 */
export function selectedTilesToShoupaiString(tileIds: string[]): string {
  const bySuit: Record<string, number[]> = { m: [], p: [], s: [], z: [] };
  for (const id of tileIds) {
    const t = TILE_MAP.get(id);
    if (t) bySuit[t.suit].push(t.num);
  }
  let out = "";
  for (const suit of ["m", "p", "s", "z"] as const) {
    const nums = bySuit[suit].sort((a, b) => a - b);
    if (nums.length) out += suit + nums.join("");
  }
  return out;
}

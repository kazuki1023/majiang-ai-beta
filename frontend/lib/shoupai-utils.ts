/**
 * 手牌の牌セットと文字列変換
 *
 * 牌ID（majiang-core / majiang-ai と同一）:
 * - 萬子: m1〜m9, 赤五萬: m0
 * - 筒子: p1〜p9, 赤五筒: p0
 * - 索子: s1〜s9, 赤五索: s0
 * - 字牌: z1〜z7（東南西北白發中）。字牌に赤はなし。
 *
 * 画像ファイル名: 牌IDをそのまま使う（例: m1.gif, m0.gif, p5.gif, z1.gif）。
 * civillink の赤牌はダウンロード後に m0.gif, p0.gif, s0.gif として保存する。
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

/** 萬子 m1〜m4, 赤五萬 m0, 萬子 m5〜m9（表示順） */
const MANZU: TileDef[] = [
  ...MANZU_LABELS.slice(0, 4).map((label, i) => ({
    id: `m${i + 1}`,
    label: `${label}萬`,
    suit: "m" as const,
    num: i + 1,
  })),
  { id: "m0", label: "五萬", suit: "m", num: 0 },
  ...MANZU_LABELS.slice(4, 9).map((label, i) => ({
    id: `m${i + 5}`,
    label: `${label}萬`,
    suit: "m" as const,
    num: i + 5,
  })),
];

/** 筒子 p1〜p4, 赤五筒 p0, 筒子 p5〜p9 */
const PINZU: TileDef[] = [
  ...PINZU_LABELS.slice(0, 4).map((label, i) => ({
    id: `p${i + 1}`,
    label: `${label}筒`,
    suit: "p" as const,
    num: i + 1,
  })),
  { id: "p0", label: "⑤筒", suit: "p", num: 0 },
  ...PINZU_LABELS.slice(4, 9).map((label, i) => ({
    id: `p${i + 5}`,
    label: `${label}筒`,
    suit: "p" as const,
    num: i + 5,
  })),
];

/** 索子 s1〜s4, 赤五索 s0, 索子 s5〜s9 */
const SOZU: TileDef[] = [
  ...SOZU_LABELS.slice(0, 4).map((label, i) => ({
    id: `s${i + 1}`,
    label: `${label}索`,
    suit: "s" as const,
    num: i + 1,
  })),
  { id: "s0", label: "５索", suit: "s", num: 0 },
  ...SOZU_LABELS.slice(4, 9).map((label, i) => ({
    id: `s${i + 5}`,
    label: `${label}索`,
    suit: "s" as const,
    num: i + 5,
  })),
];

const JIPAI: TileDef[] = JIPAI_LABELS.map((label, i) => ({
  id: `z${i + 1}`,
  label,
  suit: "z" as const,
  num: i + 1,
}));

/** 全37種（34種＋赤牌 m0/p0/s0）。画像名は id のまま（例: m0.gif） */
export const TILE_SET: TileDef[] = [...MANZU, ...PINZU, ...SOZU, ...JIPAI];

/** suit ごとの牌セット（萬子・筒子・索子・字牌の順で列表示用） */
export const TILE_SET_BY_SUIT: { suitLabel: string; tiles: TileDef[] }[] = [
  { suitLabel: "萬子", tiles: MANZU },
  { suitLabel: "筒子", tiles: PINZU },
  { suitLabel: "索子", tiles: SOZU },
  { suitLabel: "字牌", tiles: JIPAI },
];

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

/**
 * 手牌文字列（m123p456...、0は赤牌 m0/p0/s0）を牌IDの配列に変換する。
 *
 * ロジック:
 * 1. 正規表現 ([mpsz])(\d+) で「種類 + 数字列」を順にマッチ
 * 2. 数字は1桁ずつ展開: m105 → m1, m0, m5。字牌 z は 0 および 8,9 を無視
 * 3. 返す配列は「表示順」でソート: 数牌は 1,2,3,4, 赤(0), 5,6,7,8,9 の順（赤は4と6の間）
 */
const SUIT_ORDER = { m: 0, p: 1, s: 2, z: 3 } as const;

/** 牌IDの表示順ソート用。数牌の赤(0)は 4 と 5 の間なので 4.5 とする */
function tileDisplayOrder(id: string): number {
  const suit = id[0] as keyof typeof SUIT_ORDER;
  const num = Number(id.slice(1));
  if ((suit === "m" || suit === "p" || suit === "s") && num === 0) return 4.5;
  return num;
}

/** 牌ID配列を表示順（萬→筒→索→字、数牌は 1..4,赤,5..9）にソートする。削除時の index と state の一致に使う */
export function sortTileIdsByDisplayOrder(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const suitA = SUIT_ORDER[a[0] as keyof typeof SUIT_ORDER] ?? 4;
    const suitB = SUIT_ORDER[b[0] as keyof typeof SUIT_ORDER] ?? 4;
    if (suitA !== suitB) return suitA - suitB;
    return tileDisplayOrder(a) - tileDisplayOrder(b);
  });
}

export function shoupaiStringToTileIds(paistr: string): string[] {
  const ids: string[] = [];
  const regex = /([mpsz])(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(paistr)) !== null) {
    const suit = m[1] as "m" | "p" | "s" | "z";
    const digits = m[2];
    for (const d of digits) {
      if (suit === "z" && (d === "0" || Number(d) > 7)) continue;
      ids.push(suit + d);
    }
  }
  return sortTileIdsByDisplayOrder(ids);
}

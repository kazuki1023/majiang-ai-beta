/**
 * ドメインの基本型（共通型）
 * 設計: docs/shared-types-design.md §4.1, §4.2
 */

/** 牌1枚のID（majiang-core / majiang-ai と同一。m0=赤五萬, p1〜p9, s1〜s9, z1〜z7） */
export type TileId = string;

/** 手牌文字列（例: "m123p456s789z12"）。副露ありなら "m123p456s789,m2p2p2" 等 */
export type ShoupaiString = string;

/** 場風・自風は 0=東, 1=南, 2=西, 3=北（数値のみ） */
export type Feng = 0 | 1 | 2 | 3;

/** 場風・自風の表示ラベル（Feng の index に対応） */
export const ZHUANGFENG_LABELS = ["東", "南", "西", "北"] as const;
export const MENFENG_LABELS = ["東", "南", "西", "北"] as const;

/** 手牌の最大枚数 */
export const MAX_HAND = 14;
/** 同種牌の最大枚数（通常ルール） */
export const TILES_PER_TYPE = 4;

/** 巡目: 最小・最大・デフォルト（1〜18） */
export const XUN_MIN = 1;
export const XUN_MAX = 18;
export const DEFAULT_XUN = 7;


/** 手牌分析の入力として必要な局情報。全境界でこの形に統一する。 */
export interface AnalysisContext {
  /** 手牌文字列（必須） */
  shoupai: ShoupaiString;
  /** 場風 0-3 */
  zhuangfeng?: Feng;
  /** 自風 0-3 */
  menfeng?: Feng;
  /** ドラ表示牌の配列（ドラ表示牌のまま。実際のドラは suanpai 側で変換） */
  baopai?: TileId[];
  /** 赤牌ありか */
  hongpai?: boolean;
  /** 巡目 */
  xun?: number;
  /** 捨て牌情報（オプション） */
  heinfo?: string | null;
}

/**
 * 牌の視覚化（formatTiles 関数）の入出力型（共通型）
 * 設計: docs/shared-types-design.md §4.7
 * 注: formatTilesTool は LLM に渡さず、サーバー内で formatTiles 関数の型としてのみ使用する。
 */

import type { ShoupaiString, TileId } from './domain';

/** 手牌文字列または牌ID配列のどちらか一方を渡す */
export type FormatTilesInput =
  | { shoupai: ShoupaiString; tiles?: never }
  | { tiles: TileId[]; shoupai?: never };

export interface FormatTilesOutput {
  formatted: string;
}

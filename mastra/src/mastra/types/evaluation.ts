/**
 * 分析結果の型（共通型）
 * 設計: docs/shared-types-design.md §4.3
 */

import type { TileId } from './domain';

/** 打牌候補1つ */
export interface DapaiCandidate {
  tile: TileId;
  n_xiangting: number;
  ev: number;
  tingpai: TileId[];
  n_tingpai: number;
  /** 推奨打牌かどうか */
  selected?: boolean;
}

/** 手牌評価の結果。evaluateShoupaiTool / Workflow の出力を統一 */
export interface EvaluateShoupaiResult {
  current: {
    n_xiangting: number;
    ev: number;
  };
  dapai_candidates: DapaiCandidate[];
  recommended: TileId;
}

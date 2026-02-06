/**
 * 共通型の再エクスポート
 * 設計: docs/shared-types-design.md
 * mastra と frontend の両方で同じ型を import する。
 * 他パッケージはこの index からのみ参照すること。
 */

// --- 値エクスポート（定数・スキーマ） ---
export {
  DEFAULT_XUN,
  MAX_HAND,
  MENFENG_LABELS,
  TILES_PER_TYPE,
  XUN_MAX,
  XUN_MIN,
  ZHUANGFENG_LABELS,
} from "./domain";
export { fengSchema, gameStateSchema } from "./zod";

// --- 型エクスポート ---
export type {
  AnalysisRequest,
  AnalysisStreamEvent,
  AnalysisStreamEventDone,
  AnalysisStreamEventError,
  AnalysisStreamEventResult,
  AnalysisStreamEventTextDelta,
  RecognizeShoupaiInput,
  RecognizeShoupaiOutput,
} from "./api";
export type { AnalysisContext, Feng, ShoupaiString, TileId } from "./domain";
export type { ApiError } from "./errors";
export type { DapaiCandidate, EvaluateShoupaiResult } from "./evaluation";
export type { FormatTilesInput, FormatTilesOutput } from "./format-tiles";

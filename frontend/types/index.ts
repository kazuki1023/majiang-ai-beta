/**
 * 共通型の再エクスポート
 * 設計: docs/shared-types-design.md
 * mastra と frontend の両方で同じ型を import する。
 * 注: mastra/src/mastra/types/ と同一の型定義を保つこと。
 */

export type { AnalysisContext, Feng, ShoupaiString, TileId } from './domain';
export type { DapaiCandidate, EvaluateShoupaiResult } from './evaluation';
export type { ApiError } from './errors';
export type {
  AnalysisRequest,
  AnalysisStreamEvent,
  AnalysisStreamEventDone,
  AnalysisStreamEventError,
  AnalysisStreamEventResult,
  AnalysisStreamEventTextDelta,
  RecognizeShoupaiInput,
  RecognizeShoupaiOutput,
} from './api';
export type { FormatTilesInput, FormatTilesOutput } from './format-tiles';
export { fengSchema, gameStateSchema } from './zod';

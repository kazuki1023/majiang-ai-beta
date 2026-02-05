/**
 * フロント⇔API のリクエスト・レスポンス、画像認識の入出力（共通型）
 * 設計: docs/shared-types-design.md §4.5, §4.6
 */

import type { AnalysisContext, ShoupaiString } from './domain';
import type { EvaluateShoupaiResult } from './evaluation';
import type { ApiError } from './errors';

/** 分析API に送るリクエスト body */
export interface AnalysisRequest {
  /** 局情報。必須。 */
  context: AnalysisContext;
}

/** ストリーミング: 先頭で result を 1 件送る */
export interface AnalysisStreamEventResult {
  type: 'result';
  result: EvaluateShoupaiResult;
}

/** ストリーミング: 説明文を text-delta で送る */
export interface AnalysisStreamEventTextDelta {
  type: 'text-delta';
  delta: string;
}

/** ストリーミング: 終了 */
export interface AnalysisStreamEventDone {
  type: 'done';
}

/** ストリーミング: エラー時は先頭で 1 件送る */
export interface AnalysisStreamEventError {
  type: 'error';
  error: ApiError;
}

/** ストリーミングで送られるイベントのいずれか */
export type AnalysisStreamEvent =
  | AnalysisStreamEventResult
  | AnalysisStreamEventTextDelta
  | AnalysisStreamEventDone
  | AnalysisStreamEventError;

/** 画像認識ツールの入力 */
export interface RecognizeShoupaiInput {
  gcsUri: string;
}

/** 画像認識ツールの出力（フロントも同じ型で受け取る） */
export interface RecognizeShoupaiOutput {
  shoupaiString: ShoupaiString;
  rawResponse?: string;
  /** 失敗時。code: RECOGNITION_EMPTY / RECOGNITION_BACKEND_ERROR 等 */
  error?: ApiError;
}

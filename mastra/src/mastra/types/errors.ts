/**
 * 共通エラー型
 * 設計: docs/shared-types-design.md §4.4
 */

/** 共通エラー型。分析API・画像認識・ストリーミングの error イベントで使用 */
export interface ApiError {
  /** エラー種別（フロントでメッセージ切り替えに利用） */
  code?: string;
  /** ユーザー向けメッセージ */
  message: string;
  /** 追加情報（デバッグ用など） */
  details?: unknown;
}

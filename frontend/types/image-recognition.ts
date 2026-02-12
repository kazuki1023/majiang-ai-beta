/**
 * 画像認識フローの状態 phase。
 *
 * 遷移:
 *   idle ──(startWithFile)──→ uploading ──(API success)──→ recognizing
 *     ↑                              ↘                          │
 *     │                                error ←───────────────────┤
 *     │                                   ↑                      │
 *     └──(写真再選択でリセット)────────────┘   recognized ←──(API success)──┘
 */
export type ImageRecognitionPhase =
  | "idle"
  | "uploading"
  | "recognizing"
  | "recognized"
  | "error";

export interface ImageRecognitionState {
  phase: ImageRecognitionPhase;
  /** プレビュー用 object URL（idle 以外で設定されうる） */
  previewUrl: string | null;
  /** アップロード済み GCS URI（recognizing / recognized のとき設定） */
  gcsUri: string | null;
  /** 認識結果の手牌文字列（recognized のとき設定） */
  recognizedShoupaiString: string | null;
  /** エラー時メッセージ（phase === 'error' のとき設定） */
  errorMessage: string | null;
}

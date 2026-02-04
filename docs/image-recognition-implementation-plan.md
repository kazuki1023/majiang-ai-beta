# Phase 4: 画像認識機能 詳細実装計画

## 概要

手牌画像を GCS にアップロード済みの `gcsUri` を渡し、**Gemini Vision** で画像から手牌文字列を認識する。
認識結果は「写真から」タブ内の**認識ボタン直下**に手牌入力 UI を設け、そこに表示してユーザーが写真を見ながら編集できるようにする。

参照: [ARCHITECTURE.md](../ARCHITECTURE.md) Phase 4、[image-to-paipu-design.md](./image-to-paipu-design.md)、[image-recognition-evaluation.md](./image-recognition-evaluation.md)。

---

## 前提・決定事項

| 項目 | 内容 |
|------|------|
| **認識手法** | まず **Gemini Vision のみ**で実装し、精度を検証。必要に応じて Vision OCR + Gemini 整形を検討。 |
| **API** | `POST /api/agents/imageRecognitionAgent/generate`。body は Mastra の generate 仕様に合わせる（`messages` に `gcsUri` を content で渡す想定）。 |
| **GCS** | 同一バケット（`GCS_BUCKET`）のみ使用。Mastra（Cloud Run）が画像を参照するため、**サービスアカウントに GCS の roles 付与が必要**。 |
| **Mastra** | **imageRecognitionAgent + ツール**で実装。ツール内で GCS から画像を取得し Gemini Vision に渡す。 |
| **UI** | 「認識」クリックで imageRecognitionAgent を呼び、返ってきた手牌を**認識ボタン直下**の手牌入力 UI に渡す（タブ内の既存「手で入力」とは別）。ユーザーはアップロードした写真を見ながらその下の入力欄で編集可能。 |

---

## 実装フェーズとタスク一覧

### フェーズ 0: GCS 権限・環境変数

- [ ] **0.1 サービスアカウントに GCS 読み取り権限を付与**
  - [ ] 0.1.1 Cloud Run に紐づくサービスアカウント（例: `majiang-ai-sa`）に `roles/storage.objectViewer` を付与する
  - [ ] 0.1.2 付与コマンドを [docs/gcp/iam-service-account.md](./gcp/iam-service-account.md) に追記または確認する
  - 参考: [docs/gcp/iam-service-account.md](./gcp/iam-service-account.md) の「roles/storage.objectViewer」節

- [ ] **0.2 Mastra の環境変数**
  - [ ] 0.2.1 Mastra（Cloud Run）に `GCS_BUCKET` が設定されているか確認する（同一バケット検証用）
  - [ ] 0.2.2 必要なら `GOOGLE_CLOUD_PROJECT` も確認する（GCS / Gemini 利用に必要な場合）

---

### フェーズ 1: Mastra imageRecognitionAgent + ツール（Gemini Vision）

- [x] **1.1 画像認識ツールの作成**
  - [x] 1.1.1 `mastra/src/mastra/tools/image-recognition/` を新規作成する
  - [x] 1.1.2 GCS から画像を取得する処理を実装する（`@google-cloud/storage` で download、base64 で Gemini に渡す）
  - [x] 1.1.3 **Gemini Vision**（`@google/generative-ai` gemini-1.5-flash）に画像とプロンプトを渡し、手牌文字列を返す
  - [x] 1.1.4 入力: `gcsUri: string`。同一バケット（`GCS_BUCKET`）以外は拒否
  - [x] 1.1.5 出力: `{ shoupaiString: string, rawResponse?: string }`

- [x] **1.2 imageRecognitionAgent の作成**
  - [x] 1.2.1 `mastra/src/mastra/agents/image-recognition-agent.ts` を新規作成する
  - [x] 1.2.2 モデルは `google/gemini-1.5-flash`（Vision 対応）
  - [x] 1.2.3 instructions: ユーザーから GCS URI を受け取り、ツールを呼んで手牌文字列をそのまま返す
  - [x] 1.2.4 ツール: `recognizeShoupaiFromGcsTool` を登録

- [x] **1.3 Mastra への登録**
  - [x] 1.3.1 `mastra/src/mastra/index.ts` の `agents` に `imageRecognitionAgent` を追加する
  - [ ] 1.3.2 ローカルで Mastra を起動し、`POST /api/agents/imageRecognitionAgent/generate` に `messages: [{ role: "user", content: "gs://..." }]` を送って動作確認する

- [x] **1.4 API 契約の明確化**
  - [x] 1.4.1 リクエスト: `{ messages: [{ role: "user", content: string }] }`。`content` に `gcsUri`（`gs://...`）をそのまま入れる
  - [x] 1.4.2 レスポンス: Mastra generate の標準形式。`text` に手牌文字列が含まれる（エージェントがツール結果を返す）

---

### フェーズ 2: フロントエンド UI

- [x] **2.1 画像認識 API クライアント**
  - [x] 2.1.1 `frontend/lib/mastra-client.ts` に `generateImageRecognition(gcsUri: string)` を追加する
  - [x] 2.1.2 `POST /api/agents/imageRecognitionAgent/generate` を呼び、body は `{ messages: [{ role: "user", content: gcsUri }] }` とする
  - [x] 2.1.3 レスポンスの `text` から手牌文字列（`m...p...s...z...`）を抽出して返す

- [x] **2.2 認識ボタンと認識結果用の手牌入力 UI**
  - [x] 2.2.1 `ImageUpload` 内で「認識」ボタンを有効化する（`gcsUri` があるときのみ押下可能）
  - [x] 2.2.2 認識クリック時に `generateImageRecognition(gcsUri)` を呼び、ローディング状態を表示する
  - [x] 2.2.3 **認識ボタン直下**に、認識結果を表示・編集する手牌入力 UI（`ShoupaiInput`）を配置する
  - [x] 2.2.4 認識結果の手牌文字列を `initialShoupaiString` で渡し、`key={recognizedShoupaiString}` で初期化を反映
  - [x] 2.2.5 写真タブから `onSubmit`（分析実行）を渡し、認識結果の手牌で分析できるようにする

- [x] **2.3 ShoupaiInput の拡張（初期値対応）**
  - [x] 2.3.1 `ShoupaiInput` に `initialShoupaiString?: string` を追加する
  - [x] 2.3.2 初期値は `useState(() => shoupaiStringToTileIds(initialShoupaiString ?? ''))` で設定。親で `key` を渡してリセット
  - [x] 2.3.3 写真タブでは認識結果を `initialShoupaiString` に渡し、編集後に分析実行可能

- [x] **2.4 エラー表示**
  - [x] 2.4.1 認識 API がエラーを返したとき、既存の `error` 状態で表示する
  - [ ] 2.4.2 手牌が 14 枚でない等の警告は、必要なら UI 側で補足表示する

---

### フェーズ 3: 結合・検証

- [ ] **3.1 エンドツーエンド確認**
  - [ ] 3.1.1 「写真から」タブで画像を選択 → アップロード → 認識 → 認識結果が手牌入力に表示されることを確認する
  - [ ] 3.1.2 認識結果を編集して分析実行できることを確認する（写真タブ内で分析ボタンを置く場合）

- [ ] **3.2 ドキュメント更新**
  - [ ] 3.2.1 [ARCHITECTURE.md](../ARCHITECTURE.md) の Phase 4 チェックリストを完了に更新する
  - [ ] 3.2.2 画像認識のリクエスト/レスポンス形式を [image-to-paipu-design.md](./image-to-paipu-design.md) または本ドキュメントに追記する

- [ ] **3.3 精度検証（任意）**
  - [ ] 3.3.1 実手牌画像で Gemini Vision の認識結果と実物を比較し、[image-recognition-evaluation.md](./image-recognition-evaluation.md) に結果をメモする
  - [ ] 3.3.2 必要に応じて Vision OCR + Gemini 整形の検討に進む

---

## 補足: Gemini に画像を渡す方法

- **GCS URI をそのまま渡せるか**: Gemini API（Vertex / AI Studio）によっては、画像を base64 で渡す必要がある。その場合は Mastra ツール内で GCS から `file.download()` し、base64 エンコードして Gemini に渡す。
- **ツールの戻り値**: ツールで「手牌文字列」を返し、エージェントがそれをユーザーへの返答としてそのまま返す形にすると、フロントのパースが簡単になる。

---

## 補足: Gemini API SDK の移行

画像認識ツールでは **Google GenAI SDK（`@google/genai`）** を使用している（[移行ガイド](https://ai.google.dev/gemini-api/docs/migrate?hl=ja#javascript) 参照）。

- **旧**: `@google/generative-ai`（`GoogleGenerativeAI` → `getGenerativeModel()` → `generateContent([prompt, imagePart])`）
- **新**: `@google/genai`（`GoogleGenAI` → `ai.models.generateContent({ model, contents })`）
- モデル: `gemini-2.0-flash`（2.0 系利用可能）
- 画像は `contents[].parts` に `{ inlineData: { mimeType, data: base64 } }` で渡す
- レスポンスのテキストは `response.text`（プロパティ）で取得

## 参考

- [ARCHITECTURE.md](../ARCHITECTURE.md) — 画像認識フロー図
- [image-to-paipu-design.md](./image-to-paipu-design.md) — 写真→牌譜の全体設計
- [image-recognition-evaluation.md](./image-recognition-evaluation.md) — 認識手法の比較
- [docs/gcp/iam-service-account.md](./gcp/iam-service-account.md) — GCS 権限
- [Google GenAI SDK に移行する（JavaScript）](https://ai.google.dev/gemini-api/docs/migrate?hl=ja#javascript)

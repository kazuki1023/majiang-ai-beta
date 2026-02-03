# Phase 3: Next.js フロントエンド 詳細実装計画

## 概要

Mastra API の Cloud Run 移行完了を前提に、Next.js フロントエンドの構築計画を詳細化する。  
参照: [ARCHITECTURE.md](../ARCHITECTURE.md) Phase 3、[frontend-preparation-checklist.md](./frontend-preparation-checklist.md)、[cors-strategy.md](./cors-strategy.md)、[image-to-paipu-design.md](./image-to-paipu-design.md)。

---

## 前提・スコープ

- **完了済み**: Mastra API Cloud Run デプロイ、GCS バケット、必要な API 有効化
- **設計（2025年方針変更）**: ブラウザは Mastra API を**直接叩かず**、**Next.js の API Route 経由（プロキシ）**で叩く（[cors-strategy.md](./cors-strategy.md) 選択肢 C）。CORS 不要、Mastra の URL はサーバー専用の `MASTRA_API_URL` で Secret Manager 管理可。
- **Phase 3 の範囲**: 手牌テキスト入力 → 分析 API 連携、画像アップロード UI（GCS 保存まで）、分析結果表示、**majiang-ui による牌描画（手牌・分析結果）**
- **Phase 4 に回す**: imageRecognitionAgent（画像→手牌認識）は未実装のため、画像アップロードは「保存＋プレースホルダー表示」まで

---

## 実装フェーズとタスク一覧

### フェーズ 0: 事前対応（フロント実装より先に実施推奨）

- [x] **0.1 Next.js に Mastra 用プロキシ API Route を追加**（[cors-strategy.md](./cors-strategy.md) 選択肢 C）
  - [x] 0.1.1 `/api/agents/[...path]` 等の API Route を追加し、`MASTRA_API_URL` へ中継する
  - [x] 0.1.2 `generate` 用（POST → JSON 返却）と `stream` 用（POST → ReadableStream 中継）の両方に対応する
  - [x] 0.1.3 環境変数 `MASTRA_API_URL`（サーバー専用）を読み、未設定時は 503 でエラーメッセージを返す
  - [ ] 0.1.4 ローカルで Next と Mastra を起動し、同一オリジン（`/api/...`）経由で Mastra に届くことを確認する
  参照: [cors-strategy.md](./cors-strategy.md) 選択肢 C、実装例

- [ ] **0.2 Mastra API の環境変数**（プロキシ採用のため CORS 用 `FRONTEND_URL` は必須ではない）
  - [ ] 0.2.1 Cloud Run の「編集と新しいリビジョンをデプロイ」で環境変数一覧を確認する
  - [ ] 0.2.2 必要に応じて `FRONTEND_URL` を設定する（他オリジンから直接 Mastra を叩く場合のみ。プロキシのみなら不要）
  - [ ] 0.2.3 ローカル開発用に `.env` や `mastra/.env` に `FRONTEND_URL=http://localhost:3000` を設定する（任意）

- [ ] **0.3 Mastra API のレスポンス形式確認**
  - [ ] 0.3.1 `POST /api/agents/majiangAnalysisAgent/generate` を curl で 1 回叩く（手牌を content に含めた messages を送る）
  - [ ] 0.3.2 返却 JSON をファイルに保存する（例: `docs/sample-mastra-generate-response.json`）
  - [ ] 0.3.3 レスポンスのキー構造をメモする（`output` / `text` / `messages` 等、AI の応答テキストがどのキーに入っているか）
  - [ ] 0.3.4 フロント用の型定義とパース方針をメモする（後で `lib/mastra-client.ts` と `AnalysisResult` に反映）

---

### フェーズ 1: プロジェクト作成と基盤

- [x] **1.1 Next.js プロジェクト作成**
  - [x] 1.1.1 リポジトリルートで `frontend/` ディレクトリを作成する
  - [x] 1.1.2 `npx create-next-app@latest frontend` を実行する（または `cd frontend` のうえで `npx create-next-app@latest .`）
  - [x] 1.1.3 オプションで App Router、TypeScript、Tailwind CSS、ESLint を有効にする
  - [x] 1.1.4 `src` ディレクトリは使わず、`app/` をルート直下に配置する（ARCHITECTURE の構成と一致させる）
  - [x] 1.1.5 `npm run dev` で起動し、初期ページが表示されることを確認する

- [x] **1.2 ディレクトリ構成**
  - [x] 1.2.1 `app/` が存在することを確認する
  - [x] 1.2.2 `app/api/` を作成する（API Routes 用）
  - [x] 1.2.3 `components/` をルート直下に作成する
  - [x] 1.2.4 `lib/` をルート直下に作成する
  - [x] 1.2.5 必要に応じて `app/globals.css` やレイアウトを確認・調整する

- [x] **1.3 next.config.js**
  - [x] 1.3.1 `next.config.ts` を開く
  - [x] 1.3.2 `output: 'standalone'` を設定する（Docker / Cloud Run 用）
  - [x] 1.3.3 `npm run build` を実行し、`.next/standalone` が生成されることを確認する

- [x] **1.4 環境変数**
  - [x] 1.4.1 `.env.local.example` を作成し、`.env.local` は git に含めない（.gitignore で `.env*` 除外済み）
  - [x] 1.4.2 `NEXT_PUBLIC_MASTRA_API_URL` をドキュメント化（ローカル時は Mastra のローカル URL または Cloud Run URL）
  - [x] 1.4.3 本番用の環境変数一覧をメモする（Cloud Run で後から設定する: `NEXT_PUBLIC_MASTRA_API_URL`, `GCS_BUCKET`, `GOOGLE_CLOUD_PROJECT`）

- [x] **1.5 majiang-ui の扱い（決定: A、Phase 3 で牌描画）**
  - [x] 1.5.1 `frontend/package.json` に `"@kobalab/majiang-ui": "^1.6.0"` を追加する（**npm からインストール**。Turbopack でのバンドル解決のため file: submodule ではなく npm 参照に変更）
  - [x] 1.5.2 majiang-ui の依存を frontend で解決する。jquery, jquery-ui, @kobalab/majiang-core, @kobalab/majiang-ai, @kobalab/tenhou-url-log を package.json に追加（npm から取得）
  - [x] 1.5.3 README に「`git submodule update --init` 済みであること」「`npm install` は frontend で実行」を明記する
  - [ ] 1.5.4 Docker ビルドはリポジトリルートから行い、`COPY submodules/` で submodules をコピーする（フェーズ 4 で対応）

---

### フェーズ 2: 手牌入力 UI と API 連携

- [x] **2.1 Mastra クライアント**（設計変更: 同一オリジン呼び出しに更新）
  - [x] 2.1.1 `lib/mastra-client.ts` を新規作成する
  - [x] 2.1.2 **同一オリジン**の Next.js API Route を呼ぶように変更する。`getBaseUrl()` を `""` にし、`/api/agents/majiangAnalysisAgent/generate` 等を相対パスで叩く（サーバー側で `MASTRA_API_URL` を使用してプロキシ）
  - [x] 2.1.3 `POST /api/agents/majiangAnalysisAgent/generate` を呼ぶ `generateMajiangAnalysis` を実装する（非ストリーミング用）
  - [x] 2.1.4 `POST /api/agents/majiangAnalysisAgent/stream` を呼ぶ `streamMajiangAnalysis` を実装する。fetch + ReadableStream でチャンクをパースし、`text-delta` を `onTextDelta` コールバックで返す。SSE（`data:`）と NDJSON の両方に対応
  - [x] 2.1.5 リクエスト body を `{ messages: [{ role: 'user', content: string }] }` の形にする
  - [x] 2.1.6 `GenerateResponse` / `StreamEvent` / `StreamOptions` を TypeScript で定義する。`AbortSignal` で中断可能

- [x] **2.2 手牌入力コンポーネント**
  - [x] 2.2.1 `components/ShoupaiInput.tsx` を新規作成する
  - [x] 2.2.2 手牌文字列用の input を配置する（プレースホルダー例: `m123p1234789s3388`）
  - [x] 2.2.3 任意で場風・自風・ドラ・巡目を `<details>` 内に配置する（Phase 5 で拡張可）
  - [x] 2.2.4 フォーム送信時に「手牌: …、場風・自風・ドラ・巡目、の最適な打牌を教えてください」形式で `onSubmit(content)` を呼ぶ
  - [x] 2.2.5 ラベル・説明（m=萬子等）を付ける。牌描画は 3.5 の ShoupaiDisplay で行い、本コンポーネントでは呼ばない

- [x] **2.3 分析実行とローディング**
  - [x] 2.3.1 送信ボタン押下時に `streamMajiangAnalysis` を呼ぶ（`app/page.tsx` の handleSubmit）
  - [x] 2.3.2 ローディング状態（useState）を用意し、送信開始で true、完了で false。ストリーミング中は「表示中...」表示
  - [x] 2.3.3 ローディング中は ShoupaiInput に disabled を渡し、ボタンは「分析中...」表示
  - [x] 2.3.4 AbortController でキャンセル可能。「キャンセル」ボタンで stream を中断
  - [x] 2.3.5 エラー時はローディングを解除し、エラーメッセージを表示。AbortError のときは「キャンセルされました」を結果末尾に追記

- [x] **2.4 分析結果表示**
  - [x] 2.4.1 `components/AnalysisResult.tsx` を新規作成する
  - [x] 2.4.2 Mastra のレスポンスから「推奨打牌・理由・表」に相当するテキストを抽出する（0.3 の構造に基づく）。**ストリーミング時**は `text-delta` を逐次連結して表示する（[streaming-implementation.md](./streaming-implementation.md) 参照）
  - [x] 2.4.3 プレーンテキストまたは Markdown として表示する（Markdown なら `react-markdown` 等を導入）
  - [x] 2.4.4 親コンポーネント（例: `page.tsx`）から分析結果を props で渡し、結果があるときだけ表示する。ストリーミング中は state で蓄積したテキストを渡す

- [ ] **2.5 エラーハンドリング**（方針・Toast 導入済みのため実装は一旦保留）
  - 方針・エラー種別・見せ方は [error-handling.md](./error-handling.md) を参照
  - [ ] 2.5.1 ネットワークエラー（fetch failed）時にユーザー向けメッセージを表示する
  - [ ] 2.5.2 4xx / 5xx の場合にレスポンス body からメッセージを読んで表示する（形式は 0.3 や「質問・懸念」§6 を参照）
  - [ ] 2.5.3 CORS エラー時にも分かりやすいメッセージを出せるようにする
  - [ ] 2.5.4 タイムアウト時は「時間がかかりすぎています。再試行してください」などの表示にする

- [x] **2.6 majiang-ui 導入の準備（Phase 3 牌描画に向けて）**
  - [x] 2.6.1 jQuery と jquery-ui を frontend にインストールする（majiang-ui の依存のため）
  - [x] 2.6.2 牌表示用のデータを用意する。`PAI_IDS_FOR_UI` と `ShoupaiDisplay` で手牌文字列→牌リスト表示を実装。牌アセット（画像）と majiang-ui 本体内の `pai(loaddata)` 利用は Phase 3 で対応（Next 16 Turbopack でのバンドル解決要検討）
  - [x] 2.6.3 手牌文字列↔牌ID配列のヘルパーを `lib/shoupai-utils.ts` に追加（`selectedTilesToShoupaiString`、`shoupaiStringToTileIds`）。majiang-core の `Shoupai.fromString` は majiang-ui 利用時にコンポーネント内で使用する想定
  - [x] 2.6.4 手牌表示は `components/ShoupaiDisplay` に集約。現状は majiang-ui を使わず牌ボタンで表示。Phase 3 で majiang-ui を動的 import または script タグで読み込み、牌絵表示に差し替える

---

### フェーズ 3: 画像アップロード UI（GCS 連携）＋ 牌描画

- [x] **3.1 GCS クライアント（サーバー側）**
  - [x] 3.1.1 `lib/gcs-client.ts` を新規作成する（サーバー専用。クライアントから直接 import しない）
  - [x] 3.1.2 `@google-cloud/storage` をインストールする（`npm install @google-cloud/storage`）
  - [x] 3.1.3 `Storage` クライアントを初期化する（ADC または `GOOGLE_CLOUD_PROJECT` を利用）
  - [x] 3.1.4 `uploadImage(buffer: Buffer, fileName: string)` を実装する
  - [x] 3.1.5 保存パスを `uploads/{timestamp}-{fileName}` 形式にする
  - [x] 3.1.6 アップロード後に `gs://{bucket}/{path}` を返す
  - [x] 3.1.7 環境変数 `GCS_BUCKET` と `GOOGLE_CLOUD_PROJECT` を読み込む

- [x] **3.2 アップロード API Route**
  - [x] 3.2.1 `app/api/upload/route.ts` を新規作成する
  - [x] 3.2.2 `POST` ハンドラを実装する
  - [x] 3.2.3 リクエストを multipart/form-data として受け、画像ファイルを取得する
  - [x] 3.2.4 `lib/gcs-client` の `uploadImage` を呼び、GCS に保存する
  - [x] 3.2.5 成功時に `{ gcsUri: 'gs://...' }` を JSON で返す
  - [x] 3.2.6 失敗時は適切な HTTP ステータスとエラーメッセージを返す

- [x] **3.3 画像アップロード UI**
  - [x] 3.3.1 `components/ImageUpload.tsx` を新規作成する
  - [x] 3.3.2 ファイル選択用の input（accept="image/*"）を配置する
  - [x] 3.3.3 選択後にプレビューを表示する（3.4 と連携）
  - [x] 3.3.4 アップロードボタンを配置し、クリックで `/api/upload` に POST する
  - [x] 3.3.5 成功時に返却された `gcsUri` を state に保持する
  - [x] 3.3.6 Phase 4 で imageRecognitionAgent ができたら「認識」ボタンで API 呼び出しに繋ぐ想定のため、必要なら「準備中」のプレースホルダーを表示する

- [x] **3.4 画像プレビュー**
  - [x] 3.4.1 アップロード前: 選択した File を `URL.createObjectURL` でプレビュー表示する
  - [x] 3.4.2 アップロード後: 必要に応じて GCS の Signed URL を取得して表示する（必須でない場合は Object URL のままでも可）

- [x] **3.5 牌描画（Phase 3 で実施）**
  - [x] 3.5.1 手牌表示用の React コンポーネント（`components/ShoupaiDisplay/ShoupaiDisplay.tsx`）を作成済み
  - [x] 3.5.2 手牌入力欄の近くに、入力した手牌文字列を牌画像でプレビュー表示する（TileButton + public/pai/*.gif）
  - [x] 3.5.3 分析結果表示は Markdown 表示（AnalysisResult）。牌表記はテキストのまま
  - [x] 3.5.4 牌アセットは `public/pai/{牌ID}.gif`（civillink 等）で読み込み
  - [x] 3.5.5 Docker ビルド時に submodules が含まれることを確認する（フェーズ 4 でビルド検証）

**補足**: 画像認識は Phase 4 のため、Phase 3 では「画像を GCS に上げて URL を保持する」まで。認識結果の表示は「未実装」表示や、後で繋ぐプレースホルダーでよい。

---

### フェーズ 4: Docker とデプロイ

- [x] **4.1 Dockerfile**
  - [x] 4.1.1 `frontend/Dockerfile` を新規作成する
  - [x] 4.1.2 マルチステージビルドにする（builder と runner）
  - [x] 4.1.3 builder で `npm ci` と `npm run build` を実行する
  - [x] 4.1.4 runner で `.next/standalone` の内容をコピーする
  - [x] 4.1.5 `.next/static` と `public/` を明示的にコピーする
  - [x] 4.1.6 `ENV PORT=8080`、`CMD ["node", "server.js"]` を設定する
  - [x] 4.1.7 ビルドコンテキストをリポジトリルートにする想定で、`COPY` のパスを調整する（4.2 と整合）

- [x] **4.2 submodules 対応**
  - [x] 4.2.1 frontend が majiang-ui 等の submodule を参照している場合、Docker ビルドはリポジトリルートから行う
  - [x] 4.2.2 `docker build -f frontend/Dockerfile .` のようにコンテキストをルートにし、`COPY submodules/ ./submodules/` などで frontend から参照できるようにする
  - [x] 4.2.3 frontend 単体で submodule を使わない場合は、`COPY frontend/ ./` などで frontend だけコピーする構成で実装済み

- [x] **4.3 .dockerignore**
  - [x] 4.3.1 ルートの `.dockerignore` に、コンテキストに含めないファイルを記載する
  - [x] 4.3.2 少なくとも `node_modules`, `.env`, `.env.local`, `.git` を除外する
  - [x] 4.3.3 `frontend/node_modules`, `frontend/.next`, `docs`, `.cursor` 等を除外する

- [ ] **4.4 Cloud Run デプロイ**
  - [ ] 4.4.1 Docker イメージをビルドする（Apple Silicon の場合は `--platform linux/amd64` を付ける）
  - [ ] 4.4.2 Artifact Registry にタグを付けて push する
  - [ ] 4.4.3 `gcloud run deploy majiang-ai-frontend` でデプロイする
  - [ ] 4.4.4 環境変数 `NEXT_PUBLIC_MASTRA_API_URL`, `GCS_BUCKET`, `GOOGLE_CLOUD_PROJECT` を設定する
  - [ ] 4.4.5 デプロイ後にサービス URL を取得する
  - **詳細**: [docs/gcp/cloud-run-frontend-deploy.md](gcp/cloud-run-frontend-deploy.md)

- [ ] **4.5 CORS の反映**
  - [ ] 4.5.1 フロントの本番 URL（Cloud Run の URL）をメモする
  - [ ] 4.5.2 Mastra API の Cloud Run サービスで環境変数 `FRONTEND_URL` をその URL に更新する
  - [ ] 4.5.3 ブラウザから本番フロント → Mastra API のリクエストが通ることを確認する

---

### フェーズ 5: 統合と UX 調整（任意）

- [ ] **5.1 手牌入力と画像の統合**
  - [ ] 5.1.1 同一ページで「手牌を直接入力」と「画像をアップロード」をタブやセクションで切り替えられるようにする
  - [ ] 5.1.2 画像アップロード後に認識（Phase 4）ができたら、その結果を手牌入力欄に反映する

- [ ] **5.2 GameInfoForm**
  - [ ] 5.2.1 場風・自風・ドラ・巡目を image-to-paipu-design の形式に合わせて入力するフォームを用意する
  - [ ] 5.2.2 majiangAnalysisAgent に渡す `content` に、手牌とこれらの情報を含める

- [ ] **5.3 majiang-ui の拡張（Phase 3 で基本は実施済み）**
  - [ ] 5.3.1 分析結果内の表（打牌候補一覧）を majiang-ui の牌表示でより見やすくする等、必要に応じて拡張する
  - [ ] 5.3.2 場風・自風・ドラ表示など GameInfoForm と組み合わせた表示があれば検討する

---

## ディレクトリ・ファイル一覧（目標）

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── upload/
│           └── route.ts
├── components/
│   ├── ShoupaiInput.tsx      # 手牌テキスト＋任意で場風・自風・ドラ・巡目
│   ├── ShoupaiDisplay.tsx   # majiang-ui による手牌表示（Phase 3）
│   ├── AnalysisResult.tsx   # 分析結果表示
│   ├── ImageUpload.tsx      # 画像選択・プレビュー・アップロード
│   ├── ImagePreview.tsx     # 画像プレビュー（必要に応じて ImageUpload に統合可）
│   └── GameInfoForm.tsx     # 場風・自風・ドラ・巡目（Phase 5 で充実）
├── lib/
│   ├── mastra-client.ts
│   ├── gcs-client.ts
│   └── shoupai-utils.ts     # 手牌文字列 → majiang-core Shoupai（majiang-ui 用）
├── next.config.js            # output: 'standalone'
├── Dockerfile
├── .dockerignore
└── package.json
```

---

## 環境変数まとめ

- **Next.js（サーバーのみ）**: `MASTRA_API_URL` — Mastra API の URL（プロキシ用。Secret Manager で渡す想定）
- **Next.js（サーバーのみ）**: `GCS_BUCKET` — バケット名（例: `majiang-ai-images`）
- **Next.js（サーバーのみ）**: `GOOGLE_CLOUD_PROJECT` — GCP プロジェクト ID（GCS 用）
- **Mastra API**: `FRONTEND_URL` — フロントのオリジン（他オリジンから直接 Mastra を叩く場合のみ。プロキシのみなら不要）

設計変更により `NEXT_PUBLIC_MASTRA_API_URL` は不要（ブラウザは同一オリジンの `/api/...` のみ呼ぶ）。GCS 認証は Cloud Run のサービスアカウント＋ADC（ローカルは `gcloud auth application-default login`）を想定。

---

## 質問・疑問・懸念点

### 1. Mastra API のレスポンス形式

- **参照**: 公式の戻り値（Returns）は [docs/mastra/agents/generate.md](./mastra/agents/generate.md) に記載。`text`（生成テキスト）、`object`（構造化出力）、`toolCalls`、`toolResults`、`usage`、`steps`、`finishReason`、`response`（`messages` 等）、`error` などの形で返る。
- **REST API**: `POST /api/agents/{agentName}/generate` の HTTP レスポンスは、上記 Returns を JSON 化した形（またはその一部）と想定。`lib/mastra-client.ts` の型と `AnalysisResult` のパースはこの形に合わせる。必要ならフェーズ 0 で 1 回 curl で叩き、実際のキー名を確認する。

### 2. majiang-ui の参照方法（議論用・メリデリ）

**majiang-ui の前提（現状）**

- npm パッケージ名: `@kobalab/majiang-ui`。`main: lib/index.js` でビルド不要（既に JS が lib にある）。
- **jQuery + jquery-ui** に依存。Shoupai 等は jQuery オブジェクトで DOM を操作する。
- **CommonJS**（`require`）。Next.js は ESM が主だが CommonJS も読める。
- **majiang-core** の Shoupai オブジェクト（`_bingpai`, `_fulou` 等）を前提とした API。手牌文字列から使う場合は majiang-core でパースしてから渡す必要がある。
- 牌の描画（`pai.js`）は「事前に HTML で牌要素を用意し、その clone を返す」方式。SVG/画像の用意が必要。

---

**参照方法の選択肢**

| 方法 | 概要 | メリット | デメリット |
|------|------|----------|------------|
| **A. file: プロトコル（submodule 参照）** | `"@kobalab/majiang-ui": "file:../submodules/majiang-ui"` を frontend/package.json に指定 | ・submodule の変更がそのまま反映される<br>・自前パッチやフォークを当てやすい<br>・majiang-core 等の submodule とバージョンを揃えやすい | ・`npm install` はリポジトリルートまたは submodule 更新済みが前提<br>・Docker はビルドコンテキストをルートにして `COPY submodules/` が必要 |
| **B. npm パブリックパッケージ** | `npm i @kobalab/majiang-ui` で npm から取得 | ・submodule 不要でシンプル<br>・Docker は frontend 単体コンテキストでよい<br>・CI や clone 手順が単純 | ・自前で変更を当てられない<br>・majiang-ai/mastra 側の submodule バージョンとずれる可能性 |
| **C. npm link（開発のみ）** | 開発時に `npm link` で submodule を参照 | ・開発中の変更が即反映される | ・本番ビルドでは使えない<br>・Docker では別途 A または B が必要<br>・手順が増える |
| **D. pnpm/npm workspaces** | ルートで workspaces に `submodules/majiang-ui` を含める | ・モノレポとして一括インストール可能 | ・git submodule は別 repo のため、workspace に含めると「submodule 更新」と「workspace 更新」の両方を意識する必要あり |

---

**React / Next.js で使うときの技術的な注意**

- **jQuery の扱い**: majiang-ui が jQuery に依存するため、Next.js に jQuery を入れることになる。バンドルサイズ増・SSR では `window` がない問題に注意（クライアント専用コンポーネントで動的 import する等）。
- **DOM の受け渡し**: Shoupai 等は「既にある DOM ノード」に描画する API。React では `useRef` で div を渡し、`useEffect` 内で majiang-ui を初期化する形が現実的。
- **牌アセット**: `pai.js` は「`.pai` を持つ要素＋data 属性」から牌 DOM を clone する仕様。牌画像や牌用 HTML を Next.js 側（public やコンポーネント内）で用意する必要がある。majiang-ui のサンプルや電脳麻将のリソースを流用できるか要確認。

---

**決定事項**

- **参照方法**: **B（npm パブリックパッケージ）** に変更。`"@kobalab/majiang-ui": "^1.6.0"` を frontend に指定。Turbopack で require 解決を確実にするため。Docker は frontend 単体コンテキストでよい。
- **牌描画**: **Phase 3 で牌描画まで実施**する。手牌プレビューと分析結果での牌表示を majiang-ui で行う。タスクは 2.6（準備）と 3.5（牌描画）に記載。

### 3. 画像アップロードの認証

- **方針**: frontend-preparation-checklist の「選択肢 B: Next.js API Route → GCS」を採用。フロントは認証不要で、Next.js の API Route が Cloud Run のサービスアカウント（ADC）で GCS に書き込む。
- **確認したいこと**: フロント用に別サービスアカウントを切るか、既存の `majiang-ai-sa` に `objectCreator` を付与して Cloud Run のフロントサービスで使うか。推奨は「同一 SA でフロントの Cloud Run に objectCreator を付与」。

### 4. CORS（設計変更で不要）

- **方針変更**: ブラウザは Mastra API を直接叩かず、Next.js の API Route（プロキシ）経由で叩く（[cors-strategy.md](./cors-strategy.md) 選択肢 C）。同一オリジンのため **CORS 不要**。フェーズ 0 では Next.js にプロキシ API Route を追加する。

### 5. ストリーミング（/stream）

- **決定**: **ストリーミング対応する**。写真アップロードや手牌分析の応答を逐次表示した方が UX が良く、違和感が少ない。
- **実装方針**: [docs/streaming-implementation.md](./streaming-implementation.md) に記載。Mastra の `POST /api/agents/{agentName}/stream` を fetch + ReadableStream で消費し、`text-delta` を逐次表示する。

### 6. エラーレスポンスの形式

- **懸念**: Mastra API が 4xx/5xx を返すときの body 形式（`{ error: string }` や `{ message, code }` など）が統一されているか不明。
- **推奨**: 数パターン（不正リクエスト、タイムアウト、5xx）を試して、フロントで共通のエラー表示ロジックを書く。

### 7. Cloud Build（CI/CD）

- **決定**: 当面は**手動デプロイ**で進める。その後、**Cloud Build の CI/CD を新たに構築**する形でよい。
- **補足**: 既存の ARCHITECTURE の cloudbuild 例は GCR と `./frontend` 単体コンテキストのため、構築時は Artifact Registry への移行と、frontend のビルドコンテキストをリポジトリルートにする対応が必要になる。

### 8. 画像認識エージェント（Phase 4）との境界

- **決定**: Phase 3 では**画像アップロード UI まで**作ってよし（GCS にアップロードし、gcsUri を保持するまで）。**その先の画像認識**（imageRecognitionAgent の呼び出し、「認識」ボタンで手牌を取得する部分）は **Phase 4 で対応**する。フロントの「認識」は Phase 3 では「準備中」表示やプレースホルダーでよい。

---

## 推奨実施順序（サマリ）

1. **フェーズ 0** — CORS 追加、Mastra レスポンス形式の確認
2. **フェーズ 1** — Next.js 作成、standalone、環境変数、majiang-ui は **A（file:）** で導入
3. **フェーズ 2** — 手牌入力、mastra-client、分析結果表示、エラー処理、**majiang-ui 準備（2.6）**
4. **フェーズ 3** — GCS クライアント、upload API、画像アップロード UI、**majiang-ui 牌描画（3.5）**
5. **フェーズ 4** — Dockerfile（ルートコンテキスト＋submodules 考慮）、Cloud Run デプロイ、FRONTEND_URL 更新
6. **フェーズ 5** — 手牌/画像の統合、GameInfoForm、majiang-ui の拡張（任意）

---

## 参考ドキュメント

- [ARCHITECTURE.md](../ARCHITECTURE.md) — 全体構成、Phase 3 一覧、Docker/Cloud Run
- [docs/frontend-preparation-checklist.md](./frontend-preparation-checklist.md) — CORS、standalone、GCS、デプロイ順序
- [docs/cors-strategy.md](./cors-strategy.md) — CORS 選択肢 A の実装メモ
- [docs/streaming-implementation.md](./streaming-implementation.md) — **ストリーミング（/stream）の実装方針**。fetch + ReadableStream、text-delta 逐次表示、タスク一覧
- [docs/image-to-paipu-design.md](./image-to-paipu-design.md) — 画像フロー、牌譜形式、コンポーネント例
- [docs/gcp/README.md](./gcp/README.md) — GCP 環境・サービスアカウント

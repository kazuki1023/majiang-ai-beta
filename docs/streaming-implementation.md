# ストリーミング実装方針

## 概要

写真アップロードや手牌分析など、API の応答に時間がかかるケースでは、**ストリーミング**で回答を逐次表示することで UX が大きく向上する。  
「写真をアップロードして、しばらく待ってから一気に結果が出る」より、「少しずつ文章が流れてくる」方が違和感が少ない。

**現在の実装**: AI SDK の `useChat` + `DefaultChatTransport({ api: "/api/chat" })` で Mastra の `chatRoute`（POST /chat）に接続。ストリーミングは useChat が処理する（`app/page.tsx`）。

以下は Mastra API のストリーミング仕様の参考と、カスタム実装時の方針メモである。

---

## 目的・スコープ

| 項目 | 内容 |
|------|------|
| **目的** | 手牌分析・画像認識など、エージェント応答をストリーミング表示する |
| **対象 API** | チャット: `POST /api/chat`（Next プロキシ → Mastra `/chat`）。generate: `POST /api/generate/{agentName}/generate` |
| **対象エージェント** | `majiangAnalysisAgent`、将来の `imageRecognitionAgent` 等 |
| **フロント** | Next.js（React）。useChat がメッセージ・ストリームを管理する |

---

## Mastra API のストリーミング仕様

### エンドポイント

- **URL**: チャットは `POST {MASTRA_URL}/chat`（Mastra chatRoute）。Next は `/api/chat` でプロキシする。
- **Body**: `generate` と同様。例: `{ "messages": [{ "role": "user", "content": "..." }] }`
- **レスポンス**: ストリーミング（SSE: Server-Sent Events または chunked 形式の想定）

### イベント種別（Mastra 公式ドキュメントより）

ストリームでは以下のようなイベントが送られる：

| type | 説明 |
|------|------|
| `start` | エージェント実行開始 |
| `step-start` | ワークフロー／ステップ開始（該当する場合） |
| `text-delta` | LLM が生成したテキストの増分（**ここを画面に逐次表示する**） |
| `tool-call` | ツール呼び出し（ツール名・引数） |
| `tool-result` | ツール実行結果 |
| `step-finish` | ステップ完了 |
| `finish` | エージェント完了（利用統計など） |

フロントでは主に **`text-delta`** の payload を連結して表示する。必要に応じて `tool-call` / `tool-result` で「ツール実行中」などの状態表示も可能。

### 要確認事項（実装前に推奨）

- [ ] （参考）Mastra の `/chat` を叩いたときの **Content-Type** を確認する
- [ ] レスポンス body の**形式**を確認する（1行1JSON の NDJSON、SSE の `data: {...}`、など）
- [ ] 上記に合わせてフロントのパース処理を書く

---

## フロントエンド実装方針

### 1. 通信方式

- **fetch + ReadableStream**: `POST` で body を送る必要があるため、`EventSource`（GET 専用）は使えない。**fetch の `response.body`（ReadableStream）** を読み、チャンクごとにパースする。
- **AbortController**: ユーザーが「キャンセル」した場合や、アンマウント時に `AbortController.abort()` でストリームを中断する。

### 2. クライアント（現在）

- **場所**: `app/page.tsx` で `useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) })` を使用。
- **送信**: `sendMessage({ text: content })`。ストリームは useChat が処理し、`messages` の最後の assistant メッセージを表示する。

### 3. レスポンスのパース

- 受信したチャンクが **SSE**（`data: {...}\n\n`）形式の場合: 行をバッファし、`data:` 行を JSON パースして `type` と `payload` を取得する。
- **NDJSON**（1行1JSON）の場合: 行ごとに `JSON.parse` する。
- `type === 'text-delta'` のとき、`payload` 内のテキスト（例: `payload.textDelta` や `payload.delta`）を連結用の state に渡す。

### 4. React での利用（現在）

- **状態**: `useChat` の `messages` と `status`（`streaming` でストリーム中）。
- **ストリーム開始**: 送信ボタン押下時に `sendMessage({ text: content })` を呼ぶ。
- **表示**: 最後の assistant メッセージの `parts` からテキストを結合し、`AnalysisResult` に渡す。
- **完了**: `status === 'ready'` でストリーム終了。キャンセルは `stop()`。

### 5. エラー・中断

- **ネットワークエラー**: fetch や stream 読み取り中の例外を catch し、ユーザーに「接続エラー」「再試行してください」を表示する。
- **API エラー（4xx/5xx）**: ストリームではなく通常の JSON エラーが返る可能性がある。最初のレスポンスで `Content-Type` や status を確認し、エラー時は body を JSON として読んで表示する。
- **AbortController**: ページ離脱時や「キャンセル」ボタンで `abort()` を呼び、未処理のストリームを閉じる。

---

## CORS

- ブラウザから Mastra API（別オリジン）へ **直接** `fetch` する構成（選択肢 A）のままの場合、ストリーミングでも **同じ CORS 設定** でよい。
- `Access-Control-Allow-Origin` 等が `generate` と同様に付いていれば、`/stream` への POST もプリフライト（OPTIONS）と本リクエストが通る。
- もしストリーミングでだけ CORS エラーが出る場合は、Mastra 側で `text/event-stream` や chunked レスポンス時にも CORS ヘッダーが付与されているか確認する。

---

## 実装タスク（チェックリスト）

以下を [frontend-implementation-plan.md](./frontend-implementation-plan.md) の該当フェーズに組み込むか、別タスクとして実施する。

- [x] **分析 UI（手牌入力・画像アップロード後の分析）**
  - [x] 分析実行は `useChat` の `sendMessage` で `/api/chat` に送る
  - [x] ストリーム中のテキストは `messages` の最後の assistant から取得し、`AnalysisResult` で表示
  - [x] キャンセルは `stop()` で対応

- [ ] **エラーハンドリング**
  - [ ] ストリーム途中のエラーで state を不整合にしない（例: エラー時は「途中まで表示 + エラーメッセージ」）
  - [ ] 4xx/5xx でストリームでないレスポンスが返った場合のパースと表示

- [ ] **Phase 4 以降（imageRecognitionAgent）**
  - [ ] 画像認識結果の説明文もストリーミングで表示する場合、別エージェント用に useChat の api を切り替えるか、専用ルートを検討する

---

## 参照

- [Mastra – Streaming Events](https://mastra.ai/docs/streaming/events)（イベント種別・ペイロード）
- [ARCHITECTURE.md](../ARCHITECTURE.md) — Mastra エンドポイント一覧
- [docs/cors-strategy.md](./cors-strategy.md) — CORS 選択肢 A（API 側で CORS 許可）
- [docs/frontend-implementation-plan.md](./frontend-implementation-plan.md) — 全体の実装計画。ストリーミングは本ドキュメントのタスクを Phase 2/3 に組み込む

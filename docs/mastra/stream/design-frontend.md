# フロントエンドと Mastra ストリームの設計

## 1. Mastra のストリーム仕様（公式）

[events.md](./events.md) より:

- **Agent**.stream() で発生するイベント: `start`, `step-start`, **`text-delta`**, `tool-call`, `tool-result`, `step-finish`, `finish`
- **text-delta**: LLM が生成したテキストの増分（本来は逐次送られる想定）
- 各イベントは `type`, `from`, `payload` などを持つ

## 2. 実際の HTTP API で観測した形式

Next.js プロキシ経由で Mastra API の `/stream` を叩いたとき:

- **Content-Type**: `text/plain; charset=UTF-8`
- **形式**: 1行1JSON（NDJSON）。行頭に `data:` は付かない場合あり
- **流れ**: 約975行。先頭は `start`, `step-start`, `tool-call` 系が多数
- **本文の届き方**: **text-delta は観測されず**、最後の方のイベントで `payload.output.text` に**全文（約1400文字）がまとめて入る**
  - 例: `type` が `step-finish` や `finish` に近いイベントで `payload.output.text` に本文が入る

## 3. フロントの扱い

### 3.1 クライアント（mastra-client.ts）

- **パース**: 改行で分割し、各行を JSON としてパース（`data:` プレフィックスがあれば除去）
- **テキスト取り出し** `getTextDeltaFromEvent()` で次の形式に対応:
  1. **payload.output.text** … 実際に観測している形式（run 完了時に全文が入る）
  2. **role + content** … `{ role: "assistant", content: "..." }`
  3. **type === "text-delta"** … `payload.textDelta` または `payload.delta`（将来 API が送る場合用）
  4. **agent-execution-event-text-delta** … ネットワーク経由時のネストした text-delta

- **コールバック**: 取り出した文字列を `onTextDelta(delta)` で都度渡す

### 3.2 ページ（page.tsx）ストリーム表示

- **受信**: `onTextDelta` で受け取った文字列を `pendingTextRef.current` に追記
- **表示**: 一定間隔（例: 28ms）の setInterval で、`resultText` を `pendingTextRef.current` の先頭から少しずつ伸ばして `setResultText`（擬似ストリーミング）
- **理由**: 現状 API は text-delta を送らず最後に `payload.output.text` でまとめて送るため、フロントで「受け取った全文を少しずつ表示」してストリーム風に見せる

### 3.3 注意点

- **キャンセル時**: インターバルは止めない。`pendingTextRef` と `resultText` だけ「キャンセルされました」で確定させる。インターバルを止めると次回送信で表示が更新されなくなる。
- **STREAM_DEBUG**: 調査用ログ。本番では `false` にすること。

## 4. 今後の改善案

- **バックエンド**: Mastra の HTTP ストリームで **text-delta** が逐次送られるようにすれば、フロントは `onTextDelta` でそのまま追加表示するだけで済む（擬似ストリーミング不要）
- **フロント**: API が text-delta を送るようになったら、`payload.output.text` は「最後のまとめ」用に残しつつ、text-delta を優先して表示する

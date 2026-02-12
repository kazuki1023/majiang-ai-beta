# フロントエンド コードレビュー

凝縮度・変更容易性・拡張性・レンダリング最適化の観点から現状の `frontend/` を評価する。

---

## 1. 凝縮度（Cohesion）

### 良い点

- **features / components の分離**: `features/analysis` が Server の薄いラッパー（`AnalysisPage`）のみを持ち、`components/analysis` に UI を集約している。責務が分かれている。
- **Container / Presentation の分離**: `ShoupaiInput`（状態・ロジック）と `ShoupaiInputForm`（見た目）が明確に分かれており、`buildAnalysisMessage` などのドメインロジックが Container に閉じている。
- **ドメイン別コンポーネント**: `shoupai/`（TileButton, FengButtonGroup, BaopaiSelector）, `ui/`（Dialog, Tabs）, `analysis/`, `ImageUpload/` と、役割ごとにフォルダが分かれており、関連するコードがまとまっている。
- **hooks の集約**: `useAnalysisChat` が AI-SDK 依存を隠蔽し、`useImageRecognition` が画像認識の状態遷移を一箇所に持っている。チャット状態・メッセージ抽出が hook に凝縮されている。

### 改善の余地

- **utils の配置が二重**: 日付ユーティリティが `utils/date.ts` にあり、`lib/` には `shoupai-utils` などがある。**「ドメイン寄り → lib」「汎用・テストしたい小さな関数 → utils」** のように方針を一本化すると、どこに何を書くか迷いにくくなる（例: `lib/utils/date.ts` に統一するか、`utils/` を「純粋関数・テスト対象」の置き場と明文化するか）。
- **chat-message-utils の置き場所**: 計画では `features/analysis/` 配下の想定だが、現状は `utils/chat-message-utils.ts`。AI-SDK 型に依存するため **features/analysis** に寄せると、分析機能の凝縮度がさらに上がる。
- **ShoupaiDisplay の型**: `ShoupaiDisplay` は `ShoupaiString` を受け、`BaopaiSelector` 側は `baopai.join("")` で文字列を渡している。型としては `ShoupaiString` と `string` の関係を型定義で明示しておくと、同じ「手牌表現」であることが読み手に伝わりやすい。

---

## 2. 変更容易性（Modifiability）

### 良い点

- **依存の向きが一方向**: `app/page` → `features/analysis` → `components/analysis`。features が components を import し、逆はない。変更時の影響範囲が追いやすい。
- **API ルートの分離**: `app/api/chat`, `upload`, `generate/[...path]` が独立しており、エンドポイント単位で変更しやすい。
- **型の集約**: `types/` で domain / api / chat-ui / errors 等が分かれており、型変更時に参照箇所を追いやすい。
- **UI 部品の再利用**: Dialog, Tabs が `components/ui` にあり、スタイルや挙動を変えるときは 1 ファイルの変更で済む。

### 改善の余地

- **AnalysisPageContent の責務がやや多い**: タブ状態・チャット hook・送信ハンドラ・エラー表示・結果表示を一手に抱えている。タブの状態だけ別 hook（`useTab`）にしたり、「分析結果ブロック」を `AnalysisResultSection` のような子コンポーネントに切り出したりすると、**「タブだけ変えたい」「結果表示だけ変えたい」** ときの変更が局所化できる。
- **定数・ラベルの散在**: `TAB_IMAGE` / `TAB_MANUAL` は `AnalysisPageContent` 内、`ZHUANGFENG_LABELS` 等は `@/types`。タブ ID など UI に近い定数は `components/analysis/constants.ts` や feature 側に寄せると、変更時に探しやすい。
- **エラーハンドリングの一貫性**: `useAnalysisChat` の `error` と `ImageUpload` 内の `state.errorMessage` が別経路。表示は `ChatErrorAlert` とインラインの `role="alert"` に分かれる。**「エラー表示の仕様を変える」** ときは、両方の経路を触ることになる。エラー表示を共通コンポーネント＋メッセージの型で揃えると変更が楽になる。

---

## 3. 拡張性（Extensibility）

### 良い点

- **ルート構造の余地**: `app/` 直下に `page.tsx` のみだが、`docs/frontend-refactoring-plan.md` の `(public)` / `(auth)` のようなルートグループを後から追加しやすい。
- **分析入力の差し替え**: 写真タブと手入力タブが `Tabs` で切り替わるだけで、`handleSubmit` が共通。新しい入力方法（例: 棋譜 URL）を増やすときは、タブとパネルを追加するだけで済む。
- **型の共通化**: `Feng`, `TileId`, `ShoupaiString` などが `types/` で定義され、mastra と共有する設計になっており、バックエンドとの契約変更に追従しやすい。

### 改善の余地

- **features が analysis のみ**: 画像認識は `hooks/use-image-recognition` にあり、feature としては `features/image-recognition` にまとめると、**「認証」「課金」「利用回数」** などを feature 単位で足しやすくなる。
- **レイアウト・メタデータ**: `layout.tsx` が単一。将来、公開用 / 認証用でレイアウトを分けるなら、ルートグループごとの `layout.tsx` を用意する拡張が自然。
- **API クライアントの抽象化**: `mastra-client`, `useChat` の API が直接使われている。**「リトライ」「タイムアウト」「ログ」** などを足すなら、`lib/api/` に薄いクライアント層を設けると拡張しやすい。

---

## 4. レンダリング最適化（Rendering）

### 良い点

- **ルートは Server Component**: `app/page.tsx` は `"use client"` がなく、`AnalysisPage` を import している。クライアントバンドルに page 直下のロジックが含まれない。
- **features/analysis が薄い**: `AnalysisPage` は `AnalysisPageContent` を返すだけなので、クライアント境界が「1 つの Client コンポーネント」に集約されている。
- **loading / error**: `app/loading.tsx`, `app/error.tsx` があり、サスペンス・エラーバウンダリの受け皿が用意されている。

### 改善の余地

- **AnalysisPageContent の再レンダー範囲**: `useAnalysisChat()` の戻り値（`chatState`, `resultText`, `error`, `handleSubmit`, `handleCancel`）が変わるたびに `AnalysisPageContent` 全体が再レンダーされる。**ストリーミング中**は `resultText` が頻繁に変わるため、以下のような分割が有効。
  - **結果表示だけ**を `React.memo` した `AnalysisResult` に `content={resultText}` で渡し、親の他の state（タブなど）が変わっても `resultText` が同じなら再レンダーを避ける。
  - あるいは **結果エリア**を `resultText` / `isStreaming` に依存する小さなサブツリーに切り、それ以外（タブ・入力欄・ステータスバー）と state を分離する。
- **ShoupaiInput の state 数**: `ShoupaiInput` 内で 7 つの `useState` がある。タブ切り替えで「手で入力」を開いたときも、**画像タブ側の state** はそのままなので、不要な再レンダーは主に「同じコンポーネント内の state 更新」に限られる。ただし **入力フォーム全体**が 1 コンポーネントなので、`ShoupaiInputForm` を `React.memo` し、props が変わらない子（例: 場風・自風が同じで `selectedTiles` だけ変わった場合）の再レンダーを減らす余地はある。現状の入力レスポンスで問題になっていなければ優先度は低い。
- **ImageUpload 内の ShoupaiInput**: 認識結果表示で `key={state.recognizedShoupaiString}` により、認識結果が変わるたびに ShoupaiInput がアンマウント・再マウントされる。意図したリセットであり、不要な子の更新は避けられている。
- **Markdown レンダリング**: `AnalysisResult` → `MarkdownContent` でストリーミング中は `content` が何度も変わる。`react-markdown` は内部で差分を扱うため、過度な最適化は不要だが、**非常に長い結果**になる場合は仮想化や「ストリーミング中はプレーンテキスト、完了後に Markdown」などの段階表示も選択肢になる。

---

## 5. まとめ表

| 観点           | 評価 | 主な強み | 主な改善余地 |
|----------------|------|----------|----------------|
| 凝縮度         | 良い | features/components/hooks の分離、Container/Presentation | utils 配置の統一、chat-message-utils の feature 寄せ |
| 変更容易性     | 良い | 依存方向が一方向、型・API の分離 | AnalysisPageContent の分割、エラー表示の一本化 |
| 拡張性         | 良い | タブによる入力差し替え、型の共通化 | features の整理（image-recognition）、API 層の抽象化 |
| レンダリング   | やや要検討 | ルートは Server、クライアント境界が明確 | ストリーミング時の結果部分の memo/分割、必要に応じた ShoupaiInputForm の memo |

---

## 6. 推奨アクション（優先度順）

1. **utils と lib の役割を明文化**  
   - 例: `utils/` = 純粋関数・テストしやすいもの、`lib/` = インフラ・ドメイン寄り。`getDatePrefix` のようにテストを書いたものはどちらかに統一する。

2. **chat-message-utils を features/analysis に移動**  
   - 分析機能の凝縮度を上げる。`useAnalysisChat` が同じ feature 内のユーティリティを参照する形にする。

3. **AnalysisPageContent の軽い分割**  
   - 「結果表示ブロック」を子コンポーネント化し、`resultText` / `isStreaming` に依存する部分を狭くする。必要なら `React.memo` で結果コンポーネントの不要な再レンダーを抑制。

4. **エラー表示の一本化（中〜長期）**  
   - チャットエラーと画像認識エラーを共通の型・共通コンポーネントで扱うと、仕様変更時の変更箇所が減る。

5. **features/image-recognition の検討（拡張時）**  
   - 認証・課金・利用回数などを feature 単位で足すなら、`use-image-recognition` と関連型を `features/image-recognition` に移すと一貫する。

このレビューは `docs/frontend-refactoring-plan.md` の方針と整合するようにしている。計画の §11 に従い、変更時は必要に応じて本ドキュメントを更新するとよい。

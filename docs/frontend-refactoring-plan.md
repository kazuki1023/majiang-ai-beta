# フロントエンド リファクタリング計画

変更に強く、凝縮度が高く結合度が低い設計を目指す。ログイン・課金・権限の拡張と、use client/use server の明確な分離、レンダリング効率の改善を含む。

---

## 1. 現状の問題整理

### 1.1 ディレクトリ・責務

| 問題 | 場所・内容 |
|------|------------|
| ページにロジック・描画・状態が集中 | `app/page.tsx` に useChat、toChatUIState、getMessageText、handleSubmit、UI が同居 |
| AI-SDK 依存がページ直下に露出 | `toChatUIState(status)`、`getMessageText(message)` が page 内に定義 |
| 汎用関数がページに直書き | 上記や「最後の assistant メッセージ取得」が page 専用になっている |
| ルートがフラット | `app/` 直下に page のみ。将来の `/login`、`/settings`、`/billing` や権限による分岐が考えられていない |

### 1.2 コンポーネント

| 問題 | 場所・内容 |
|------|------------|
| Dialog と Selector が一体 | `BaopaiSelector.tsx` にトリガー UI と `<dialog>` が同居。テスト・再利用・責務分離がしづらい |
| タブと入力の責務混在 | 写真/手入力のタブ切り替えと、各入力の状態が page でだけつながっている |

### 1.3 クライアント／サーバー・レンダリング

| 問題 | 内容 |
|------|------|
| use server 未使用 | Server Actions がなく、API Route 経由のみ。フォーム送信・楽観的更新などのパターンが使えていない |
| 全ページ "use client" | `page.tsx` が client のため、ルート自体がクライアントバンドルに含まれる |
| 先行取得・表示最適化なし | 写真タブ選択時やアップロード直後に「34枚表示」用のデータを先に取るなどの設計がない |

---

## 2. 目標とするディレクトリ構成（拡張性・権限を考慮）

```
frontend/
├── app/
│   ├── (public)/                    # 認証不要（または共通レイアウト）
│   │   ├── layout.tsx               # 公開用レイアウト（将来: ヘッダー・ナビ）
│   │   └── page.tsx                 # 現トップ: 手牌分析（薄いコンポーザー）
│   ├── (auth)/                      # 認証必要（将来）
│   │   ├── layout.tsx               # 認証チェック・リダイレクト
│   │   ├── dashboard/
│   │   └── settings/
│   ├── (marketing)/                 # ランディング等（将来）
│   ├── api/                         # 現状維持 + 権限・レート制限の層を追加しやすい形に
│   │   ├── chat/
│   │   ├── upload/
│   │   └── generate/
│   ├── layout.tsx                   # ルートレイアウト（フォント・Toast 等）
│   └── globals.css
├── components/
│   ├── ui/                          # 汎用UI（Dialog, Tabs, Button 等）
│   │   ├── Dialog/
│   │   ├── Tabs/
│   │   └── ...
│   ├── analysis/                    # 分析機能に特化
│   │   ├── AnalysisResult.tsx
│   │   ├── ChatStatusBar.tsx        # 分析中... / キャンセル（page から分離）
│   │   └── ...
│   ├── shoupai/                     # 手牌入力・表示ドメイン
│   │   ├── ShoupaiDisplay/
│   │   ├── ShoupaiInput/
│   │   ├── BaopaiSelector/          # トリガーのみ。中身は BaopaiDialog
│   │   └── ...
│   └── image-upload/                # 写真アップロード・認識
│       ├── ImageUpload.tsx
│       ├── ConfirmDialog.tsx
│       └── ...
├── features/                        # 機能単位の「状態 + UI + サーバー呼び出し」
│   ├── analysis/
│   │   ├── use-analysis-chat.ts     # useChat ラップ + toChatUIState, getMessageText
│   │   ├── chat-message-utils.ts    # getMessageText 等（AI SDK 型に依存する純粋関数）
│   │   └── types.ts                 # ChatUIState 等
│   └── image-recognition/
│       ├── use-image-recognition.ts # アップロード→認識の状態機械
│       └── types.ts
├── lib/                             # インフラ・純粋ユーティリティ（SDK 非依存を推奨）
│   ├── api/                         # API クライアント（fetch の薄いラップ）
│   │   ├── chat.ts                  # 必要なら /api/chat 用の型付きクライアント
│   │   ├── upload.ts
│   │   └── mastra-client.ts         # generate 系（現 mastra-client を移動）
│   ├── gcs-client.ts
│   ├── shoupai-utils.ts
│   ├── markdown-renderer.tsx
│   └── url.ts
├── hooks/                           # 汎用 hooks（機能非依存）
│   └── (useDebounce 等、必要に応じて)
├── types/
└── server/                          # Server Actions とサーバー専用ユーティリティ（将来）
│   ├── actions/
│   │   └── upload.ts                # 例: uploadImageAction()
│   └── auth.ts                      # 例: getSession(), requireAuth()
```

- **ルートグループ** `(public)` / `(auth)` で、認証要否とレイアウトを分け、将来の権限設計（未ログインは分析回数制限、課金で制限緩和など）を入れやすくする。
- **features/** に「分析チャット」「画像認識」といった機能ごとの状態・AI-SDK 依存・型」を集約し、page は「features を組み合わせる薄いコンポーザー」にする。
- **components/ui** に汎用 UI（Dialog 等）を置き、**components/shoupai** などドメイン別に分けることで、責務と変更範囲を限定する。

---

## 3. use client / use server の切り分け

### 3.1 方針

- **app/page.tsx（ルート）**: 可能な限り Server Component のままにし、子で Client Component を import。
- **データ取得・ミューテーション**: サーバーで完結するものは Server Action に寄せ、クライアントは「呼び出すだけ」にする。
- **AI-SDK（useChat）**: クライアント専用のため、`features/analysis/use-analysis-chat.ts` のような custom hook に閉じ込める。

### 3.2 具体的な分離

| 役割 | 置き場所 | クライアント/サーバー |
|------|----------|------------------------|
| ルートページのレイアウト・メタデータ | `app/(public)/page.tsx` | Server（子で client を import） |
| 分析チャット（useChat, status → UI state） | `features/analysis/use-analysis-chat.ts` | client（hook） |
| メッセージテキスト抽出（AI SDK 型依存） | `features/analysis/chat-message-utils.ts` | 純粋関数（client から import） |
| 画像アップロード API 呼び出し | 現状どおり `app/api/upload` | server（API Route） |
| 画像アップロード後の認識 | `lib/api/mastra-client.ts` を client から利用 | client（将来、Server Action で wrap も可） |
| アップロード処理の Server Action 化（任意） | `server/actions/upload.ts` | server（form action で使う場合） |

### 3.3 ルートページの理想形（イメージ）

```tsx
// app/(public)/page.tsx — Server Component（"use client" を書かない）
import { AnalysisPageClient } from "@/features/analysis/analysis-page-client";

export default function Home() {
  return <AnalysisPageClient />;
}
```

```tsx
// features/analysis/analysis-page-client.tsx — "use client"
// useAnalysisChat(), タブ状態, エラー表示, AnalysisResult などはここに集約
```

こうすると、ルートはサーバーでレンダリングされ、分析機能のバンドルはクライアントで必要な部分だけに限定できる。

---

## 4. レンダリング効率の改善（牌表示・先行取得）

### 4.1 現状

- 写真タブ選択 → ユーザーがファイル選択 → アップロード → 認識 → 34枚表示。
- 手入力タブでは最初から ShoupaiInput がマウントされている可能性があり、タブ非表示でも重い場合は無駄になりうる。

### 4.2 改善案

1. **写真タブ選択時の先行準備**
   - 写真タブを選択した時点で、画像認識用のワーカーや静的アセット（牌画像など）の preload を開始する。
   - まだファイルが無くても、`/api/upload` や認識エンドポイントの「存在チェック」や軽い prefetch は行わず、**牌画像（m0.gif 等）の preload** に留めると安全で効果的。

2. **牌画像のプリロード**
   - `ShoupaiDisplay` や `TileButton` で使う牌画像を、写真タブ表示時（またはアプリ初回マウント時）に `link rel="preload"` または Image で事前読み込みするモジュールを用意する。
   - 例: `lib/preload-tile-images.ts`（client）で、必要な `pai/*.gif` を一括 preload。

3. **34枚表示の遅延表示とスケルトン**
   - 認識結果が返る前に「34枚分のプレースホルダー（スケルトン）」を出し、取得できた牌から順に実タイルに差し替える方式は、API が「部分結果」を返さない限り難しい。
   - 現実的には「認識中はスピナー＋メッセージ」、「認識完了後に一括で ShoupaiDisplay」のままでもよい。そのうえで **牌画像の preload** により、表示のガタつきを減らす。

4. **タブとマウントの最適化**
   - タブを「写真」「手入力」で切り替えている場合、非表示タブの内容を `display: none` で隠すのではなく、**タブごとにマウント/アンマウント**（条件付きレンダリング）にすると、手入力タブ未使用時は ShoupaiInput をマウントしないで済む。
   - 逆に「最初から両方マウントして表示だけ切り替え」にすると、写真タブ選択時点で手入力側の牌選択 UI も初期化されているため、タブ切り替えが速い。トレードオフなので、初期は「タブごとにマウント」で軽くし、体感が悪ければ両方マウントに変更する程度でよい。

5. **画像認識の並列化・キャンセル**
   - 既存の `runIdRef` によるキャンセルは維持する。
   - 複数写真を並列で認識する機能を将来つける場合は、AbortController でリクエストをキャンセルできるようにする。

---

## 5. page.tsx のリファクタリング（責務の分離）

### 5.1 抽出するもの

| 現在の場所 | 抽出先 | 内容 |
|------------|--------|------|
| page 内の toChatUIState, ChatUIState | `features/analysis/types.ts` | 型定義 |
| toChatUIState(status) | `features/analysis/use-analysis-chat.ts` または `chat-message-utils.ts` 隣の `chat-ui-state.ts` | AI SDK の status → UI 状態 |
| getMessageText(message) | `features/analysis/chat-message-utils.ts` | UIMessage → 表示用テキスト（AI SDK 型に依存） |
| useChat + lastAssistantMessage + resultText | `features/analysis/use-analysis-chat.ts` | 戻り値に chatState, resultText, handleSubmit, handleCancel, error を含める |
| 分析中バー（分析中... / キャンセル） | `components/analysis/ChatStatusBar.tsx` | props: chatState, onCancel |
| エラー表示 | `components/analysis/ChatErrorAlert.tsx` または共通 `components/ui/Alert.tsx` | props: error |

### 5.2 リファクタ後の page（イメージ）

- `app/(public)/page.tsx`: Server Component。`<AnalysisPageClient />` をレンダーするだけ。
- `features/analysis/analysis-page-client.tsx`:
  - `useAnalysisChat()` を呼ぶ。
  - タブ状態はここで持つ。
  - `ChatStatusBar` / エラー / `AnalysisResult` / タブ内に `ImageUpload` と `ShoupaiInput` を配置。  
  - ロジックはほぼ hook と UI コンポーネントに移り、page は「組み立て」だけになる。

---

## 6. BaopaiSelector と Dialog の分離

### 6.1 問題

- `BaopaiSelector.tsx` に「トリガー（クリックで開くボタン風 UI）」と「モーダル（dialog 内の選択・追加・削除）」が同居している。
- Dialog のスタイル・フォーカス管理・アクセシビリティを別コンポーネントで再利用しづらい。

### 6.2 方針

1. **汎用 Dialog を components/ui に用意**
   - `components/ui/Dialog/Dialog.tsx`: `open`, `onOpenChange`, `title`, `children`, `footer` などを受け取る。
   - 内部で `<dialog>` を使い、閉じるボタン・Esc・オーバーレイクリックで `onOpenChange(false)` を呼ぶ。
   - 必要なら Radix 等の Headless UI を採用してもよい。

2. **BaopaiSelector は「トリガー + 開閉状態」のみ**
   - `BaopaiSelector`: ラベル「ドラ表示牌」、現在の牌表示（ShoupaiDisplay）、枚数、クリックで `onOpenChange(true)`。
   - `open` / `onOpenChange` を props で受け取り、内部で state を持つか、親が持つかは選択可能（Controlled 推奨でテストしやすい）。

3. **BaopaiDialog（または BaopaiSelectorModal）を別ファイルに**
   - 中身: 選択済み一覧（削除可能）、牌ボタンで追加、閉じるボタン。
   - props: `baopai`, `onBaopaiChange`, `open`, `onOpenChange`。
   - `BaopaiSelector` は「トリガー」と「BaopaiDialog」を組み合わせて表示するラッパーとして残すか、あるいは呼び出し側で `<BaopaiSelector />` と `<BaopaiDialog />` を並べて使う形でもよい。

4. **ファイル分割案**
   - `components/ui/Dialog/Dialog.tsx` — 汎用
   - `components/shoupai/BaopaiSelector/BaopaiSelector.tsx` — トリガー + 開閉 state（または Controlled）
   - `components/shoupai/BaopaiSelector/BaopaiDialog.tsx` — モーダル内の選択 UI
   - `components/shoupai/BaopaiSelector/index.ts` — BaopaiSelector を export（必要なら BaopaiDialog も）

これで「Dialog の仕様変更」と「ドラ選択の仕様変更」の影響範囲が分離され、凝縮度が高く結合度が低くなる。

---

## 7. 実施順序の提案（段階的リファクタ）

**やることとして明示している項目**（以下に Phase で記載。優先度の都合で SP 向けは低めのものもあるが、実施する）。

1. **Phase 1: 責務の分離（page と AI-SDK）＋ 堅牢性**
   - `features/analysis/` を作成し、`chat-message-utils.ts`（getMessageText）、`toChatUIState`、`use-analysis-chat.ts`（useChat ラップ）を追加。
   - `AnalysisPageClient` を新設し、page からロジックを移す。page は Server のまま `<AnalysisPageClient />` のみに（または一旦 "use client" のままでも可）。
   - 分析中バー・エラー表示を小さなコンポーネントに切り出す。
   - **エラー境界・ローディング**: `app/error.tsx` を追加し、ルートで未捕捉エラーをキャッチしてフォールバック UI を表示する。必要なら `(public)/error.tsx` も。ルートを Server Component 化したあと、データ取得・認証を挟む場合は `loading.tsx` でスケルトンやスピナーを出せるようにする。

2. **Phase 2: API 共通化 ＋ UI の共通化と Baopai の分離**
   - **API Route・環境変数の一貫性**: `lib/api/mastra-proxy.ts`（または同等）を用意し、chat と generate の URL 組み立て・fetch・エラーハンドリングを共通化。環境変数は両 Route で `MASTRA_URL ?? MASTRA_API_URL` に統一するか、`getMastraBaseUrl()` のような共通取得に寄せる。Route は「path と body を渡すだけ」にする。
   - `components/ui/Dialog` を実装。**ダイアログ・アクセシビリティ**（優先度は低いが実施する）: フォーカス trap（focus-trap-react 等）、Escape で閉じる、オーバーレイクリックで閉じるを実装。ConfirmDialog と BaopaiDialog はこの Dialog を利用する。
   - `BaopaiDialog` を分離し、`BaopaiSelector` はトリガー + Dialog の組み合わせに変更。

3. **Phase 3: ディレクトリ再編 ＋ コンポーネント・定数の整理**
   - `app/(public)/` を導入し、現 `page.tsx` を移動。
   - `components/` を `ui/`, `analysis/`, `shoupai/`, `image-upload/` に整理（既存 import を一括置換）。
   - **TileButton の共通配置**: `TileButton` を `components/shoupai/TileButton/` に移し、`ShoupaiDisplay` と `ShoupaiInputForm` の両方から import する（ShoupaiDisplay が ShoupaiInput に依存しないようにする）。
   - **定数の集約**: ゲームルールに近い定数（`MAX_HAND`、`TILES_PER_TYPE`、`XUN_MIN`/`XUN_MAX`、`ZHUANGFENG_LABELS`、`MENFENG_LABELS` 等）を `types/domain.ts`（またはその付近）に集約し、単一の真実の源にする。
   - **LabeledButtonGroup の名前**: 自風・場風専用のボタン群であることを名前で表す（例: `FengButtonGroup` や `ZhuangfengMenfengSelector` などにリネームする）。

4. **Phase 4: レンダリング効率 ＋ ImageUpload の状態整理**
   - 牌画像の preload を追加。
   - タブのマウント方針（表示タブだけマウント vs 両方マウント）を決めて実装。
   - **ImageUpload の状態機械**: `features/image-recognition/use-image-recognition.ts` に移す際、状態を「idle | uploading | recognizing | recognized | error」に限定し、遷移を関数で明示する（型で遷移表を書くだけでも可読性が上がる）。

5. **Phase 5: 認証・権限の土台（将来）**
   - `app/(auth)/` と `server/auth.ts` のスケルトンを追加。
   - API Route に「未認証は回数制限」などの middleware やラッパーを検討。

**その他・実施方針**
- **ToastContainer**: 将来的に必要になる想定のため、**削除せずコメントアウトで残す**（`layout.tsx` のレンダーをコメントアウト。依存 `react-toastify` は残しておいてよい）。使う場合は「エラー時トースト」「分析完了トースト」などを features/analysis から呼ぶ形にする。
- **型・バリデーション（送信前 Zod 等）**: リファクタというより機能追加のため、**一旦今回はやらない。リファクタを終えてから**、`types/zod` の gameStateSchema 等を使った送信前バリデーションを追加する。
- **テスト・ドキュメント（単体テスト・README の構成追記）**: **最後に実装する。今はまだやらない。**

---

## 9. その他の改善候補

計画書の主軸以外に、コードベースを確認して見つかった改善ポイントをまとめる。

### 9.1 API Route・環境変数の一貫性

**実施方針**: 実施する（Phase 2）。

| 問題 | 場所 | 提案 |
|------|------|------|
| 環境変数名の不一致 | chat は `MASTRA_URL ?? MASTRA_API_URL`、generate は `MASTRA_API_URL` のみ参照 | 両方で `MASTRA_URL ?? MASTRA_API_URL` に統一するか、`getMastraBaseUrl()` を定義し両 Route から import |
| プロキシ用の共通処理 | chat と generate で URL 組み立て・fetch・エラーハンドリングが重複 | `lib/api/mastra-proxy.ts` のような共通ラッパーを用意し、Route は「path と body を渡すだけ」にすると変更に強くなる |

### 9.2 コンポーネントの依存関係

**実施方針**: 実施する（Phase 3）。定数は **domain.ts に集約**する方針（単一の真実の源としてきれい）。

| 問題 | 内容 | 提案 |
|------|------|------|
| ShoupaiDisplay → ShoupaiInput | `ShoupaiDisplay` が `@/components/ShoupaiInput/TileButton` を import している。表示専用が入力用フォルダに依存 | `TileButton` を `components/shoupai/TileButton/` に移し、`ShoupaiDisplay` と `ShoupaiInputForm` の両方から import する |
| 定数の散在 | `MAX_HAND`、`TILES_PER_TYPE`、`XUN_MIN`/`XUN_MAX` が `ShoupaiInputForm` 内。`ZHUANGFENG_LABELS` 等は Form と ShoupaiInput の `buildAnalysisMessage` で参照 | ゲームルールに近い定数は **`types/domain.ts`（またはその付近）に集約**し、単一の真実の源にする |

### 9.3 ダイアログ・アクセシビリティ

**実施方針**: 実施する（Phase 2）。SP がメインなので優先度は低いが、汎用 Dialog 実装時に一緒に対応する。

| 問題 | 場所 | 提案 |
|------|------|------|
| ConfirmDialog のフォーカス・キーボード | `ConfirmDialog` は `div` + `role="dialog"`。フォーカス trap、Escape で閉じる、オーバーレイクリックで閉じるが未実装 | 汎用 `components/ui/Dialog` を Phase 2 で作る際、フォーカス trap（focus-trap-react 等）と Escape / オーバーレイ閉じを実装する。ConfirmDialog と BaopaiDialog はその Dialog を利用する |
| ネイティブ dialog との棲み分け | BaopaiSelector は `<dialog>`、ConfirmDialog は `<div>`。挙動が混在している | 計画どおり汎用 Dialog に寄せ、どちらも同じパターンにするとテストとアクセシビリティの担保がしやすい |

### 9.4 未使用・死んでいるコード

**実施方針**: **コメントアウトで残す**。将来的にトーストが必要になる想定のため、削除せず `layout.tsx` の `ToastContainer` レンダーをコメントアウトする。依存 `react-toastify` は残しておく。使う場合は features/analysis から `toast()` を呼ぶ形にする。

| 問題 | 内容 | 提案 |
|------|------|------|
| ToastContainer | `layout.tsx` で `ToastContainer` をレンダーしているが、どこからも `toast()` を呼んでいない | コメントアウトで残す。使う場合は「エラー時トースト」「分析完了トースト」などを features/analysis から呼ぶ形にするとよい |

### 9.5 エラー処理・ルートレベルの堅牢性

**実施方針**: 実施する（Phase 1）。

| 問題 | 内容 | 提案 |
|------|------|------|
| エラー境界 | ルートや分析画面に Error Boundary がない。子コンポーネントで throw すると画面全体が落ちる | `app/error.tsx` を追加し、ルートで未捕捉エラーをキャッチしてフォールバック UI を表示する。必要なら `(public)/error.tsx` も |
| ローディング状態 | ルートに `loading.tsx` がない（現状はクライアントのみなので必須ではない） | ルートを Server Component 化したあと、データ取得や認証チェックを挟む場合は `loading.tsx` でスケルトンやスピナーを出せる |

### 9.6 型・バリデーション

**実施方針**: **一旦今回はやらない。** リファクタというより機能追加のため、リファクタを終えてから実施する。

| 問題 | 内容 | 提案 |
|------|------|------|
| クライアント入力の検証 | 手牌 13/14 枚、巡目 1–18 などは UI で制限しているが、API に送る前に Zod 等で検証していない | リファクタ後に `types/zod` の `gameStateSchema` 等を活用し、送信前にバリデーションを追加する |
| ShoupaiString の runtime 検証 | 画像認識結果や手入力文字列をそのまま API に渡している。不正な形式が混ざるとバックエンドでエラーになりやすい | 同上。リファクタ後に ShoupaiString の pattern チェック（Zod 等）をかける |

### 9.7 LabeledButtonGroup の名前

**実施方針**: 実施する（Phase 3）。汎用化ではなく **名前を治す**。自風・場風専用のボタン群なので、コンポーネント名をそれに合わせる（例: `FengButtonGroup`、`ZhuangfengMenfengSelector` など）。

| 問題 | 内容 | 提案 |
|------|------|------|
| 名前が汎用的 | `LabeledButtonGroup` は実際には自風・場風専用。型が Feng に固定されている | 自風・場風専用であることを名前で表す（リネーム）。ジェネリック化は不要 |

### 9.8 ImageUpload の状態機械

**実施方針**: 実施する（Phase 4）。`features/image-recognition/use-image-recognition.ts` に移す際に状態を型で明示し、遷移を関数でまとめる。

| 問題 | 内容 | 提案 |
|------|------|------|
| 状態が useState の羅列 | phase, gcsUri, recognizedShoupaiString, error などがバラバラ。どの遷移が許されるかがコードを読まないと分かりにくい | 状態を idle / uploading / recognizing / recognized / error に限定し、遷移を関数で明示する（型で遷移表を書くだけでも可読性が上がる） |

### 9.9 テスト・ドキュメント

**実施方針**: **最後に実装する。今はまだやらない。**

| 問題 | 内容 | 提案 |
|------|------|------|
| 単体テストがない | フロントにテストファイルが見当たらない | リファクタ完了後に、`lib/shoupai-utils.ts` や `chat-message-utils`、`toChatUIState` からユニットテストを追加。コンポーネントは共通 Dialog や BaopaiSelector から優先するとよい |
| README | フロントの README はあるが、環境変数や起動手順以外の「構成・責務」は少ない | リファクタ後に「ディレクトリの責務」「features の読み方」を短く追記すると、新規参加者が迷いにくい |

---

## 10. まとめ

- **変更に強くする**: 機能を `features/`、UI を `components/ui` とドメイン別に分け、AI-SDK や useChat は page から hook に閉じ込める。
- **凝縮度を高く**: 1ファイル・1モジュールの責務を明確にし（例: BaopaiSelector と Dialog の分離）、関連するものは同じ feature やドメインにまとめる。
- **結合度を低く**: page は「features と components を組み合わせるだけ」にし、汎用関数・型は features または lib に置き、相互依存を減らす。
- **拡張性**: ルートグループと `server/` で認証・課金・権限の拡張を想定した構成にし、API は「認証コンテキスト」を渡しやすい形にしておく。

この順序で進めれば、既存動作を壊さずに段階的にリファクタリングできる。

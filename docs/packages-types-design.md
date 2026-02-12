# packages/types 設計案 — ドメイン定義から型・バリデーション・AIルールを生成

## 1. 目的

- **一つのドメイン定義**から以下を生成する:
  1. **型** → `mastra/src/mastra/types/` と `frontend/types/` の TypeScript
  2. **バリデーション** → Zod スキーマ（ツール入力・API 境界）
  3. **AI ルール** → 説明用ラベル・用語・ルール（プロンプトやレスポンス制約に利用）

- スコープ: 型・バリデーション・表示・説明の**意味**を一元化し、計算ロジック（majiang-core 等）はそのまま submodules に任せる。

---

## 2. 定義フォーマットの選択肢

| 形式 | 型生成 | バリデーション | メタデータ（ラベル・説明・AI用） | 編集性 | 備考 |
|------|--------|----------------|----------------------------------|--------|------|
| **YAML** | 別ツールで変換 | 別ツールで Zod 等を生成 | 同一ファイルに `label` / `description` / `ai` を併記可能 | ◎ コメント・可読性良い | スキーマは別途（JSON Schema で YAML を検証等） |
| **JSON** | 同左 | 同左 | 同左 | △ コメント不可 | ツールが JSON 前提なら扱いやすい |
| **JSON Schema** | 型生成ツール多数（quicktype, json-schema-to-typescript） | そのまま Ajv 等で実行時検証、Zod は別生成 | 標準は `title`/`description` のみ。拡張で `x-label` 等 | △ 冗長 | 型とバリデーションは強く、AI用は拡張プロパティで |
| **Protocol Buffers (proto)** | 公式コンパイラで TS 等 | なし（別途） | なし（comment は TS にコピーされる程度） | △ スキーマが重い | 他言語・gRPC と揃えるならあり。AI用メタは別ファイル必要 |
| **OpenAPI (YAML/JSON)** | コード生成ツール多数 | バリデーションは別 | `description` はある。説明用ラベルは拡張で | ○ API 契約と一致させるなら良い | API 中心なら良い。ドメイン全体は過不足あり |
| **自前スキーマ（YAML + メタ付き）** | 自作コードジェネレータ | 自作で Zod 出力 | 最初から `label`, `description`, `ai.rules` 等を定義 | ◎ 欲しい形に合わせられる | メンテコストはやや増 |

**推奨の方向性**

- **短期**: **YAML（または JSON）で「型＋メタデータ」を一括定義**し、小さなコードジェネレータ（Node スクリプト）で TS と Zod を生成。AI 用のラベル・説明・ルールは同じ YAML の `label` / `description` / `ai` から読み、プロンプトや Cursor ルールに流し込む。
- **中期**: 定義のスキーマを JSON Schema で書いて YAML を検証し、型・Zod 生成はその JSON Schema（または YAML を JSON に変換したもの）を入力にすると、一貫性が取りやすい。

---

## 3. 一つの定義で「型・バリデーション・AIルール」を賄う構成

「難しい」と感じるポイントは、**同じフィールドに 3 種類の情報（型・バリデーション・説明）を載せる**こと。以下のように**1フィールドに複数の役割を持たせる**形にすると、スコープを「型と入出力の意味＋説明用の用語＋バリデーション」に広げても扱いやすい。

### 3.1 定義のレイヤー

```
ドメイン定義 (YAML/JSON)
├── primitives     # TileId, ShoupaiString, Feng などの基本型とパターン
├── domain         # AnalysisContext など（型＋validation＋label/description）
├── evaluation     # DapaiCandidate, EvaluateShoupaiResult（＋AI用の意味）
├── api            # リクエスト・レスポンス・ストリームイベント
├── errors         # ApiError
├── formatTiles    # FormatTilesInput/Output
└── ai             # 説明・プロンプト用のルール（どのフィールドが何を意味するか、推奨の定義など）
```

- **型**: 各オブジェクトの `type` / `properties` から TypeScript の interface を生成。
- **バリデーション**: `pattern` / `enum` / `min` / `max` 等から Zod を生成。
- **表示・説明**: 各フィールドの `label`（表示名）、`description`（説明）をそのまま UI やツールの description に利用。
- **AI ルール**: `ai.rules` やトップレベルの `ai` セクションで「推奨打牌は `dapai_candidates` のうち `selected: true` のもの」などを明文化し、プロンプトやシステムルールに注入。

### 3.2 定義例（YAML）

```yaml
# packages/types/definitions/domain.yaml（イメージ）

primitives:
  TileId:
    type: string
    pattern: "^([mps][0-9]|z[1-7])$"
    description: "牌1枚のID。m0=赤五萬, p1〜p9, s1〜s9, z1〜z7"
    label: "牌ID"

  ShoupaiString:
    type: string
    description: "手牌文字列。例 m123p456s789z12。副露ありは m123,m2p2p2 等"
    label: "手牌文字列"

  Feng:
    type: integer
    enum: [0, 1, 2, 3]
    description: "場風・自風。0=東, 1=南, 2=西, 3=北"
    label: "風"

domain:
  AnalysisContext:
    description: "手牌分析の入力として必要な局情報"
    properties:
      shoupai:
        $ref: "#/primitives/ShoupaiString"
        required: true
      zhuangfeng:
        $ref: "#/primitives/Feng"
      menfeng:
        $ref: "#/primitives/Feng"
      baopai:
        type: array
        items: { $ref: "#/primitives/TileId" }
        description: "ドラ表示牌の配列"
      hongpai:
        type: boolean
        description: "赤牌ありか"
      xun:
        type: number
        description: "巡目"
      heinfo:
        type: ["string", "null"]
        description: "捨て牌情報（オプション）"

evaluation:
  DapaiCandidate:
    description: "打牌候補1つ"
    properties:
      tile: { $ref: "#/primitives/TileId" }
      n_xiangting:
        type: number
        description: "この打牌後の向聴数。−1は和了形"
        label: "向聴数"
        ai: "説明では「向聴数が小さいほど聴牌に近い」と補足してよい"
      ev:
        type: number
        description: "期待値。大きいほど有利"
        label: "期待値"
        ai: "説明では「期待値が最も高い打牌を推奨」と述べてよい"
      tingpai: { type: array, items: { $ref: "#/primitives/TileId" } }
      n_tingpai: { type: number }
      selected:
        type: boolean
        description: "推奨打牌かどうか"
        label: "推奨"

  EvaluateShoupaiResult:
    description: "手牌評価の結果"
    properties:
      current:
        type: object
        properties:
          n_xiangting: { type: number }
          ev: { type: number }
      dapai_candidates:
        type: array
        items: { $ref: "#/evaluation/DapaiCandidate" }
      recommended: { $ref: "#/primitives/TileId" }

# AI 向けのルール（プロンプト・システムルールに流し込む用）
ai:
  rules:
    - id: recommended_definition
      text: "推奨打牌は、dapai_candidates のうち selected が true の打牌（recommended と一致する）である。説明では「推奨打牌は ○○ です」と recommended の牌を明示すること。"
    - id: xiangting_meaning
      text: "向聴数(n_xiangting)は 0 が聴牌、-1 が和了形。小さいほど良い。"
    - id: ev_meaning
      text: "ev は期待値。大きいほどその打牌の有利さが高い。"
  terms:
    n_xiangting: "向聴数"
    ev: "期待値"
    recommended: "推奨打牌"
    dapai_candidates: "打牌候補"
```

- **型**: `primitives` + `domain` + `evaluation` から `domain.ts` / `evaluation.ts` を生成。
- **バリデーション**: `pattern` / `enum` から Zod を生成（例: `TileId` → `z.string().regex(...)`, `Feng` → `z.union([z.literal(0), ...])`）。
- **表示・説明**: `label` / `description` をツールの `inputSchema.description` やフロントのラベル、API ドキュメントに利用。
- **AI ルール**: `ai.rules` と `ai.terms` をシステムプロンプトや Cursor ルールに組み込む。

---

## 4. 生成先の対応

| 定義 | 生成先（mastra / frontend） |
|------|-----------------------------|
| primitives + domain | `types/domain.ts` |
| evaluation | `types/evaluation.ts` |
| api, errors, formatTiles | `types/api.ts`, `types/errors.ts`, `types/format-tiles.ts` |
| 上記の pattern / enum 等 | `types/zod.ts`（Zod スキーマ） |
| ai.rules + ai.terms | プロンプト用テンプレート、または `.cursor/rules` 用の断片 |

mastra と frontend は**同じコードジェネレータの出力**をそれぞれの `types/` に書き出すか、共通パッケージ `packages/types` を 1 つ作り、mastra と frontend がそこを参照する形にすると、二重管理がなくなる。

---

## 5. パッケージ構成案

```
packages/
  types/                      # 新規
    definitions/              # ドメイン定義（正）
      primitives.yaml
      domain.yaml
      evaluation.yaml
      api.yaml
      errors.yaml
      format-tiles.yaml
      ai.yaml                 # または上記に ai セクションを分散
    scripts/
      generate-types.ts       # TS 生成
      generate-zod.ts         # Zod 生成
      generate-ai-rules.ts    # プロンプト/ルール用のテキスト or JSON 出力
    package.json
    # 出力先: 自パッケージの dist/ に TS を生成し、mastra/frontend は @repo/types で参照
    # または mastra/types と frontend/types に直接上書き生成
```

- **参照方法**
  - **A**: `packages/types` のビルド結果（`dist/` の .d.ts と .js）を mastra と frontend が `@majiang-ai/types` のように参照する。
  - **B**: コードジェネレータで `mastra/src/mastra/types/` と `frontend/types/` に**直接ファイルを書き出す**。この場合はパッケージ参照は不要で、既存の import パスをそのまま使える。

---

## 6. まとめ

- **型・バリデーション・AIルール**は、**同じ YAML（または JSON）の「型定義＋メタデータ（label / description / ai）」**で一括して持つ。
- 定義フォーマットは、**手で編集しやすくメタデータを載せやすい YAML** を推奨。ツール都合で JSON や JSON Schema に寄せてもよい。
- 一つのフィールドに `type` / `pattern` / `enum`（型・バリデーション）と `label` / `description` / `ai`（表示・説明・AIルール）を併記することで、「型や validation が欲しい」「AI のレスポンスのルールベースも使いたい」の両方を満たせる。
- まずは **domain + evaluation + ai の一部**だけ YAML 化し、TS と Zod の生成＋AI 用ルールの 1 ファイル出力から始め、段階的に api / errors / formatTiles や生成先の整理（packages/types 単体パッケージ化など）に広げると進めやすい。

この設計に沿えば、`packages/types` のような新パッケージでドメイン知識を YAML/JSON 等で定義し、mastra と frontend の型を生成しつつ、バリデーションと AI のルールベースも同じ定義から賄える。

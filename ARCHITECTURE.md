# 麻雀AI アーキテクチャ設計

## 概要

MastraのVercelDeployerはAPIエンドポイントのみをデプロイするため、フロントエンドは別途実装する必要があります。
このドキュメントでは、Mastra API + Next.jsフロントエンドの構成を提案します。

## アーキテクチャ

```
┌─────────────────────────────────────┐
│  Next.js Frontend (Vercel)          │
│  - UI/UX                            │
│  - 手牌入力フォーム                  │
│  - 結果表示                         │
│  - majiang-uiによる牌の描画          │
└─────────────────────────────────────┘
              ↓ HTTP API
┌─────────────────────────────────────┐
│  Mastra API (Vercel Serverless)    │
│  - POST /api/agents/{agentName}     │
│  - POST /api/workflows/{workflowId} │
│  - GET /api/tools                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  麻雀ライブラリ                      │
│  - majiang-ai                       │
│  - majiang-core                     │
│  - majiang-analog                  │
└─────────────────────────────────────┘
```

## Mastra API エンドポイント

Mastraは以下のREST APIを提供します：

### Agents
- `POST /api/agents/{agentName}` - エージェントの実行
- `POST /api/agents/{agentName}/stream` - ストリーミング実行

### Workflows
- `POST /api/workflows/{workflowId}` - ワークフローの実行

### Tools
- `GET /api/tools` - 利用可能なツールの一覧

### 例: majiangAnalysisAgentの呼び出し

```typescript
POST /api/agents/majiangAnalysisAgent
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "手牌: m123p1234789s3388 の最適な打牌を教えてください"
    }
  ]
}
```

## ディレクトリ構成

```
majiang-ai/
├── mastra/                    # Mastra API (バックエンド)
│   ├── src/
│   │   └── mastra/
│   │       ├── agents/
│   │       │   └── majiang-analysis-agent.ts
│   │       ├── tools/
│   │       │   └── eval/shoupai/
│   │       ├── workflows/
│   │       │   └── evaluate-shoupai.ts
│   │       └── index.ts
│   ├── package.json
│   └── .vercel/output/        # ビルド成果物
│
├── frontend/                  # Next.js Frontend (新規作成)
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # メインページ
│   │   └── api/               # Next.js API Routes (必要に応じて)
│   ├── components/
│   │   ├── ShoupaiInput.tsx   # 手牌入力コンポーネント
│   │   ├── ResultDisplay.tsx  # 結果表示コンポーネント
│   │   └── TileDisplay.tsx    # 牌の描画コンポーネント
│   ├── lib/
│   │   └── mastra-client.ts  # Mastra APIクライアント
│   ├── package.json
│   └── next.config.js
│
├── submodules/                # 既存のサブモジュール
│   ├── majiang-ai/
│   ├── majiang-core/
│   ├── majiang-ui/
│   └── majiang-analog/
│
└── vercel.json                # ルート設定（必要に応じて）
```

## デプロイ構成

### 1. Mastra API (バックエンド)

- **デプロイ先**: Vercel Serverless Functions
- **URL**: `https://majiang-ai-api.vercel.app` (例)
- **エンドポイント**:
  - `POST /api/agents/majiangAnalysisAgent`
  - `POST /api/workflows/evaluateShoupai`
  - `GET /api/tools`

### 2. Next.js Frontend

- **デプロイ先**: Vercel
- **URL**: `https://majiang-ai-beta.vercel.app` (例)
- **環境変数**:
  - `NEXT_PUBLIC_MASTRA_API_URL`: Mastra APIのURL

## データフロー

```
1. ユーザーが手牌を入力
   ↓
2. Next.js FrontendがMastra APIにリクエスト
   POST /api/agents/majiangAnalysisAgent
   {
     "messages": [
       {
         "role": "user",
         "content": "手牌: m123p1234789s3388"
       }
     ]
   }
   ↓
3. Mastra APIが処理
   - evaluateShoupaiToolを呼び出し
   - 評価結果を取得
   - LLMで説明を生成
   ↓
4. 結果を返す
   {
     "output": [
       {
         "role": "assistant",
         "content": "推奨打牌: ...\n理由: ..."
       }
     ]
   }
   ↓
5. Next.js Frontendが結果を表示
   - 打牌候補の一覧
   - 評価値の表示
   - 説明文の表示
   - majiang-uiで牌を描画
```

## 実装ステップ

### Phase 1: Mastra APIの確認とテスト

1. Mastra APIが正しくデプロイされているか確認
2. エンドポイントの動作確認
3. APIレスポンス形式の確認

### Phase 2: Next.jsプロジェクトの作成

```bash
cd /Users/iwakinakazuteru/workspace/majiang-ai
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
```

### Phase 3: Mastra APIクライアントの実装

`frontend/lib/mastra-client.ts`を作成：

```typescript
const MASTRA_API_URL = process.env.NEXT_PUBLIC_MASTRA_API_URL || 'http://localhost:4111';

export async function callMajiangAgent(message: string) {
  const response = await fetch(`${MASTRA_API_URL}/api/agents/majiangAnalysisAgent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
}
```

### Phase 4: UIコンポーネントの実装

1. 手牌入力コンポーネント
2. 結果表示コンポーネント
3. majiang-uiを使った牌の描画

### Phase 5: 統合とデプロイ

1. フロントエンドとバックエンドの統合
2. デプロイ設定
3. 動作確認

## 技術スタック

### バックエンド (Mastra API)
- Mastra Framework
- TypeScript
- Vercel Serverless Functions

### フロントエンド (Next.js)
- Next.js 14+ (App Router)
- React
- TypeScript
- Tailwind CSS (推奨)
- majiang-ui (牌の描画)

## 環境変数

### Mastra API
- `OPENAI_API_KEY`: LLM APIキー

### Next.js Frontend
- `NEXT_PUBLIC_MASTRA_API_URL`: Mastra APIのURL
  - 開発環境: `http://localhost:4111`
  - 本番環境: `https://majiang-ai-api.vercel.app`

## 注意事項

1. **CORS設定**: Mastra APIでCORSを有効にする必要がある場合があります
2. **APIレート制限**: Vercelの無料プランには制限があります
3. **環境変数**: 両方のプロジェクトで適切に設定する必要があります
4. **デプロイ順序**: Mastra APIを先にデプロイし、そのURLをフロントエンドの環境変数に設定

## 次のステップ

1. ✅ Mastra APIのエンドポイントを確認
2. ⏳ Next.jsプロジェクトを作成
3. ⏳ 基本的なUIを実装
4. ⏳ API連携を実装
5. ⏳ デプロイと動作確認

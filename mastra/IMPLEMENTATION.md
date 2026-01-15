# Mastra統合実装方針

## 概要
既存のCLI実装（`eval_shoupai.js`, `eval_dapai.js`）をMastra上で動作させ、説明生成機能も追加する。

## 実装アーキテクチャ

```
┌─────────────────────────────────────────┐
│  Mastra Agent                           │
│  - MajiangAnalysisAgent                 │
│    (牌譜解析 + 打牌判断 + 説明生成)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Mastra Tools                           │
│  - evaluateShoupaiTool                  │
│  - evaluateDapaiTool                    │
│  - analyzePaipuTool                     │
│  - renderShoupaiTool (majiang-ui)      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  既存ライブラリ                          │
│  - majiang-ai/lib/player.js             │
│  - majiang-ai/lib/minipaipu.js          │
│  - majiang-core                         │
│  - majiang-ui (描画用)                  │
└─────────────────────────────────────────┘
```

## 実装ステップ

### Phase 1: 基本ツール実装

#### 1.1 プロジェクトセットアップ

既に`mastra/`ディレクトリが作成されているので、その中で作業します：

```bash
cd mastra

# submodulesをローカルパスで参照
npm install ../submodules/majiang-core
npm install ../submodules/majiang-ai
npm install ../submodules/majiang-ui
npm install ../submodules/majiang-analog

# または、mastra/package.jsonに直接記述する場合：
# {
#   "dependencies": {
#     "@kobalab/majiang-core": "file:../submodules/majiang-core",
#     "@kobalab/majiang-ai": "file:../submodules/majiang-ai",
#     "@kobalab/majiang-ui": "file:../submodules/majiang-ui",
#     "@kobalab/majiang-analog": "file:../submodules/majiang-analog"
#   }
# }
```

**注意**: submodules内のパッケージは相互に依存しているため、各submoduleの`package.json`でもローカル参照に変更する必要がある場合があります。ただし、通常はnpmが自動的に解決してくれます。

**TypeScript設定（mastra/tsconfig.json）**:
既存の`tsconfig.json`に`paths`を追加する場合：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@kobalab/majiang-core": ["../submodules/majiang-core/lib"],
      "@kobalab/majiang-ai": ["../submodules/majiang-ai/lib"],
      "@kobalab/majiang-ui": ["../submodules/majiang-ui/lib"],
      "@kobalab/majiang-analog": ["../submodules/majiang-analog/lib"]
    }
  },
  "include": ["src/**/*"]
}
```

または、直接相対パスで参照することも可能です：
```typescript
// TypeScript/JavaScriptでの直接参照（mastra/src/mastra/tools/内から）
const Majiang = require('../../../../submodules/majiang-core/lib');
const Player = require('../../../../submodules/majiang-ai/lib');
```

**submodules内の依存関係について**:
- `majiang-ai`は`@kobalab/majiang-core`に依存
- `majiang-ui`は`@kobalab/majiang-ai`と`@kobalab/majiang-core`に依存
- `majiang-analog`は`@kobalab/majiang-core`に依存

npm install時に、これらの依存関係も自動的にローカルのsubmodulesを参照するように解決されます。もし解決されない場合は、各submoduleの`package.json`の依存関係を一時的に`file:../majiang-core`のように変更するか、npmの`link`コマンドを使用することもできます。

#### 1.2 ツール実装

**`mastra/src/mastra/tools/evaluate-shoupai.ts`**
- `eval_shoupai.js`のロジックをTypeScript化
- 手牌文字列から評価値を計算
- 打牌候補の評価情報を返す

**`mastra/src/mastra/tools/evaluate-dapai.ts`**
- `eval_dapai.js`のロジックをTypeScript化
- 河情報・副露情報も含めた評価
- 危険度計算も含む

**`mastra/src/mastra/tools/analyze-paipu.ts`**
- 牌譜ファイルから特定局面を抽出
- majiang-analogを活用

**`mastra/src/mastra/tools/render-shoupai.ts`**
- majiang-uiを使って手牌を描画
- SVG/HTML形式で返す

### Phase 2: Agent実装

**`mastra/src/mastra/agents/majiang-analysis-agent.ts`**
- 複数のツールを組み合わせるAgent
- 説明生成ロジックを含む

### Phase 3: 説明生成

**`mastra/src/mastra/services/explanation-service.ts`**
- 評価情報から自然言語説明を生成
- LLM（Claude/GPT）を活用

## ディレクトリ構成

```
majiang-ai/
├── mastra/                          # Mastraプロジェクト
│   ├── src/
│   │   └── mastra/
│   │       ├── agents/
│   │       │   └── majiang-analysis-agent.ts  # 麻雀分析エージェント
│   │       ├── tools/
│   │       │   ├── evaluate-shoupai.ts        # 手牌評価ツール
│   │       │   ├── evaluate-dapai.ts          # 立体何切るツール
│   │       │   ├── analyze-paipu.ts           # 牌譜解析ツール
│   │       │   └── render-shoupai.ts          # 描画ツール
│   │       ├── services/
│   │       │   ├── player-service.ts          # Player管理
│   │       │   ├── evaluation-service.ts      # 評価計算
│   │       │   └── explanation-service.ts      # 説明生成
│   │       ├── adapters/
│   │       │   ├── majiang-core-adapter.ts    # majiang-coreのラッパー
│   │       │   └── majiang-ai-adapter.ts      # majiang-aiのラッパー
│   │       ├── types/
│   │       │   └── index.ts                   # 型定義
│   │       └── index.ts                      # エクスポート
│   ├── package.json
│   └── tsconfig.json
├── submodules/                      # 既存のmajiangライブラリ
│   ├── majiang-core/
│   ├── majiang-ai/
│   ├── majiang-ui/
│   └── majiang-analog/
├── examples/                        # 使用例（オプション）
│   └── basic-usage.ts
├── README.md
├── DESIGN.md
└── IMPLEMENTATION.md
```

## ツール仕様

### evaluateShoupaiTool

**実装例:**
```typescript
// mastra/src/mastra/tools/evaluate-shoupai.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const evaluateShoupaiTool = createTool({
  id: 'evaluate-shoupai',
  description: '手牌から最適な打牌を判断し、評価情報を返す',
  inputSchema: z.object({
    shoupai: z.string().describe('手牌文字列 (例: "m123p1234789s3388")'),
    zhuangfeng: z.number().optional().describe('場風 (0-3)'),
    menfeng: z.number().optional().describe('自風 (0-3)'),
    baopai: z.array(z.string()).optional().describe('ドラ表示牌'),
    hongpai: z.boolean().optional().describe('赤牌有無'),
    xun: z.number().optional().describe('巡目'),
  }),
  outputSchema: z.object({
    n_xiangting: z.number().describe('現在のシャンテン数'),
    current_ev: z.number().describe('現在の評価値'),
    recommended: z.string().describe('推奨打牌'),
    candidates: z.array(z.object({
      tile: z.string().describe('打牌候補'),
      n_xiangting: z.number().describe('打牌後のシャンテン数'),
      ev: z.number().describe('評価値'),
      tingpai: z.array(z.string()).describe('待ち牌'),
      n_tingpai: z.number().describe('待ち牌の残り枚数'),
      weixian: z.number().optional().describe('危険度（リーチ時）'),
      selected: z.boolean().optional().describe('推奨打牌かどうか'),
    })),
  }),
  execute: async ({ context }) => {
    // eval_shoupai.jsのロジックを実装
    // Playerインスタンスを作成して評価
    return {
      n_xiangting: 2,
      current_ev: 100.5,
      recommended: 's3',
      candidates: [
        // ...
      ],
    };
  },
});
```

### evaluateDapaiTool

**実装例:**
```typescript
// mastra/src/mastra/tools/evaluate-dapai.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const evaluateDapaiTool = createTool({
  id: 'evaluate-dapai',
  description: '河情報・副露情報も含めた立体何切る評価',
  inputSchema: z.object({
    shoupai: z.string().describe('手牌文字列'),
    zhuangfeng: z.number().optional(),
    menfeng: z.number().optional(),
    baopai: z.array(z.string()).optional(),
    hongpai: z.boolean().optional(),
    xun: z.number().optional(),
    heinfo: z.array(z.string()).describe('各プレーヤーの河情報'),
    verbose: z.boolean().optional().describe('危険度テーブルも返すか'),
  }),
  outputSchema: z.object({
    // evaluateShoupaiToolと同じ出力 +
    weixian_table: z.object({
      m: z.array(z.number()),
      p: z.array(z.number()),
      s: z.array(z.number()),
      z: z.array(z.number()),
    }).optional().describe('危険度テーブル'),
  }),
  execute: async ({ context }) => {
    // eval_dapai.jsのロジックを実装
    // minipaipuを使って河情報を反映
    return {
      // ...
    };
  },
});
```

### analyzePaipuTool

**実装例:**
```typescript
// mastra/src/mastra/tools/analyze-paipu.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const analyzePaipuTool = createTool({
  id: 'analyze-paipu',
  description: '牌譜ファイルから特定局面を抽出',
  inputSchema: z.object({
    paipuPath: z.string().describe('牌譜ファイルパス'),
    ju: z.number().optional().describe('局番号（0始まり）'),
    xun: z.number().optional().describe('巡目'),
    playerIndex: z.number().optional().describe('プレーヤー番号'),
  }),
  outputSchema: z.object({
    shoupai: z.string(),
    zhuangfeng: z.number(),
    menfeng: z.number(),
    baopai: z.array(z.string()),
    hongpai: z.boolean(),
    xun: z.number(),
    heinfo: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    // majiang-analogを使って牌譜を解析
    // 指定された局面を抽出
    return {
      // ...
    };
  },
});
```

### renderShoupaiTool

**実装例:**
```typescript
// mastra/src/mastra/tools/render-shoupai.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const renderShoupaiTool = createTool({
  id: 'render-shoupai',
  description: '手牌をSVG/HTML形式で描画',
  inputSchema: z.object({
    shoupai: z.string().describe('手牌文字列'),
    format: z.enum(['svg', 'html']).optional().describe('出力形式'),
    open: z.boolean().optional().describe('手牌を開くか'),
  }),
  outputSchema: z.object({
    svg: z.string().optional().describe('SVG形式の手牌'),
    html: z.string().optional().describe('HTML形式の手牌'),
  }),
  execute: async ({ context }) => {
    // majiang-uiを使って手牌を描画
    // jsdom環境で動作させる必要がある
    return {
      // ...
    };
  },
});
```

## Agent実装例

```typescript
// mastra/src/mastra/agents/majiang-analysis-agent.ts
import { createAgent } from '@mastra/core';
import { evaluateShoupaiTool } from '../tools/evaluate-shoupai';
import { evaluateDapaiTool } from '../tools/evaluate-dapai';
import { analyzePaipuTool } from '../tools/analyze-paipu';
import { renderShoupaiTool } from '../tools/render-shoupai';
import { ExplanationService } from '../services/explanation-service';

export const majiangAnalysisAgent = createAgent({
  constructor() {
    super({
      name: 'majiang-analysis',
      version: '1.0.0',
      tools: [
        evaluateShoupaiTool,
        evaluateDapaiTool,
        analyzePaipuTool,
        renderShoupaiTool,
      ],
    });
  }

  async analyzeAndExplain(params: {
    shoupai: string;
    heinfo?: string[];
    // ... その他のパラメータ
  }) {
    // 1. 評価計算
    const evaluation = params.heinfo
      ? await evaluateDapaiTool.execute(params)
      : await evaluateShoupaiTool.execute(params);

    // 2. 説明生成
    const explanation = await ExplanationService.generate(
      evaluation,
      params
    );

    // 3. 描画（オプション）
    const render = await renderShoupaiTool.execute({
      shoupai: params.shoupai,
    });

    return {
      evaluation,
      explanation,
      render,
    };
  }
}
```

## 説明生成の実装

### 構造化された説明（Phase 2初期）

```typescript
class ExplanationService {
  static generate(evaluation: EvaluationResult): string {
    const { recommended, candidates, n_xiangting } = evaluation;
    
    let explanation = `現在のシャンテン数は${n_xiangting}です。\n\n`;
    explanation += `推奨打牌: ${recommended}\n\n`;
    
    explanation += `【評価理由】\n`;
    const selected = candidates.find(c => c.selected);
    if (selected) {
      explanation += `- 打牌後のシャンテン数: ${selected.n_xiangting}\n`;
      explanation += `- 評価値: ${selected.ev.toFixed(2)}\n`;
      if (selected.tingpai.length > 0) {
        explanation += `- 待ち牌: ${selected.tingpai.join(', ')}\n`;
        explanation += `- 待ち牌の残り枚数: ${selected.n_tingpai}枚\n`;
      }
      if (selected.weixian) {
        explanation += `- 危険度: ${selected.weixian.toFixed(2)}\n`;
      }
    }
    
    // 他の候補との比較
    explanation += `\n【他の候補との比較】\n`;
    const top3 = candidates
      .filter(c => !c.selected)
      .sort((a, b) => b.ev - a.ev)
      .slice(0, 3);
    
    for (const candidate of top3) {
      explanation += `- ${candidate.tile}: 評価値${candidate.ev.toFixed(2)}`;
      if (candidate.weixian) {
        explanation += ` (危険度${candidate.weixian.toFixed(2)})`;
      }
      explanation += '\n';
    }
    
    return explanation;
  }
}
```

### LLMによる説明（Phase 3）

```typescript
import { Anthropic } from '@anthropic-ai/sdk';

class LLMExplanationService {
  static async generate(
    evaluation: EvaluationResult,
    context: GameContext
  ): Promise<string> {
    const client = new Anthropic();
    
    const prompt = `
麻雀の局面分析結果を、初心者にも分かりやすく説明してください。

【現在の状況】
- シャンテン数: ${evaluation.n_xiangting}
- 場風: ${context.zhuangfeng}
- 自風: ${context.menfeng}
- 巡目: ${context.xun}

【評価結果】
${JSON.stringify(evaluation.candidates, null, 2)}

【推奨打牌】
${evaluation.recommended}

上記の情報をもとに、なぜこの打牌が推奨されるのか、分かりやすく説明してください。
`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    return response.content[0].text;
  }
}
```

## 使用例

### 基本的な使用

```typescript
// mastra/src/mastra/index.ts などから
import { majiangAnalysisAgent } from './agents/majiang-analysis-agent';

// Agentに質問する
const response = await majiangAnalysisAgent.generate([
  {
    role: 'user',
    content: '手牌 m123p1234789s3388 で、場風0、自風0、ドラs3、7巡目の場合、何を切るべきですか？理由も教えてください。',
  },
]);

console.log(response.text);
// => "現在のシャンテン数は2です。
//     推奨打牌: s3
//     【評価理由】
//     - 打牌後のシャンテン数: 1
//     - 評価値: 125.50
//     ..."
```

### ツールを直接使用

```typescript
import { evaluateShoupaiTool } from './tools/evaluate-shoupai';

// ツールを直接呼び出す
const result = await evaluateShoupaiTool.execute({
  context: {
    shoupai: 'm123p1234789s3388',
    zhuangfeng: 0,
    menfeng: 0,
    baopai: ['s3'],
    hongpai: true,
    xun: 7,
  },
});

console.log(result.recommended); // 推奨打牌
console.log(result.candidates);  // 全候補の評価
```

### 牌譜から解析

```typescript
import { analyzePaipuTool } from './tools/analyze-paipu';
import { evaluateDapaiTool } from './tools/evaluate-dapai';

// 牌譜から局面を抽出
const gameState = await analyzePaipuTool.execute({
  context: {
    paipuPath: '../paipu.json',
    ju: 0,
    xun: 5,
    playerIndex: 0,
  },
});

// 抽出した局面を評価
const evaluation = await evaluateDapaiTool.execute({
  context: {
    shoupai: gameState.shoupai,
    heinfo: gameState.heinfo,
    // ... その他の情報
  },
});
```

## majiang-uiの活用

### 描画機能の統合

```typescript
// Node.js環境でmajiang-uiを使う場合
// （majiang-uiはブラウザ向けなので、jsdomなどが必要）

import { JSDOM } from 'jsdom';
import { renderShoupai } from './adapters/majiang-ui-adapter';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.$ = require('jquery')(dom.window);

// 手牌を描画
const svg = await renderShoupai({
  shoupai: 'm123p1234789s3388',
  format: 'svg',
});
```

## 実装の優先順位

1. **Phase 1-1**: 基本ツール実装（evaluateShoupaiTool）
2. **Phase 1-2**: 立体何切るツール（evaluateDapaiTool）
3. **Phase 1-3**: 牌譜解析ツール（analyzePaipuTool）
4. **Phase 2-1**: Agent実装
5. **Phase 2-2**: 構造化された説明生成
6. **Phase 3-1**: LLMによる説明生成
7. **Phase 3-2**: 描画機能統合（majiang-ui）

## 注意事項

- majiang-uiはブラウザ向けなので、Node.js環境で使う場合はjsdomが必要
- 既存のCLI実装（eval_shoupai.js等）はCommonJSなので、TypeScript化が必要
- 牌譜形式は電脳麻将形式を想定

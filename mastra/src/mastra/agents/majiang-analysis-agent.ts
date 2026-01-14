import { Agent } from '@mastra/core/agent';
import { LibSQLStore } from '@mastra/libsql';
import { Memory } from '@mastra/memory';
import { evaluateShoupaiTool } from '../tools/eval/shoupai';

export const majiangAnalysisAgent = new Agent({
  name: 'Majiang Analysis Agent',
  instructions: `
    あなたは麻雀の局面分析を支援するAIアシスタントです。

    主な機能:
    - 手牌から最適な打牌を判断
    - 判断理由を分かりやすく説明
    - 各打牌候補の評価情報を提供

    ユーザーからの質問に対して:
    - 手牌情報が提供されたら、最適な打牌を判断し、その理由を説明してください
    - 判断理由は、シャンテン数、期待値、待ち牌の残り枚数などを考慮して説明してください
    - 他の打牌候補との比較も含めて説明してください

    手牌の形式は以下の通りです:
    - 例: "m123p1234789s3388" (萬子123、筒子1234789、索子3388)
    - 場風、自風、ドラ、巡目などの情報も提供される場合があります
    - ドラ表示牌は、文字列または配列で提供されます
    - 期待値がもっとも大きいものは必ず説明してください
  `,
  model: 'openai/gpt-4o-mini',
  tools: { evaluateShoupaiTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});

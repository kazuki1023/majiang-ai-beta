/**
 * 期待値計算ツール
 * 手牌の期待値を計算する
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 期待値計算関数
 */
export async function calculateEv(params: {
  player: any;
  shoupai: any;
  paishu: any;
}) {
  const ev = params.player.eval_shoupai(params.shoupai, params.paishu);
  return {
    ev,
  };
}

export const calculateEvTool = createTool({
  id: 'calculate-ev',
  description: '手牌の期待値を計算',
  inputSchema: z.object({
    player: z.any().describe('Playerインスタンス'),
    shoupai: z.any().describe('majiang-coreのShoupaiインスタンス'),
    paishu: z.any().describe('牌山の残り枚数情報'),
  }),
  outputSchema: z.object({
    ev: z.number().describe('期待値'),
  }),
  execute: async ({ context }) => {
    return await calculateEv(context);
  },
});

/**
 * シャンテン数計算ツール
 * 手牌のシャンテン数を計算する
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * シャンテン数計算関数
 */
export async function calculateXiangting(params: {
  shoupai: any;
}) {
  const Majiang = require('@kobalab/majiang-core');
  const n_xiangting = Majiang.Util.xiangting(params.shoupai);
  return {
    n_xiangting,
  };
}

export const calculateXiangtingTool = createTool({
  id: 'calculate-xiangting',
  description: '手牌のシャンテン数を計算',
  inputSchema: z.object({
    shoupai: z.any().describe('majiang-coreのShoupaiインスタンス'),
  }),
  outputSchema: z.object({
    n_xiangting: z.number().describe('シャンテン数（-1は和了形）'),
  }),
  execute: async ( inputData ) => {
    return await calculateXiangting(inputData);
  },
});

/**
 * 牌山残り枚数計算ツール
 * 牌山の残り枚数を計算する
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 牌山残り枚数計算関数
 */
export async function calculatePaishu(params: {
  player: any;
  xun?: number;
  menfeng?: number;
  heinfo?: string;
}) {
  const player = params.player;
  
  // 牌山の残り枚数を取得
  const paishu = player._suanpai.get_paishu
    ? player._suanpai.get_paishu()
    : player._suanpai.paishu_all();
  
  return {
    paishu,
  };
}

export const calculatePaishuTool = createTool({
  id: 'calculate-paishu',
  description: '牌山の残り枚数を計算',
  inputSchema: z.object({
    player: z.any().describe('Playerインスタンス'),
    xun: z.number().optional().describe('巡目'),
    menfeng: z.number().optional().describe('自風'),
    heinfo: z.string().optional().describe('捨て牌情報'),
  }),
  outputSchema: z.object({
    paishu: z.any().describe('各牌の残り枚数'),
  }),
  execute: async ({ context }) => {
    return await calculatePaishu(context);
  },
});

/**
 * 基本評価ツール
 * 現在のシャンテン数と評価値を計算する
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { calculateEv } from './calculate-ev';
import { calculateXiangting } from './calculate-xiangting';

/**
 * 基本評価関数
 * 現在のシャンテン数と評価値を計算
 */
export async function evaluateBasic(params: {
  player: any;
  shoupai: any;
  paishu?: any;  // 牌山の残り枚数（指定がない場合はplayerから取得）
}) {
  // 牌山の残り枚数が指定されていない場合は取得
  let paishu = params.paishu;
  if (!paishu) {
    paishu = params.player._suanpai.get_paishu
      ? params.player._suanpai.get_paishu()
      : params.player._suanpai.paishu_all();
  }

  // シャンテン数を計算
  const { n_xiangting } = await calculateXiangting({
    shoupai: params.shoupai,
  });

  // 評価値を計算
  const { ev } = await calculateEv({
    player: params.player,
    shoupai: params.shoupai,
    paishu,
  });

  return {
    n_xiangting,
    ev,
    paishu,  // 計算に使用した牌山情報も返す
  };
}

export const evaluateBasicTool = createTool({
  id: 'evaluate-basic',
  description: '現在のシャンテン数と評価値を計算',
  inputSchema: z.object({
    player: z.any().describe('Playerインスタンス'),
    shoupai: z.any().describe('majiang-coreのShoupaiインスタンス'),
    paishu: z.any().optional().describe('牌山の残り枚数（指定がない場合はplayerから取得）'),
  }),
  outputSchema: z.object({
    n_xiangting: z.number().describe('シャンテン数（-1は和了形）'),
    ev: z.number().describe('評価値'),
    paishu: z.any().describe('計算に使用した牌山情報'),
  }),
  execute: async ( inputData ) => {
    return await evaluateBasic(inputData);
  },
});

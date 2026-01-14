/**
 * 打牌候補評価ツール
 * 打牌候補を評価し、推奨打牌を返す
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { addHongpai, formatTile } from './utils';

/**
 * 打牌候補評価関数
 */
export async function evaluateDapaiCandidates(params: {
  player: any;
  shoupai: any;
  paishu: any;
  n_xiangting: number;
}) {
    const Majiang = require('@kobalab/majiang-core');
    const { player, shoupai, paishu, n_xiangting } = params;
    
    const candidates: Array<{
      tile: string;
      n_xiangting: number;
      ev: number;
      tingpai: string[];
      n_tingpai: number;
    }> = [];
    
    let maxEv = -1;
    let recommended = '';
    
    // 打牌可能な牌を取得
    const dapai = player.get_dapai(shoupai);
    
    if (!dapai || dapai.length === 0) {
      return {
        candidates: [],
        recommended: '',
      };
    }
    
    // 各打牌候補を評価
    for (const p of dapai) {
      // 重複をスキップ（末尾が_の場合は通常版があるかチェック）
      if (p.substring(p.length - 1) === '_' && dapai.find((d: string) => d === p.substring(0, 2))) {
        continue;
      }
      
      // 打牌後の手牌
      const newShoupai = shoupai.clone().dapai(p);
      const x = Majiang.Util.xiangting(newShoupai);
      
      // 評価値を計算（シャンテン数が悪化しても評価する）
      const ev = player.eval_shoupai(newShoupai, paishu);
      
      // 待ち牌を取得
      let tingpai = Majiang.Util.tingpai(newShoupai);
      
      // シャンテン数0の場合、和了可能な待ち牌のみ
      if (n_xiangting === 0) {
        tingpai = tingpai.filter((tp: string) => {
          try {
            const defen = player.get_defen(newShoupai.clone().zimo(tp));
            // get_defenは和了できない場合、huleがundefinedになりエラーになる可能性がある
            // その場合はfalseを返して待ち牌を除外
            return defen != null && defen > 0;
          } catch (error) {
            // huleがundefinedの場合、hule.defenでエラーになる
            // その場合は和了できない待ち牌として除外
            return false;
          }
        });
      }
      
      // 待ち牌の残り枚数を計算
      const tingpaiWithHong = addHongpai(tingpai);
      const n_tingpai = tingpaiWithHong
        .map((tp: string) => {
          if (paishu.val) {
            return paishu.val(tp, 1);
          }
          return paishu[tp] || 0;
        })
        .reduce((x: number, y: number) => x + y, 0);
      
      const candidate = {
        tile: formatTile(p),
        n_xiangting: x,
        ev,
        tingpai,
        n_tingpai,
      };
      
      candidates.push(candidate);
      
      // 最大評価値の候補を記録
      if (ev > maxEv) {
        maxEv = ev;
        recommended = formatTile(p);
      }
    }
    
    // 評価値でソート
    candidates.sort((a, b) => b.ev - a.ev);
    
    return {
      candidates,
      recommended,
    };
}

export const evaluateDapaiCandidatesTool = createTool({
  id: 'evaluate-dapai-candidates',
  description: '打牌候補を評価',
  inputSchema: z.object({
    player: z.any().describe('Playerインスタンス'),
    shoupai: z.any().describe('majiang-coreのShoupaiインスタンス'),
    paishu: z.any().describe('牌山の残り枚数'),
    n_xiangting: z.number().describe('現在のシャンテン数'),
  }),
  outputSchema: z.object({
    candidates: z.array(z.object({
      tile: z.string().describe('打牌候補'),
      n_xiangting: z.number().describe('打牌後のシャンテン数'),
      ev: z.number().describe('評価値'),
      tingpai: z.array(z.string()).describe('待ち牌'),
      n_tingpai: z.number().describe('待ち牌の残り枚数'),
    })),
    recommended: z.string().describe('推奨打牌'),
  }),
  execute: async ({ context }) => {
    return await evaluateDapaiCandidates(context);
  },
});

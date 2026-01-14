/**
 * 手牌評価メインツール
 * 上記のツールを組み合わせて、完全な評価を実行
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { calculatePaishu } from './calculate-paishu';
import { evaluateBasic } from './evaluate-basic';
import { evaluateDapaiCandidates } from './evaluate-dapai-candidates';
import { initializePlayer } from './initialize-player';

export const evaluateShoupaiTool = createTool({
  id: 'evaluate-shoupai',
  description: '手牌から最適な打牌を判断し、評価情報を返す',
  inputSchema: z.object({
    shoupai: z.string().describe('手牌文字列 (例: "m123p1234789s3388")'),
    zhuangfeng: z.number().optional().describe('場風 (0-3)'),
    menfeng: z.number().optional().describe('自風 (0-3)'),
    baopai: z.union([z.array(z.string()), z.string()]).optional()
      .transform((val) => {
        if (typeof val === 'string') {
          return val.split(',').filter(Boolean);
        }
        return val || [];
      })
      .describe('ドラ表示牌（文字列または配列。例: "s3" または ["s3", "s4"]）。重要: これは「ドラ表示牌」であり「実際のドラ」ではない。ドラ表示牌"s3"の場合、実際のドラは"s4"になる。suanpaiが自動的に変換するため、ドラ表示牌をそのまま入力すること。'),
    hongpai: z.union([z.boolean(), z.number()]).optional()
      .transform((val) => {
        if (typeof val === 'number') {
          return val !== 0;
        }
        return val ?? true;
      })
      .describe('赤牌有無（booleanまたは数値。0以外はtrue）'),
    xun: z.number().optional().describe('巡目'),
    heinfo: z.union([z.string(), z.object({})]).optional()
      .transform((val) => {
        if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) {
          return undefined;
        }
        return typeof val === 'string' ? val : undefined;
      })
      .describe('捨て牌情報（オプション）'),
    include_gang: z.boolean().optional().describe('槓候補も評価するか'),
    include_backtrack: z.boolean().optional().describe('バックトラック評価も含めるか'),
  }),
  outputSchema: z.object({
    current: z.object({
      n_xiangting: z.number().describe('現在のシャンテン数'),
      ev: z.number().describe('現在の評価値'),
    }),
    dapai_candidates: z.array(z.object({
      tile: z.string(),
      n_xiangting: z.number(),
      ev: z.number(),
      tingpai: z.array(z.string()),
      n_tingpai: z.number(),
      selected: z.boolean().optional(),
    })),
    recommended: z.string().describe('推奨打牌'),
  }),
  execute: async ({ context }) => {
    // 1. Player初期化（関数として直接呼び出し）
    const { player } = await initializePlayer({
      shoupai: context.shoupai,
      zhuangfeng: context.zhuangfeng,
      menfeng: context.menfeng,
      baopai: context.baopai,
      hongpai: context.hongpai,
      xun: context.xun,
      heinfo: context.heinfo,
    });
    
    // 2. 牌山の残り枚数を計算
    const { paishu } = await calculatePaishu({
      player,
      xun: context.xun,
      menfeng: context.menfeng,
      heinfo: context.heinfo,
    });
    
    // 3. 基本評価（シャンテン数と評価値）
    const { n_xiangting, ev: currentEv } = await evaluateBasic({
      player,
      shoupai: player.shoupai,
      paishu,
    });
    
    // 5. 打牌候補を評価
    const { candidates, recommended } = await evaluateDapaiCandidates({
      player,
      shoupai: player.shoupai,
      paishu,
      n_xiangting,
    });
    console.log('candidates', candidates);
    console.log('recommended', recommended);
    
    // 推奨打牌にselectedフラグを追加
    const dapaiCandidates = candidates.map((candidate) => ({
      ...candidate,
      selected: candidate.tile === recommended,
    }));
    
    return {
      current: {
        n_xiangting,
        ev: currentEv,
      },
      dapai_candidates: dapaiCandidates,
      recommended,
    };
  },
});

// 個別ツールもエクスポート
export { calculateEv, calculateEvTool } from './calculate-ev';
export { calculatePaishu, calculatePaishuTool } from './calculate-paishu';
export { calculateXiangting, calculateXiangtingTool } from './calculate-xiangting';
export { evaluateBasic, evaluateBasicTool } from './evaluate-basic';
export { evaluateDapaiCandidates, evaluateDapaiCandidatesTool } from './evaluate-dapai-candidates';
export { formatTiles, formatTilesTool } from './format-tiles';
export { initializePlayer, initializePlayerTool } from './initialize-player';


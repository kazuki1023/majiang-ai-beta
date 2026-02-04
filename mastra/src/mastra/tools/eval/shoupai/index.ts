/**
 * 手牌評価メインツール
 * 入力は共通型 AnalysisContext のみ。場風の変換やゆるい型の整形は行わない。
 * 呼び出し元（API / Agent / Workflow）が共通型に揃えてから渡す（shared-types-design.md §6.1）。
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { EvaluateShoupaiResult } from '../../../types';
import { fengSchema } from '../../../types';
import { calculatePaishu } from './calculate-paishu';
import { evaluateBasic } from './evaluate-basic';
import { evaluateDapaiCandidates } from './evaluate-dapai-candidates';
import { initializePlayer } from './initialize-player';

export type { AnalysisContext, EvaluateShoupaiResult } from '../../../types';

/** 厳密な AnalysisContext の Zod スキーマ。ツールはこの形だけ受け付ける。 */
export const analysisContextSchema = z.object({
  shoupai: z.string().describe('手牌文字列 (例: "m123p1234789s3388")'),
  zhuangfeng: fengSchema.optional().describe('場風。0=東, 1=南, 2=西, 3=北'),
  menfeng: fengSchema.optional().describe('自風。0=東, 1=南, 2=西, 3=北'),
  baopai: z.array(z.string()).optional().describe('ドラ表示牌の配列（ドラ表示牌のまま。実際のドラは suanpai が変換）'),
  hongpai: z.boolean().optional().describe('赤牌ありか').default(true),
  xun: z.number().optional().describe('巡目'),
  heinfo: z.string().nullable().optional().describe('捨て牌情報（オプション）').default(null),
  include_gang: z.boolean().optional().describe('槓候補も評価するか'),
  include_backtrack: z.boolean().optional().describe('バックトラック評価も含めるか'),
});

export const evaluateShoupaiTool = createTool({
  id: 'evaluate-shoupai',
  description: '手牌から最適な打牌を判断し、評価情報を返す。入力は共通型（場風は0-3の数値、baopaiはstring配列）のみ。',
  inputSchema: analysisContextSchema,
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
  execute: async ({ context }): Promise<EvaluateShoupaiResult> => {
    // 1. Player初期化（関数として直接呼び出し）
    const { player } = await initializePlayer({
      shoupai: context.shoupai,
      zhuangfeng: context.zhuangfeng,
      menfeng: context.menfeng,
      baopai: context.baopai,
      hongpai: context.hongpai,
      xun: context.xun,
      heinfo: context.heinfo ?? undefined,
    });
    
    // 2. 牌山の残り枚数を計算
    const { paishu } = await calculatePaishu({
      player,
      xun: context.xun,
      menfeng: context.menfeng,
      heinfo: context.heinfo ?? undefined,
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

    // 推奨打牌に selected フラグを追加
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


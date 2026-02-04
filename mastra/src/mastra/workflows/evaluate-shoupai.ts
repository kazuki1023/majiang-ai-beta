import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import type { EvaluateShoupaiResult } from '../types';
import { fengSchema, gameStateSchema } from '../types';
import { calculatePaishu } from '../tools/eval/shoupai/calculate-paishu';
import { evaluateBasic } from '../tools/eval/shoupai/evaluate-basic';
import { evaluateDapaiCandidates } from '../tools/eval/shoupai/evaluate-dapai-candidates';
import { initializePlayer } from '../tools/eval/shoupai/initialize-player';

/** 手牌分析の入力（共通型 AnalysisContext と互換） */
const initializePlayerInputSchema = z.object({
  shoupai: z.string().describe('手牌文字列 (例: "m123p1234789s3388")'),
  zhuangfeng: fengSchema.optional().describe('場風 (0:東 1:南 2:西 3:北)'),
  menfeng: fengSchema.optional().describe('自風 (0:東 1:南 2:西 3:北)'),
  baopai: z.array(z.string()).optional().describe('ドラ表示牌の配列（例: ["s3", "s4"]）。重要: これは「ドラ表示牌」であり「実際のドラ」ではない。ドラ表示牌"s3"の場合、実際のドラは"s4"になる。'),
  hongpai: z.boolean().optional().describe('赤牌有無'),
  xun: z.number().optional().describe('巡目'),
  heinfo: z.string().optional().describe('捨て牌情報'),
});

const initializePlayerOutputSchema = z.object({
  player: z.any().describe('初期化されたPlayerインスタンス'),
  shoupai: z.any().describe('手牌インスタンス'),
  gameState: gameStateSchema,
});

const calculatePaishuInputSchema = z.object({
  player: z.any().describe('初期化されたPlayerインスタンス'),
  shoupai: z.any().describe('手牌インスタンス'),
  gameState: gameStateSchema.optional().describe('ゲーム状態'),
});

const calculatePaishuOutputSchema = z.object({
  paishu: z.any().describe('牌山の残り枚数'),
  player: z.any().describe('Playerインスタンス'),
  shoupai: z.any().describe('手牌インスタンス'),
});

const evaluateBasicInputSchema = z.object({
  player: z.any().describe('初期化されたPlayerインスタンス'),
  shoupai: z.any().describe('手牌インスタンス'),
  paishu: z.any().describe('牌山の残り枚数'),
});

const evaluateBasicOutputSchema = z.object({
  n_xiangting: z.number().describe('シャンテン数'),
  ev: z.number().describe('評価値'),
  player: z.any().describe('Playerインスタンス'),
  shoupai: z.any().describe('手牌インスタンス'),
  paishu: z.any().describe('牌山の残り枚数'),
});

const evaluateDapaiCandidatesInputSchema = z.object({
  player: z.any().describe('初期化されたPlayerインスタンス'),
  shoupai: z.any().describe('手牌インスタンス'),
  paishu: z.any().describe('牌山の残り枚数'),
  n_xiangting: z.number().describe('シャンテン数'),
  ev: z.number().describe('評価値'),
});

/** 打牌候補1つ（共通型 types/evaluation の DapaiCandidate に合わせる） */
const dapaiCandidateSchema = z.object({
  tile: z.string(),
  n_xiangting: z.number(),
  ev: z.number(),
  tingpai: z.array(z.string()),
  n_tingpai: z.number(),
  selected: z.boolean().optional(),
});

const evaluateDapaiCandidatesOutputSchema = z.object({
  n_xiangting: z.number().describe('シャンテン数'),
  ev: z.number().describe('評価値'),
  candidates: z.array(dapaiCandidateSchema),
  recommended: z.string().describe('推奨打牌'),
});

/** ワークフロー最終出力（共通型 EvaluateShoupaiResult に合わせる） */
const evaluateShoupaiOutputSchema: z.ZodType<EvaluateShoupaiResult> = z.object({
  current: z.object({
    n_xiangting: z.number(),
    ev: z.number(),
  }),
  dapai_candidates: z.array(dapaiCandidateSchema),
  recommended: z.string(),
});

const initializePlayerStep = createStep({
  id: 'initialize-player',
  description: 'Playerを初期化',
  inputSchema: initializePlayerInputSchema,
  outputSchema: initializePlayerOutputSchema,
  execute: async ({ inputData }) => {
    const result = await initializePlayer(inputData);
    // playerからshoupaiを取得
    return {
      ...result,
      shoupai: result.player.shoupai,
    };
  },
});

const calculatePaishuStep = createStep({
  id: 'calculate-paishu',
  description: '牌山の残り枚数を計算',
  inputSchema: calculatePaishuInputSchema,
  outputSchema: calculatePaishuOutputSchema,
  execute: async ({ inputData }) => {
    // 前のステップからのデータを使用
    const { paishu } = await calculatePaishu({
      player: inputData.player,
      xun: inputData.gameState?.xun,
      menfeng: inputData.gameState?.menfeng,
    });
    // 次のステップで必要なデータも返す
    return {
      paishu,
      player: inputData.player,
      shoupai: inputData.shoupai,
    };
  },
});

const evaluateBasicStep = createStep({
  id: 'evaluate-basic',
  description: '現在のシャンテン数と評価値を計算',
  inputSchema: evaluateBasicInputSchema,
  outputSchema: evaluateBasicOutputSchema,
  execute: async ({ inputData }) => {
    // 前のステップからのデータを使用
    const { n_xiangting, ev } = await evaluateBasic({
      player: inputData.player,
      shoupai: inputData.shoupai,
      paishu: inputData.paishu,
    });
    // 次のステップで必要なデータも返す
    return {
      n_xiangting,
      ev,
      player: inputData.player,
      shoupai: inputData.shoupai,
      paishu: inputData.paishu,
    };
  },
});

const evaluateDapaiCandidatesStep = createStep({
  id: 'evaluate-dapai-candidates',
  description: '打牌候補を評価',
  inputSchema: evaluateDapaiCandidatesInputSchema,
  outputSchema: evaluateShoupaiOutputSchema,
  execute: async ({ inputData }) => {
    const { candidates, recommended } = await evaluateDapaiCandidates({
      player: inputData.player,
      shoupai: inputData.shoupai,
      paishu: inputData.paishu,
      n_xiangting: inputData.n_xiangting,
    });
    const dapai_candidates = candidates.map(
      (c: { tile: string; n_xiangting: number; ev: number; tingpai: string[]; n_tingpai: number }) => ({
        ...c,
        selected: c.tile === recommended,
      })
    );
    return {
      current: { n_xiangting: inputData.n_xiangting, ev: inputData.ev },
      dapai_candidates,
      recommended,
    };
  },
});

const evaluateShoupaiWorkflow = createWorkflow({
  id: 'evaluate-shoupai',
  inputSchema: initializePlayerInputSchema,
  outputSchema: evaluateShoupaiOutputSchema,
})
  .then(initializePlayerStep)
  .then(calculatePaishuStep)
  .then(evaluateBasicStep)
  .then(evaluateDapaiCandidatesStep);

evaluateShoupaiWorkflow.commit();

export { evaluateShoupaiWorkflow };

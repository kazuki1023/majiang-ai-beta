/**
 * Player初期化ツール
 * 共通型 AnalysisContext に合わせる（docs/shared-types-design.md §4.2）。
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AnalysisContext } from '../../../types';
import { fengSchema } from '../../../types';
import { normalizePai } from './utils';

/**
 * Player初期化関数（共通型 AnalysisContext を受け取る）
 */
export async function initializePlayer(params: AnalysisContext) {
    try {
      // CommonJSモジュールのためrequireを使用
      const Majiang = require('@kobalab/majiang-core');
      
      // 常に最新版のPlayerを使用
      const PlayerClass = require('@kobalab/majiang-ai');
      const player = new PlayerClass();

      // ルール設定
      const hongpai = params.hongpai ?? true;
      const rule = hongpai
        ? Majiang.rule({ '赤牌': { m: 1, p: 1, s: 1 } })
        : Majiang.rule({ '赤牌': { m: 0, p: 0, s: 0 } });

      // 局開始
      player.kaiju({
        id: 0,
        rule: rule,
        title: '',
        player: [],
        qijia: 0,
      });

      // 局情報設定
      const zhuangfeng = params.zhuangfeng ?? 0;
      const menfeng = params.menfeng ?? 0;
      // baopaiは「ドラ表示牌」であり、「実際のドラ」ではない
      // 例: ドラ表示牌が"s3"の場合、実際のドラは"s4"になる
      // suanpaiはドラ表示牌を保存し、評価時にMajiang.Shan.zhenbaopai()で実際のドラを計算する
      const baopai = (params.baopai ?? []).map(normalizePai);
      const xun = params.xun ?? 7;

      const qipai = {
        zhuangfeng: zhuangfeng,
        jushu: [0, 3, 2, 1][menfeng],
        changbang: 0,
        lizhibang: 0,
        defen: [25000, 25000, 25000, 25000],
        // qipai.baopaiには「ドラ表示牌」を設定（実際のドラではない）
        baopai: baopai[0] || 'z2',
        shoupai: ['', '', '', ''],
      };
      qipai.shoupai[menfeng] = params.shoupai;
      player.qipai(qipai);
      // player.qipai()の後、player._suanpai._baopaiにドラ表示牌が保存される
      // 評価時にはMajiang.Shan.zhenbaopai()で実際のドラに変換される

      // 追加のドラ表示牌を設定（カンドラがある場合）
      // これらも「ドラ表示牌」であり、「実際のドラ」ではない
      for (let i = 1; i < baopai.length; i++) {
        player.kaigang({ baopai: baopai[i] });
      }

    // 捨て牌情報の反映（heinfo がある場合）
    const heinfoStr = params.heinfo ?? undefined;
    if (heinfoStr) {
      for (const suitstr of heinfoStr.match(/[mpsz][\d_*+=\-^]+/g) || []) {
        const s = suitstr[0];
        for (const n of (suitstr.match(/\d/g) || [])) {
          player._suanpai.decrease(s + n);
        }
      }
    }

      // 牌山の残り枚数設定
      player._suanpai._n_zimo = 69 - (xun - 1) * 4 - menfeng;

      return {
        player,
        gameState: {
          zhuangfeng,
          menfeng,
          baopai,
          hongpai,
          xun,
        },
      };
    } catch (error) {
      console.error('initializePlayer error:', error);
      throw error;
    }
}

/**
 * Player初期化ツール（Mastra Agentから使う場合）
 */
export const initializePlayerTool = createTool({
  id: 'initialize-player',
  description: 'Playerインスタンスの初期化と局情報の設定',
  inputSchema: z.object({
    shoupai: z.string().describe('手牌文字列 (例: "m123p1234789s3388")'),
    zhuangfeng: fengSchema.optional().describe('場風 (0-3)、0:東、1:南、2:西、3:北'),
    menfeng: fengSchema.optional().describe('自風 (0-3)、0:東、1:南、2:西、3:北'),
    baopai: z.array(z.string()).optional().describe('ドラ表示牌の配列（例: ["s3", "s4"]）。重要: これは「ドラ表示牌」であり「実際のドラ」ではない。ドラ表示牌"s3"の場合、実際のドラは"s4"になる。suanpaiが自動的に変換するため、ドラ表示牌をそのまま入力すること。'),
    hongpai: z.boolean().optional().describe('赤牌有無'),
    xun: z.number().optional().describe('巡目'),
    heinfo: z.string().optional().describe('捨て牌情報（オプション）'),
  }),
  outputSchema: z.object({
    player: z.any().describe('初期化されたPlayerインスタンス'),
    gameState: z.object({
      zhuangfeng: z.number(),
      menfeng: z.number(),
      baopai: z.array(z.string()),
      hongpai: z.boolean(),
      xun: z.number(),
    }),
  }),
  execute: async ( inputData ) => {
    try {
      return await initializePlayer(inputData);
    } catch (error) {
      console.error('initializePlayerTool error:', error);
      throw error;
    }
  },
});

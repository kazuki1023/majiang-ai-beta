/**
 * Player初期化ツール
 * Playerインスタンスの初期化と局情報の設定を行う
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 型定義（後で実際の型に置き換える）
type Player = any;
type GameState = {
  zhuangfeng: number;
  menfeng: number;
  baopai: string[];
  hongpai: boolean;
  xun: number;
};

/**
 * Player初期化関数（ツールからも直接呼び出しからも使える）
 */
export async function initializePlayer(params: {
  shoupai: string;
  zhuangfeng?: number;
  menfeng?: number;
  baopai?: string[];
  hongpai?: boolean;
  xun?: number;
  heinfo?: string;
}) {
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
    const baopai = params.baopai ?? [];
    const xun = params.xun ?? 7;

    const qipai = {
      zhuangfeng: zhuangfeng,
      jushu: [0, 3, 2, 1][menfeng],
      changbang: 0,
      lizhibang: 0,
      defen: [25000, 25000, 25000, 25000],
      baopai: baopai[0] || 'z2',
      shoupai: ['', '', '', ''],
    };
    qipai.shoupai[menfeng] = params.shoupai;
    player.qipai(qipai);

    // ドラ設定（追加のドラがある場合）
    for (let i = 1; i < baopai.length; i++) {
      player.kaigang({ baopai: baopai[i] });
    }

    // 捨て牌情報の反映（heinfoがある場合）
    if (params.heinfo) {
      for (const suitstr of params.heinfo.match(/[mpsz][\d_*+=\-^]+/g) || []) {
        const s = suitstr[0];
        for (const n of suitstr.match(/\d/g) || []) {
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
}

/**
 * Player初期化ツール（Mastra Agentから使う場合）
 */
export const initializePlayerTool = createTool({
  id: 'initialize-player',
  description: 'Playerインスタンスの初期化と局情報の設定',
  inputSchema: z.object({
    shoupai: z.string().describe('手牌文字列 (例: "m123p1234789s3388")'),
    zhuangfeng: z.number().optional().describe('場風 (0-3)'),
    menfeng: z.number().optional().describe('自風 (0-3)'),
    baopai: z.array(z.string()).optional().describe('ドラ表示牌'),
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
  execute: async ({ context }) => {
    return await initializePlayer(context);
  },
});

/**
 * 共通型（domain / evaluation）に対応する Zod スキーマ
 * 設計: docs/shared-types-design.md
 * ワークフロー・ツールで共通利用するためここで一元管理する。
 */

import { z } from 'zod';

/**
 * 場風・自風（共通型 Feng = 0|1|2|3）。
 * Gemini API は enum に文字列のみ許可するため、anyOf+数値enumではなく number の範囲で定義する。
 */
export const fengSchema = z.number().int().min(0).max(3);

/** ワークフロー内で渡す gameState。AnalysisContext の部分型に相当（共通型 domain）。 */
export const gameStateSchema = z.object({
  zhuangfeng: fengSchema,
  menfeng: fengSchema,
  baopai: z.array(z.string()),
  hongpai: z.boolean(),
  xun: z.number(),
});

/**
 * 共通型（domain / evaluation）に対応する Zod スキーマ
 * 設計: docs/shared-types-design.md
 * ワークフロー・ツールで共通利用するためここで一元管理する。
 */

import { z } from 'zod';

/** 場風・自風（共通型 Feng = 0|1|2|3）。AnalysisContext と型を揃えるため number ではなくリテラルに制限。 */
export const fengSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

/** ワークフロー内で渡す gameState。AnalysisContext の部分型に相当（共通型 domain）。 */
export const gameStateSchema = z.object({
  zhuangfeng: fengSchema,
  menfeng: fengSchema,
  baopai: z.array(z.string()),
  hongpai: z.boolean(),
  xun: z.number(),
});

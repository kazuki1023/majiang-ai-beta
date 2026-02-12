/**
 * 牌の視覚化ツール・関数
 * 共通型: docs/shared-types-design.md §4.7。FormatTilesInput / FormatTilesOutput に合わせる。
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { FormatTilesInput, FormatTilesOutput } from '../../../types';

/**
 * 牌の読みやすい名前マッピング
 */
const TILE_NAME_MAP: Record<string, string> = {
  // 萬子
  'm1': '一萬', 'm2': '二萬', 'm3': '三萬', 'm4': '四萬', 'm5': '五萬', 'm6': '六萬', 'm7': '七萬', 'm8': '八萬', 'm9': '九萬',
  'm0': '赤五萬',
  // 筒子
  'p1': '一筒', 'p2': '二筒', 'p3': '三筒', 'p4': '四筒', 'p5': '五筒', 'p6': '六筒', 'p7': '七筒', 'p8': '八筒', 'p9': '九筒',
  'p0': '赤五筒',
  // 索子
  's1': '一索', 's2': '二索', 's3': '三索', 's4': '四索', 's5': '五索', 's6': '六索', 's7': '七索', 's8': '八索', 's9': '九索',
  's0': '赤五索',
  // 字牌
  'z1': '東', 'z2': '南', 'z3': '西', 'z4': '北', 'z5': '白', 'z6': '發', 'z7': '中',
};

/**
 * 牌の文字列を読みやすい名前に変換
 */
function tileToName(tile: string): string {
  const normalized = tile.substring(0, 2);
  return TILE_NAME_MAP[normalized] || tile;
}

/**
 * 手牌文字列を解析して視覚化
 */
function formatShoupai(shoupaiStr: string): string {
  const Majiang = require('@kobalab/majiang-core');
  
  try {
    const shoupai = Majiang.Shoupai.fromString(shoupaiStr);
    const result: string[] = [];
    
    // 副露がある場合は分離
    const parts = shoupaiStr.split(',');
    const mainShoupai = parts[0];
    
    // 手牌部分を解析（majiang-coreの形式に従う）
    // 例: "m123p456s789" -> ["m1", "m2", "m3", "p4", "p5", "p6", "s7", "s8", "s9"]
    for (const suitstr of mainShoupai.match(/[mpsz]\d[\d_*]*/g) || []) {
      const s = suitstr[0];
      const numbers = suitstr.match(/\d/g) || [];
      
      for (const n of numbers) {
        const tile = s + n;
        result.push(tileToName(tile));
      }
      
      // リーチマーク
      if (suitstr.includes('*')) {
        result.push('*');
      }
    }
    
    // ツモ牌やリーチマークの処理
    if (mainShoupai.includes('_')) {
      const underscoreCount = (mainShoupai.match(/_/g) || []).length;
      for (let i = 0; i < underscoreCount; i++) {
        result.push('_');
      }
    }
    
    // 副露部分
    if (parts.length > 1) {
      result.push('|');
      for (let i = 1; i < parts.length; i++) {
        // 副露はそのまま表示（将来的に視覚化できるように拡張可能）
        result.push(parts[i]);
      }
    }
    
    return result.join(' ');
  } catch (error) {
    // パースエラーの場合は元の文字列を返す
    console.error('formatShoupai error:', error);
    return shoupaiStr;
  }
}

/**
 * 牌の配列を視覚化
 */
function formatTileArray(tiles: string[]): string {
  return tiles.map(tile => tileToName(tile)).join(' ');
}

/**
 * 牌の視覚化関数（共通型 FormatTilesInput / FormatTilesOutput）
 * 空オブジェクトの場合は formatted: '' を返す。
 */
export function formatTiles(
  params: FormatTilesInput | { shoupai?: undefined; tiles?: undefined }
): FormatTilesOutput {
  if (params.shoupai) {
    return { formatted: formatShoupai(params.shoupai) };
  }
  if (params.tiles && params.tiles.length > 0) {
    return { formatted: formatTileArray(params.tiles) };
  }
  return { formatted: '' };
}

/** 手牌形式の文字列かどうか（m/p/s/z + 数字） */
function isShoupaiString(s: unknown): s is string {
  return typeof s === 'string' && /^[mpsz]\d/i.test(s.trim());
}

/**
 * 牌の視覚化ツール（共通型 FormatTilesOutput）。設計上 LLM には渡さない想定。
 */
export const formatTilesTool = createTool({
  id: 'format-tiles',
  description:
    '牌を読みやすい形式に変換します。手牌文字列（例: "m123p1234789s3388"）を渡す場合は shoupai に渡してください。牌の配列（例: ["m1","m2","s3"]）の場合は tiles に渡してください。',
  inputSchema: z.object({
    tiles: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .describe('牌の配列（例: ["m1","m2","s3"]）。手牌文字列を渡した場合も手牌として解釈されます。'),
    shoupai: z
      .union([z.string(), z.boolean()])
      .optional()
      .describe('手牌文字列（例: "m123p1234789s3388"）。true/false は無視されます。'),
  }),
  outputSchema: z.object({ formatted: z.string() }),
  execute: async ( inputData ): Promise<FormatTilesOutput> => {
    const rawTiles = inputData.tiles;
    const rawShoupai = inputData.shoupai;
    const shoupaiStr = typeof rawShoupai === 'string' ? rawShoupai : undefined;
    if (typeof rawTiles === 'string' && isShoupaiString(rawTiles)) {
      return formatTiles({ shoupai: rawTiles });
    }
    if (Array.isArray(rawTiles) && rawTiles.length > 0) {
      return formatTiles({ tiles: rawTiles });
    }
    if (shoupaiStr) {
      return formatTiles({ shoupai: shoupaiStr });
    }
    return formatTiles({});
  },
});

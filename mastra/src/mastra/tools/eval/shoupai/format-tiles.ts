/**
 * 牌の視覚化ツール
 * 牌の文字列をUnicode絵文字や読みやすい形式に変換
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * 牌のUnicode絵文字マッピング
 * 萬子: 🀇(m1) ～ 🀏(m9)
 * 筒子: 🀐(p1) ～ 🀘(p9)
 * 索子: 🀙(s1) ～ 🀡(s9)
 * 字牌: 🀀(z1=東) 🀁(z2=南) 🀂(z3=西) 🀃(z4=北) 🀄(z5=白) 🀅(z6=發) 🀆(z7=中)
 * 赤牌: 🀋(m0=m5赤) 🀔(p0=p5赤) 🀝(s0=s5赤)
 */
const TILE_EMOJI_MAP: Record<string, string> = {
  // 萬子
  'm1': '🀇', 'm2': '🀈', 'm3': '🀉', 'm4': '🀊', 'm5': '🀋', 'm6': '🀌', 'm7': '🀍', 'm8': '🀎', 'm9': '🀏',
  'm0': '🀋', // 赤五萬
  // 筒子
  's1': '🀐', 's2': '🀑', 's3': '🀒', 's4': '🀓', 's5': '🀔', 's6': '🀕', 's7': '🀖', 's8': '🀗', 's9': '🀘',
  's0': '🀔', // 赤五筒
  // 索子
  'p1': '🀙', 'p2': '🀚', 'p3': '🀛', 'p4': '🀜', 'p5': '🀝', 'p6': '🀞', 'p7': '🀟', 'p8': '🀠', 'p9': '🀡',
  'p0': '🀝', // 赤五索
  // 字牌
  'z1': '🀀', // 東
  'z2': '🀁', // 南
  'z3': '🀂', // 西
  'z4': '🀃', // 北
  'z5': '🀄', // 白
  'z6': '🀅', // 發
  'z7': '🀆', // 中
};

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
 * 牌の文字列を絵文字に変換
 */
function tileToEmoji(tile: string): string {
  const normalized = tile.substring(0, 2);
  return TILE_EMOJI_MAP[normalized] || tile;
}

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
function formatShoupai(shoupaiStr: string, format: 'emoji' | 'name' | 'both' = 'both'): string {
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
        if (format === 'emoji') {
          result.push(tileToEmoji(tile));
        } else if (format === 'name') {
          result.push(tileToName(tile));
        } else {
          result.push(`${tileToEmoji(tile)}${tileToName(tile)}`);
        }
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
function formatTileArray(tiles: string[], format: 'emoji' | 'name' | 'both' = 'both'): string {
  return tiles.map(tile => {
    if (format === 'emoji') {
      return tileToEmoji(tile);
    } else if (format === 'name') {
      return tileToName(tile);
    } else {
      return `${tileToEmoji(tile)}${tileToName(tile)}`;
    }
  }).join(' ');
}

/**
 * 牌の視覚化関数
 */
export function formatTiles(params: {
  tiles?: string[];
  shoupai?: string;
  format?: 'emoji' | 'name' | 'both';
}): {
  formatted: string;
  format: 'emoji' | 'name' | 'both';
} {
  const format = params.format || 'both';
  
  if (params.shoupai) {
    return {
      formatted: formatShoupai(params.shoupai, format),
      format,
    };
  } else if (params.tiles && params.tiles.length > 0) {
    return {
      formatted: formatTileArray(params.tiles, format),
      format,
    };
  } else {
    return {
      formatted: '',
      format,
    };
  }
}

/**
 * 牌の視覚化ツール
 */
export const formatTilesTool = createTool({
  id: 'format-tiles',
  description: '牌の文字列をUnicode絵文字や読みやすい形式に変換します。手牌文字列や牌の配列を視覚的に表現できます。',
  inputSchema: z.object({
    tiles: z.array(z.string()).optional().describe('牌の配列（例: ["m1", "m2", "s3"]）'),
    shoupai: z.string().optional().describe('手牌文字列（例: "m123p1234789s3388"）'),
    format: z.enum(['emoji', 'name', 'both']).optional()
      .describe('出力形式: "emoji"=絵文字のみ, "name"=名前のみ, "both"=絵文字+名前')
  }),
  outputSchema: z.object({
    formatted: z.string().describe('視覚化された牌の文字列'),
    format: z.enum(['emoji', 'name', 'both']).default('name').describe('使用された出力形式'),
  }),
  execute: async ({ context }) => {
    return formatTiles({
      tiles: context.tiles,
      shoupai: context.shoupai,
      format: context.format,
    });
  },
});

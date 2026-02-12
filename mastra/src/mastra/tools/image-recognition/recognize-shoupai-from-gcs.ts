/**
 * GCS 上の画像を Gemini Vision で解析し、手牌文字列を返すツール
 * 共通型: RecognizeShoupaiInput / RecognizeShoupaiOutput（docs/shared-types-design.md §4.6）
 */

import { GoogleGenAI } from '@google/genai';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { RecognizeShoupaiOutput } from '../../types';
import {
  downloadImageFromGcs,
  extractShoupaiString,
  SHOUPAI_PROMPT,
} from './shared';

const recognizeShoupaiOutputSchema = z.object({
  shoupaiString: z.string(),
  rawResponse: z.string().optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
});

export const recognizeShoupaiFromGcsTool = createTool({
  id: 'recognize-shoupai-from-gcs',
  description: 'GCS上の手牌画像（gs://...）を解析し、手牌文字列（例: m123p456s789z12）を返す',
  inputSchema: z.object({
    gcsUri: z.string().describe('GCS の画像 URI。例: gs://majiang-ai-images/uploads/2025/02/04/xxx.jpg'),
  }),
  outputSchema: recognizeShoupaiOutputSchema,
  execute: async ( inputData ): Promise<RecognizeShoupaiOutput> => {
    const LOG_PREFIX = '[recognize-shoupai]';

    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not set');
    }

    console.log(`${LOG_PREFIX} input gcsUri=${inputData.gcsUri}`);

    const { buffer, mimeType } = await downloadImageFromGcs(inputData.gcsUri);
    const base64 = buffer.toString('base64');
    console.log(`${LOG_PREFIX} image size=${buffer.length} bytes, mimeType=${mimeType}`);

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: SHOUPAI_PROMPT },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
    });
    const text = (response.text ?? '').trim();
    const shoupaiString = extractShoupaiString(text);

    console.log(`${LOG_PREFIX} gemini rawResponse="${text}"`);
    console.log(`${LOG_PREFIX} extracted shoupaiString="${shoupaiString}"`);
    const tileCount = shoupaiString ? (shoupaiString.match(/[mpsz]\d/g)?.length ?? 0) : 0;
    console.log(`${LOG_PREFIX} done shoupaiString.length=${shoupaiString.length} tileCount=${tileCount}`);

    return {
      shoupaiString: shoupaiString || text,
      rawResponse: text,
    };
  },
});

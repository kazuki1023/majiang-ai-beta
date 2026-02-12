/**
 * GCS 上の画像を GPT-5.2 Vision で解析し、手牌文字列を返すツール
 * 共通型: RecognizeShoupaiOutput（docs/shared-types-design.md §4.6）
 */

import { createTool } from '@mastra/core/tools';
import OpenAI from 'openai';
import { z } from 'zod';
import type { RecognizeShoupaiOutput } from '../../types';
import {
  downloadImageFromGcs,
  extractShoupaiString,
  SHOUPAI_PROMPT,
} from './shared';

const MODEL = 'gpt-5.2';

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

export const recognizeShoupaiFromGcsGptTool = createTool({
  id: 'recognize-shoupai-from-gcs-gpt5.2',
  description:
    'GCS上の手牌画像（gs://...）を GPT-5.2 Vision で解析し、手牌文字列（例: m123p456s789z12）を返す',
  inputSchema: z.object({
    gcsUri: z.string().describe('GCS の画像 URI'),
  }),
  outputSchema: recognizeShoupaiOutputSchema,
  execute: async ( inputData ): Promise<RecognizeShoupaiOutput> => {
    const LOG_PREFIX = '[recognize-shoupai-gpt5.2]';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log(`${LOG_PREFIX} input gcsUri=${inputData .gcsUri}`);

    const { buffer, mimeType } = await downloadImageFromGcs(inputData .gcsUri);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    console.log(`${LOG_PREFIX} image size=${buffer.length} bytes, mimeType=${mimeType}`);

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SHOUPAI_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      // max_tokens: 256, gpt4o 用
      max_completion_tokens: 256,
    });

    const text =
      completion.choices[0]?.message?.content?.trim() ?? '';
    const shoupaiString = extractShoupaiString(text);

    console.log(`${LOG_PREFIX} gpt5.2 rawResponse="${text}"`);
    console.log(`${LOG_PREFIX} extracted shoupaiString="${shoupaiString}"`);
    const tileCount = shoupaiString
      ? (shoupaiString.match(/[mpsz]\d/g)?.length ?? 0)
      : 0;
    console.log(
      `${LOG_PREFIX} done shoupaiString.length=${shoupaiString.length} tileCount=${tileCount}`
    );

    return {
      shoupaiString: shoupaiString || text,
      rawResponse: text,
    };
  },
});

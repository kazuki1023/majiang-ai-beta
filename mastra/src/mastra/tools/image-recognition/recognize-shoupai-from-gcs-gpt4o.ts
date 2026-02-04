/**
 * GCS 上の画像を GPT-5.2 Vision で解析し、手牌文字列を返すツール
 * 手法 5 の比較検討用。Gemini 版は recognize-shoupai-from-gcs.ts を利用すること。
 */

import { createTool } from '@mastra/core/tools';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  downloadImageFromGcs,
  extractShoupaiString,
  SHOUPAI_PROMPT,
} from './shared';

const MODEL = 'gpt-5.2';

export const recognizeShoupaiFromGcsGpt4oTool = createTool({
  id: 'recognize-shoupai-from-gcs-gpt5.2',
  description:
    'GCS上の手牌画像（gs://...）を GPT-5.2 Vision で解析し、手牌文字列（例: m123p456s789z12）を返す',
  inputSchema: z.object({
    gcsUri: z
      .string()
      .describe(
        'GCS の画像 URI。例: gs://majiang-ai-images/uploads/2025/02/04/xxx.jpg'
      ),
  }),
  outputSchema: z.object({
    shoupaiString: z
      .string()
      .describe('認識した手牌文字列（例: m123p1234789s3388）'),
    rawResponse: z
      .string()
      .optional()
      .describe('GPT-5.2 の生の応答（デバッグ用）'),
  }),
  execute: async ({ context }) => {
    const LOG_PREFIX = '[recognize-shoupai-gpt5.2]';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log(`${LOG_PREFIX} input gcsUri=${context.gcsUri}`);

    const { buffer, mimeType } = await downloadImageFromGcs(context.gcsUri);
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

/**
 * GCS 上の画像を Gemini Vision で解析し、手牌文字列を返すツール
 */

import { Storage } from '@google-cloud/storage';
import { GoogleGenAI } from '@google/genai';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const ALLOWED_BUCKET = process.env.GCS_BUCKET ?? 'majiang-ai-images';

const SHOUPAI_PROMPT = `
この画像は麻雀の手牌（14枚）を写した写真です。
画像に写っている手牌を、以下の形式の文字列のみで答えてください。説明や余計な文字は一切付けないでください。

形式:
- 萬子: m + 数字（例: m123 = 一萬、二萬、三萬）。赤五萬は m0
- 筒子: p + 数字（例: p456 = 四筒、五筒、六筒）。赤五筒は p0
- 索子: s + 数字（例: s789 = 七索、八索、九索）。赤五索は s0
- 字牌: z + 数字（1=東, 2=南, 3=西, 4=北, 5=白, 6=發, 7=中）。字牌に赤はなし

例: m123p1234789s3388（赤五がある場合は m0, p0, s0 を使う）

手牌のみを認識してください。場風・自風・ドラ・巡目は無視してください。
見えない牌や不明な部分がある場合は、分かる範囲で答えてください。14枚に満たない場合も、認識できた分だけ答えてください。
`.trim();

function parseGcsUri(gcsUri: string): { bucket: string; path: string } | null {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(gcsUri.trim());
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

async function downloadImageFromGcs(gcsUri: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const parsed = parseGcsUri(gcsUri);
  if (!parsed) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }
  if (parsed.bucket !== ALLOWED_BUCKET) {
    throw new Error(`GCS bucket must be ${ALLOWED_BUCKET}, got ${parsed.bucket}`);
  }

  const storage = new Storage();
  const [contents] = await storage.bucket(parsed.bucket).file(parsed.path).download();
  const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents as ArrayBuffer);
  const ext = parsed.path.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  return { buffer, mimeType };
}

/**
 * 手牌文字列をレスポンステキストから抽出（m...p...s...z... 形式）
 */
function extractShoupaiString(text: string): string {
  const trimmed = text.trim();
  // 1行だけの場合はそのまま（余計な説明がなければ）
  const oneLine = trimmed.split(/\s/)[0];
  if (/^[mpsz]\d+([mpsz]\d+)*$/i.test(oneLine)) {
    return oneLine;
  }
  // 文中に m... 形式があれば抽出
  const match = trimmed.match(/[mpsz]\d+([mpsz]\d+)*/gi);
  if (match && match[0]) {
    return match[0];
  }
  return trimmed;
}

export const recognizeShoupaiFromGcsTool = createTool({
  id: 'recognize-shoupai-from-gcs',
  description: 'GCS上の手牌画像（gs://...）を解析し、手牌文字列（例: m123p456s789z12）を返す',
  inputSchema: z.object({
    gcsUri: z.string().describe('GCS の画像 URI。例: gs://majiang-ai-images/uploads/2025/02/04/xxx.jpg'),
  }),
  outputSchema: z.object({
    shoupaiString: z.string().describe('認識した手牌文字列（例: m123p1234789s3388）'),
    rawResponse: z.string().optional().describe('Gemini の生の応答（デバッグ用）'),
  }),
  execute: async ({ context }) => {
    const LOG_PREFIX = '[recognize-shoupai]';

    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is not set');
    }

    console.log(`${LOG_PREFIX} input gcsUri=${context.gcsUri}`);

    const { buffer, mimeType } = await downloadImageFromGcs(context.gcsUri);
    const base64 = buffer.toString('base64');
    console.log(`${LOG_PREFIX} image size=${buffer.length} bytes, mimeType=${mimeType}`);

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

/**
 * 画像認識ツール共通: プロンプト・GCS 取得・手牌文字列抽出
 */

import { Storage } from '@google-cloud/storage';

export const ALLOWED_BUCKET = process.env.GCS_BUCKET ?? 'majiang-ai-images';

export const SHOUPAI_PROMPT = `
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

export function parseGcsUri(gcsUri: string): { bucket: string; path: string } | null {
  const match = /^gs:\/\/([^/]+)\/(.+)$/.exec(gcsUri.trim());
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

export async function downloadImageFromGcs(
  gcsUri: string
): Promise<{ buffer: Buffer; mimeType: string }> {
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
export function extractShoupaiString(text: string): string {
  const trimmed = text.trim();
  const oneLine = trimmed.split(/\s/)[0];
  if (/^[mpsz]\d+([mpsz]\d+)*$/i.test(oneLine)) {
    return oneLine;
  }
  const match = trimmed.match(/[mpsz]\d+([mpsz]\d+)*/gi);
  if (match && match[0]) {
    return match[0];
  }
  return trimmed;
}

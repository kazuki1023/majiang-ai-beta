import { Agent } from '@mastra/core/agent';
import { recognizeShoupaiFromGcsTool } from '../tools/image-recognition';

export const imageRecognitionAgent = new Agent({
  id: 'image-recognition-gemini-agent',
  name: 'Image Recognition Agent',
  instructions: `
あなたは麻雀の手牌画像を認識するエージェントです。

- ユーザーが GCS の画像 URI（gs:// で始まる文字列）を送ったら、必ず recognize-shoupai-from-gcs ツールを呼び出してください。
- ツールの結果に含まれる shoupaiString を、ユーザーへの返答としてそのまま返してください。説明文は不要です。手牌文字列のみを返すことで、フロントエンドがそのまま手牌入力欄に反映できます。
- content が gs:// で始まっていない場合は「手牌画像の GCS URI（gs://...）を送ってください」と返してください。
`.trim(),
  model: 'google/gemini-3-flash-preview',
  tools: { recognizeShoupaiFromGcsTool },
});

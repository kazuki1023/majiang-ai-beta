import { Agent } from '@mastra/core/agent';
import { recognizeShoupaiFromGcsGpt4oTool } from '../tools/image-recognition';

/**
 * GPT-4o Vision で手牌画像を認識するエージェント。
 * 比較検討用。通常運用は imageRecognitionAgent（Gemini）を利用すること。
 */
export const imageRecognitionGpt4oAgent = new Agent({
  name: 'Image Recognition GPT-4o Agent',
  instructions: `
あなたは麻雀の手牌画像を認識するエージェントです（GPT-4o 使用）。

- ユーザーが GCS の画像 URI（gs:// で始まる文字列）を送ったら、必ず recognize-shoupai-from-gcs-gpt4o ツールを呼び出してください。
- ツールの結果に含まれる shoupaiString を、ユーザーへの返答としてそのまま返してください。説明文は不要です。手牌文字列のみを返すことで、フロントエンドがそのまま手牌入力欄に反映できます。
- content が gs:// で始まっていない場合は「手牌画像の GCS URI（gs://...）を送ってください」と返してください。
`.trim(),
  model: 'openai/gpt-4o',
  tools: { recognizeShoupaiFromGcsGpt4oTool },
});

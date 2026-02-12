import { ChinitsuMachiGame as ChinitsuMachiGameComponent } from "@/components/waiting-game/chinitsu-machi";
import questionsData from "./data/questions.json";

/**
 * 清一色何待ちゲームの feature 側エントリ。
 * 描画は components に任せ、ここでは問題データを渡す。将来的にユーザー設定・課金状態から props を組み立てる。
 */
export function ChinitsuMachiGame() {
  const questions = questionsData as { shoupai: string; answer: string }[];
  return <ChinitsuMachiGameComponent questions={questions} />;
}

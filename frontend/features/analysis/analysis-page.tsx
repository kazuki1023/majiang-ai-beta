import { AnalysisPageContent } from "@/components/analysis";
import { getGameContent, getGameId } from "@/features/waiting-game";

// 将来的にこのコンポーネントでサーバーサイドのデータフェッチや
// 認証チェックなどの処理を行うことを想定しているため、
// AnalysisPageContent をラップする薄いレイヤーとして定義している。
// 待ち時間ゲームは features で組み立てたゲーム中身（ReactNode）を渡し、
// 枠・表示終了（辞める）は AnalysisPageContent 側で行う（onDismiss を親が受け取るため）。
export async function AnalysisPage() {
  const gameId = await getGameId();
  const waitingGameContent = getGameContent(gameId);
  return <AnalysisPageContent waitingGameContent={waitingGameContent} />;
}

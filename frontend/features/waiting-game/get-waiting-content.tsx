import type { ReactNode } from "react";
import { WaitingGameWithDismiss } from "../../components/waiting-game/WaitingGameWithDismiss";
import type { GameId } from "./types";
import { WaitingGameContent } from "./WaitingGameContent";

/**
 * 待ち時間に表示する組み立て済み ReactNode を返す。
 * Server で WaitingGameContent（game 部分）を組み立て、client の WaitingGameWithDismiss に children で渡す。
 * analysis-page が getGameId() の結果を渡し、得た ReactNode を AnalysisPageContent に渡す。
 */
export function getWaitingContent(gameId: GameId): ReactNode {
  return (
    <WaitingGameWithDismiss>
      <WaitingGameContent gameId={gameId} />
    </WaitingGameWithDismiss>
  );
}

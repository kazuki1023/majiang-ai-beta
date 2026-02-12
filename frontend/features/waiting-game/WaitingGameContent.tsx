import { getGameContent } from "./get-game-content";
import type { GameId } from "./types";

/**
 * 待ち時間用のゲーム中身だけを返す（server component）。
 * 枠・辞めるは WaitingGameWithDismiss（client）が担当する。
 */
export function WaitingGameContent({ gameId }: { gameId: GameId }) {
  return getGameContent(gameId);
}

import { ChinitsuMachiGame } from "@/features/waiting-game/chinitsu-machi";
import type { ReactNode } from "react";
import type { GameId } from "./types";

/**
 * 「どのゲームを表示するか」に応じて、そのゲームの ReactNode を返す。
 * データの切り替え・DB 参照は features 側の責務。
 * 各ゲームは features 配下の entry を返す。ゲームごとにユーザー設定・課金状態から props を変えられる。
 */
export function getGameContent(gameId: GameId): ReactNode {
  switch (gameId) {
    case "chinitsu-machi":
      return <ChinitsuMachiGame />;
    case "nanikiru-survey":
      // 将来実装
      return null;
    default:
      return null;
  }
}

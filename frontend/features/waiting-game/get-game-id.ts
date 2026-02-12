import type { GameId } from "./types";

/**
 * 待ち時間に表示するゲームを決める。
 * 現状は固定で chinitsu-machi。将来は server action でユーザー設定・課金を参照する。
 */
export async function getGameId(): Promise<GameId> {
  // 将来: 利用可能ゲーム一覧・ユーザー設定・課金に応じて gameId を返す
  return "chinitsu-machi";
}

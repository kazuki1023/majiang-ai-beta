"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

/** ゲーム内で「辞める」ボタン用に親から渡す onDismiss。Slot が Provider で渡す。 */
export const WaitingGameDismissContext = createContext<
  (() => void) | null
>(null);

export function useWaitingGameDismiss(): (() => void) | null {
  return useContext(WaitingGameDismissContext);
}

export interface WaitingGameSlotProps {
  /** 枠の中に表示するゲーム */
  children: ReactNode;
  /** 「辞める」を押したときに親に通知する。ゲーム内で Context 経由で参照される。 */
  onDismiss?: () => void;
}

/**
 * 待ち時間ゲーム用の枠。
 * onDismiss を Context で渡し、中身（ゲーム）は children で受け取る。
 * 表示するかどうかは受け取った client 側の条件分岐で行う（枠は表示非表示を司らない）。
 */
export function WaitingGameSlot({ children, onDismiss }: WaitingGameSlotProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800">
      <WaitingGameDismissContext.Provider value={onDismiss ?? null}>
        <div className="min-h-[120px]">{children}</div>
      </WaitingGameDismissContext.Provider>
    </div>
  );
}

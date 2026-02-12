"use client";

import { WaitingGameSlot } from "@/components/waiting-game/WaitingGameSlot";
import type { ReactNode } from "react";
import { useState } from "react";

/**
 * 辞めるで非表示にし、isBusy が false になるとアンマウントされて次回は再表示される（features 側の client）。
 * ゲーム中身（WaitingGameContent）は server で組み立てて children で渡す。
 */
export function WaitingGameWithDismiss({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <WaitingGameSlot onDismiss={() => setDismissed(true)}>
      {children}
    </WaitingGameSlot>
  );
}

"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import type { TileId } from "@/types";
import { useState } from "react";
import { BaopaiDialog } from "./BaopaiDialog";

/**
 * ドラ表示牌の選択UI。クリックでモーダルを開き、モーダル内で牌を追加・削除する。
 */
export interface BaopaiSelectorProps {
  /** 選択中のドラ表示牌（共通型 TileId の配列、順序は1枚目ドラ・2枚目カンドラ…） */
  baopai: TileId[];
  onBaopaiChange: (value: TileId[]) => void;
  disabled?: boolean;
}

function baopaiToPaistr(baopai: TileId[]): string {
  return baopai.join("");
}

export function BaopaiSelector({
  baopai,
  onBaopaiChange,
  disabled = false,
}: BaopaiSelectorProps) {
  const [open, setOpen] = useState(false);

  const openModal = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <>
      <div>
        <span
          id="baopai-label"
          className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
        >
          ドラ表示牌
        </span>
        <div
          role="button"
          tabIndex={0}
          onClick={disabled ? undefined : openModal}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              openModal();
            }
          }}
          aria-labelledby="baopai-label"
          aria-disabled={disabled}
          className={`mt-0.5 flex min-h-9 w-full min-w-0 items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-left text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:text-sm ${
            disabled
              ? "cursor-not-allowed opacity-40"
              : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
          }`}
        >
          {baopai.length === 0 ? (
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400 sm:text-xs md:text-sm">
              タップして選択
            </span>
          ) : (
            <ShoupaiDisplay
              paistr={baopaiToPaistr(baopai)}
              onRemoveAt={undefined}
              disabled
              className="pointer-events-none min-w-0 flex-1"
            />
          )}
          <span className="shrink-0 whitespace-nowrap text-2xs text-zinc-500 dark:text-zinc-400 sm:text-xs">
            {baopai.length}枚
          </span>
        </div>
      </div>

      <BaopaiDialog
        open={open}
        onOpenChange={() => setOpen(false)}
        baopai={baopai}
        onBaopaiChange={onBaopaiChange}
      />
    </>
  );
}

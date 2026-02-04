"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import { TILE_SET_BY_SUIT } from "@/lib/shoupai-utils";
import type { TileId } from "@/types";
import { useRef } from "react";
import { TileButton } from "./TileButton";

/**
 * ドラ表示牌の選択UI。クリックでモーダルを開き、モーダル内で牌を追加・削除する。
 */
export interface BaopaiSelectorProps {
  /** 選択中のドラ表示牌（共通型 TileId の配列、順序は1枚目ドラ・2枚目カンドラ…） */
  baopai: TileId[];
  onBaopaiChange: (value: TileId[]) => void;
  disabled?: boolean;
}

/** 牌ID配列をその順序で手牌文字列に変換（ドラの並びを保持） */
function baopaiToPaistr(baopai: TileId[]): string {
  return baopai.join("");
}

export function BaopaiSelector({
  baopai,
  onBaopaiChange,
  disabled = false,
}: BaopaiSelectorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openModal = () => {
    if (!disabled) dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const handleAddTile = (tileId: TileId) => {
    onBaopaiChange([...baopai, tileId]);
  };

  const handleRemoveAt = (index: number) => {
    onBaopaiChange(baopai.filter((_, i) => i !== index));
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

      <dialog
        ref={dialogRef}
        onCancel={closeModal}
        className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg backdrop:bg-black/20 dark:border-zinc-600 dark:bg-zinc-800 dark:backdrop:bg-black/40"
        aria-labelledby="baopai-modal-title"
        aria-modal="true"
      >
        <h2
          id="baopai-modal-title"
          className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
        >
          ドラ表示牌を選択
        </h2>

        <div className="mb-3">
          <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
            選択済み（タップで削除）
          </p>
          {baopai.length === 0 ? (
            <p className="min-h-10 text-sm text-zinc-400 dark:text-zinc-500">
              なし
            </p>
          ) : (
            <ShoupaiDisplay
              paistr={baopaiToPaistr(baopai)}
              onRemoveAt={handleRemoveAt}
              disabled={false}
              className="min-h-10"
            />
          )}
        </div>

        <div className="mb-4">
          <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
            牌を選んで追加
          </p>
          <div className="space-y-1.5 sm:space-y-2">
            {TILE_SET_BY_SUIT.map(({ suitLabel, tiles }) => (
              <div
                key={suitLabel}
                className="flex flex-wrap items-center gap-1 sm:gap-1.5"
              >
                <span className="w-6 shrink-0 text-[10px] font-medium text-zinc-500 sm:w-8 sm:text-xs dark:text-zinc-400">
                  {suitLabel}
                </span>
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {tiles.map((tile) => (
                    <TileButton
                      key={tile.id}
                      tileId={tile.id}
                      label={tile.label}
                      onClick={() => handleAddTile(tile.id)}
                      disabled={false}
                      title={tile.label}
                      ariaLabel={tile.label}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={closeModal}
            className="rounded bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
          >
            閉じる
          </button>
        </div>
      </dialog>
    </>
  );
}

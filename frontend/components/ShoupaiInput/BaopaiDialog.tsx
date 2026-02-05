"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import { TileButton } from "@/components/shoupai/TileButton";
import { TILE_SET_BY_SUIT } from "@/lib/shoupai-utils";
import type { TileId } from "@/types";
import { Dialog } from "@/components/ui/Dialog";

export interface BaopaiDialogProps {
  open: boolean;
  onOpenChange: (open: false) => void;
  baopai: TileId[];
  onBaopaiChange: (value: TileId[]) => void;
}

function baopaiToPaistr(baopai: TileId[]): string {
  return baopai.join("");
}

export function BaopaiDialog({
  open,
  onOpenChange,
  baopai,
  onBaopaiChange,
}: BaopaiDialogProps) {
  const handleAddTile = (tileId: TileId) => {
    onBaopaiChange([...baopai, tileId]);
  };

  const handleRemoveAt = (index: number) => {
    onBaopaiChange(baopai.filter((_, i) => i !== index));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="ドラ表示牌を選択"
      className="w-[calc(100vw-2rem)] max-w-lg rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
      footer={
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
          >
            閉じる
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
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

        <div>
          <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
            牌を選んで追加
          </p>
          <div className="space-y-1.5 sm:space-y-2">
            {TILE_SET_BY_SUIT.map(({ suitLabel, tiles }) => (
              <div
                key={suitLabel}
                className="flex w-full items-center gap-1 sm:gap-1.5"
              >
                <span className="w-6 shrink-0 text-[10px] font-medium text-zinc-500 sm:w-8 sm:text-xs dark:text-zinc-400">
                  {suitLabel}
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-0.5 sm:gap-1">
                  {tiles.map((tile) => (
                    <span key={tile.id} className="min-w-0 flex-1 basis-0">
                      <TileButton
                        tileId={tile.id}
                        label={tile.label}
                        onClick={() => handleAddTile(tile.id)}
                        disabled={false}
                        title={tile.label}
                        ariaLabel={tile.label}
                        className="aspect-9/14 w-full max-w-9 sm:max-w-10"
                      />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

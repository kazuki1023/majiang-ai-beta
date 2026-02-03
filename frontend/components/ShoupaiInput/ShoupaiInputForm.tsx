"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import { selectedTilesToShoupaiString, TILE_SET_BY_SUIT } from "@/lib/shoupai-utils";
import { TileButton } from "./TileButton";

/**
 * Presentation: 手牌入力フォームの見た目だけを担当する。
 * 牌ボタンで選択 → 選択した牌が並んで見える形式。
 */
export const ZHUANGFENG_LABELS = ["東", "南", "西", "北"] as const;
export const MENFENG_LABELS = ["東", "南", "西", "北"] as const;

export interface ShoupaiInputFormProps {
  /** 選択した手牌（牌IDの配列、最大14枚） */
  selectedTiles: string[];
  /** 場風: その局の風（0=東, 1=南, 2=西, 3=北） */
  zhuangfeng: number;
  /** 自風: 自分の席の風（0=東, 1=南, 2=西, 3=北） */
  menfeng: number;
  /** ドラ表示牌 */
  baopai: string;
  /** 巡目（0〜18程度） */
  xun: number;
  onAddTile: (tileId: string) => void;
  onRemoveAt: (index: number) => void;
  onZhuangfengChange: (value: number) => void;
  onMenfengChange: (value: number) => void;
  onBaopaiChange: (value: string) => void;
  onXunChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}

const MAX_HAND = 14;
const TILES_PER_TYPE = 4;

function countInHand(selectedTiles: string[], tileId: string): number {
  return selectedTiles.filter((id) => id === tileId).length;
}

function canAddTile(selectedTiles: string[], tileId: string): boolean {
  if (selectedTiles.length >= MAX_HAND) return false;
  return countInHand(selectedTiles, tileId) < TILES_PER_TYPE;
}

export function ShoupaiInputForm({
  selectedTiles,
  zhuangfeng,
  menfeng,
  baopai,
  xun,
  onAddTile,
  onRemoveAt,
  onZhuangfengChange,
  onMenfengChange,
  onBaopaiChange,
  onXunChange,
  onSubmit,
  disabled = false,
}: ShoupaiInputFormProps) {
  const canSubmit =
    selectedTiles.length === 13 || selectedTiles.length === 14;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* 選択した手牌の表示 */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          選択した手牌（{selectedTiles.length} /{MAX_HAND}）
        </label>
        <div
          className="min-h-10 sm:min-h-12 rounded-md border border-zinc-300 bg-zinc-50/50 px-2 py-1.5 sm:px-3 sm:py-2"
          aria-live="polite"
        >
          {selectedTiles.length === 0 ? (
            <p className="text-sm text-zinc-500 h-9">牌を下から選んでください</p>
          ) : (
            <div className="text-sm text-zinc-500 h-9">
              <ShoupaiDisplay
                paistr={selectedTilesToShoupaiString(selectedTiles)}
                onRemoveAt={onRemoveAt}
                disabled={disabled}
                className="mb-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* 牌セレクター（suit ごとに列で表示） */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          牌を選ぶ（クリックで追加）
        </label>
        <div className="space-y-1.5 sm:space-y-2">
          {TILE_SET_BY_SUIT.map(({ suitLabel, tiles }) => (
            <div key={suitLabel} className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              <span className="w-6 shrink-0 text-[10px] font-medium text-zinc-500 sm:w-8 sm:text-xs">
                {suitLabel}
              </span>
              <div className="flex flex-wrap gap-0.5 sm:gap-1">
                {tiles.map((tile) => {
                  const addable = canAddTile(selectedTiles, tile.id);
                  return (
                    <TileButton
                      key={tile.id}
                      tileId={tile.id}
                      label={tile.label}
                      onClick={() => addable && onAddTile(tile.id)}
                      disabled={disabled || !addable}
                      title={tile.label}
                      ariaLabel={tile.label}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div role="group" aria-labelledby="zhuangfeng-label">
            <span id="zhuangfeng-label" className="block text-xs font-medium text-zinc-600">
              場風
            </span>
            <div className="mt-0.5 flex gap-0.5 rounded border border-zinc-300 bg-zinc-50/50 p-0.5">
              {ZHUANGFENG_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onZhuangfengChange(i)}
                  disabled={disabled}
                  className={
                    "min-w-9 flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-0 " +
                    (zhuangfeng === i
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-500"
                      : "bg-white text-zinc-800 hover:bg-zinc-100 disabled:bg-zinc-100")
                  }
                  aria-pressed={zhuangfeng === i}
                  aria-label={`場風: ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-labelledby="menfeng-label">
            <span id="menfeng-label" className="block text-xs font-medium text-zinc-600">
              自風
            </span>
            <div className="mt-0.5 flex gap-0.5 rounded border border-zinc-300 bg-zinc-50/50 p-0.5">
              {MENFENG_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onMenfengChange(i)}
                  disabled={disabled}
                  className={
                    "min-w-9 flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-0 " +
                    (menfeng === i
                      ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-500"
                      : "bg-white text-zinc-800 hover:bg-zinc-100 disabled:bg-zinc-100")
                  }
                  aria-pressed={menfeng === i}
                  aria-label={`自風: ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="baopai" className="block text-xs font-medium text-zinc-600">
              ドラ表示牌
            </label>
            <input
              id="baopai"
              type="text"
              value={baopai}
              onChange={(e) => onBaopaiChange(e.target.value)}
              placeholder="s3"
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 bg-white"
              disabled={disabled}
            />
          </div>
          <div>
            <label htmlFor="xun" className="block text-xs font-medium text-zinc-600">
              巡目
            </label>
            <input
              id="xun"
              type="number"
              min={0}
              max={18}
              value={xun}
              onChange={(e) => onXunChange(Number(e.target.value) || 0)}
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm bg-white"
              disabled={disabled}
            />
          </div>
        </div>

      <button
        type="submit"
        disabled={disabled || !canSubmit}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
      >
        {disabled ? "分析中..." : "最適な打牌を分析する"}
      </button>
    </form>
  );
}

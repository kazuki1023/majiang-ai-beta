"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import { selectedTilesToShoupaiString, TILE_SET_BY_SUIT } from "@/lib/shoupai-utils";
import type { Feng, TileId } from "@/types";
import { BaopaiSelector } from "./BaopaiSelector";
import { LabeledButtonGroup } from "./LabeledButtonGroup";
import { TileButton } from "./TileButton";

/**
 * Presentation: 手牌入力フォームの見た目だけを担当する。
 * 牌ボタンで選択 → 選択した牌が並んで見える形式。
 * 場風・自風は共通型 Feng（0=東, 1=南, 2=西, 3=北）。
 */
export const ZHUANGFENG_LABELS = ["東", "南", "西", "北"] as const;
export const MENFENG_LABELS = ["東", "南", "西", "北"] as const;

export interface ShoupaiInputFormProps {
  /** 選択した手牌（牌IDの配列、最大14枚） */
  selectedTiles: TileId[];
  /** 場風（共通型 Feng） */
  zhuangfeng: Feng;
  /** 自風（共通型 Feng） */
  menfeng: Feng;
  /** ドラ表示牌（牌IDの配列、順序は1枚目ドラ・2枚目カンドラ…） */
  baopai: TileId[];
  /** 巡目（1〜18） */
  xun: number;
  onAddTile: (tileId: TileId) => void;
  onRemoveAt: (index: number) => void;
  onZhuangfengChange: (value: Feng) => void;
  onMenfengChange: (value: Feng) => void;
  onBaopaiChange: (value: TileId[]) => void;
  onXunChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}

const MAX_HAND = 14;
const TILES_PER_TYPE = 4;

/** 巡目: 1〜18。デフォルトは 7（親の ShoupaiInput で useState(7) を指定） */
export const XUN_MIN = 1;
export const XUN_MAX = 18;
export const DEFAULT_XUN = 7;

const XUN_OPTIONS = Array.from(
  { length: XUN_MAX - XUN_MIN + 1 },
  (_, i) => XUN_MIN + i
);

function countInHand(selectedTiles: TileId[], tileId: TileId): number {
  return selectedTiles.filter((id) => id === tileId).length;
}

function canAddTile(selectedTiles: TileId[], tileId: TileId): boolean {
  if (selectedTiles.length >= MAX_HAND) return false;
  return countInHand(selectedTiles, tileId) < TILES_PER_TYPE;
}

export function ShoupaiInputForm({
  selectedTiles,
  // 場風、自風、ドラ表示牌、は初期値を設定
  zhuangfeng = 0,
  menfeng = 0,
  baopai,
  xun = DEFAULT_XUN,
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
          className="min-h-10 sm:min-h-12 rounded-md border border-zinc-300 bg-zinc-50/50 px-1 py-1.5 md:px-3 md:py-2 h-8 flex items-center justify-start"
          aria-live="polite"
        >
          {selectedTiles.length === 0 ? (
            <p className="text-sm text-zinc-500">牌を下から選んでください</p>
          ) : (
            <div className="text-sm text-zinc-500">
              <ShoupaiDisplay
                paistr={selectedTilesToShoupaiString(selectedTiles)}
                onRemoveAt={onRemoveAt}
                disabled={disabled}
                className=""
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
          <LabeledButtonGroup
            label="場風"
            labelId="zhuangfeng-label"
            options={ZHUANGFENG_LABELS}
            value={zhuangfeng as Feng}
            onChange={(i) => onZhuangfengChange(i as Feng)}
            disabled={disabled}
            ariaLabelPrefix="場風: "
          />
          <LabeledButtonGroup
            label="自風"
            labelId="menfeng-label"
            options={MENFENG_LABELS}
            value={menfeng as Feng}
            onChange={(i) => onMenfengChange(i as Feng)}
            disabled={disabled}
            ariaLabelPrefix="自風: "
          />
          <BaopaiSelector
            baopai={baopai}
            onBaopaiChange={onBaopaiChange}
            disabled={disabled}
          />
          <div>
            <label htmlFor="xun" className="block text-xs font-medium text-zinc-600">
              巡目
            </label>
            <select
              id="xun"
              value={Math.max(XUN_MIN, Math.min(XUN_MAX, xun))}
              onChange={(e) => onXunChange(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={disabled}
              aria-label="巡目"
            >
              {XUN_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}巡
                </option>
              ))}
            </select>
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

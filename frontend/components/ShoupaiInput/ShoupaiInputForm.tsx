"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import { TileButton } from "@/components/shoupai/TileButton";
import { selectedTilesToShoupaiString, TILE_SET_BY_SUIT } from "@/lib/shoupai-utils";
import type { Feng, TileId } from "@/types";
import {
  DEFAULT_XUN,
  MAX_HAND,
  MENFENG_LABELS,
  TILES_PER_TYPE,
  XUN_MAX,
  XUN_MIN,
  ZHUANGFENG_LABELS,
} from "@/types";
import { BaopaiSelector } from "@/components/shoupai/BaopaiSelector";
import { FengButtonGroup } from "@/components/shoupai/FengButtonGroup";

/**
 * Presentation: 手牌入力フォームの見た目だけを担当する。
 * 牌ボタンで選択 → 選択した牌が並んで見える形式。
 * 場風・自風は共通型 Feng（0=東, 1=南, 2=西, 3=北）。
 */

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
  /** true のときアコーディオンを閉じる（分析送信後など）。閉じているときはヘッダー行のみ表示 */
  collapsed?: boolean;
  /** 「選択した手牌」ヘッダーをクリックしたときの開閉トグル */
  onToggle?: () => void;
}

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
  collapsed = false,
  onToggle,
}: ShoupaiInputFormProps) {
  const canSubmit =
    selectedTiles.length === 13 || selectedTiles.length === 14;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 md:gap-4">
      {/* アコーディオンのヘッダー（常に表示。クリックで開閉） */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center rounded-md gap-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors"
        aria-expanded={!collapsed}
        aria-controls="shoupai-accordion-body"
        id="shoupai-accordion-trigger"
      >
        <span
          className="shrink-0 text-zinc-500 transition-transform duration-200 dark:text-zinc-400"
          aria-hidden
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >
          ▼
        </span>
        <span>選択した手牌（{selectedTiles.length} / {MAX_HAND}）</span>
      </button>

      {/* アコーディオンの中身（手牌表示・牌セレクター・場況・分析ボタン） */}
      <div
        id="shoupai-accordion-body"
        role="region"
        aria-labelledby="shoupai-accordion-trigger"
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 pt-1 md:gap-4 md:pt-2">
            {/* 選択した手牌の表示 */}
            <div>
              <div
                className="min-h-10 sm:min-h-12 rounded-md border border-zinc-300 bg-zinc-50/50 px-1 py-1.5 md:px-3 md:py-2 h-8 flex items-center justify-start dark:border-zinc-600 dark:bg-zinc-800/50"
                aria-live="polite"
              >
                {selectedTiles.length === 0 ? (
                  <p className="text-sm text-zinc-500 w-full dark:text-zinc-400">牌を下から選んでください</p>
                ) : (
                  <div className="text-sm text-zinc-500 w-full dark:text-zinc-400">
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
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                牌を選ぶ（クリックで追加）
              </label>
              <div className="space-y-1.5 sm:space-y-2">
                {TILE_SET_BY_SUIT.map(({ suitLabel, tiles }) => (
                  <div key={suitLabel} className="flex w-full items-center gap-1 sm:gap-1.5">
                    <span className="w-6 shrink-0 text-[10px] font-medium text-zinc-500 sm:w-8 sm:text-xs dark:text-zinc-400">
                      {suitLabel}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-0.5 sm:gap-1">
                      {tiles.map((tile) => {
                        const addable = canAddTile(selectedTiles, tile.id);
                        return (
                          <span key={tile.id} className="min-w-0 flex-1 basis-0">
                            <TileButton
                              tileId={tile.id}
                              label={tile.label}
                              onClick={() => addable && onAddTile(tile.id)}
                              disabled={disabled || !addable}
                              title={tile.label}
                              ariaLabel={tile.label}
                              className="aspect-9/14 w-full max-w-9 sm:max-w-10"
                            />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1 md:mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FengButtonGroup
                label="場風"
                labelId="zhuangfeng-label"
                options={ZHUANGFENG_LABELS}
                value={zhuangfeng as Feng}
                onChange={(i) => onZhuangfengChange(i as Feng)}
                disabled={disabled}
                ariaLabelPrefix="場風: "
              />
              <FengButtonGroup
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
                <label htmlFor="xun" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {disabled ? "分析中..." : "最適な打牌を分析する"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

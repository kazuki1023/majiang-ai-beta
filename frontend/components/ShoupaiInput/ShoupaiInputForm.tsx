"use client";

import { getTileLabel, TILE_SET } from "@/lib/shoupai-utils";

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
          選択した手牌（{selectedTiles.length}枚 / 最大{MAX_HAND}枚）
        </label>
        <div
          className="min-h-[3rem] rounded-md border border-zinc-300 bg-zinc-50/50 px-3 py-2"
          aria-live="polite"
        >
          {selectedTiles.length === 0 ? (
            <p className="text-sm text-zinc-500">牌を下から選んでください</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {selectedTiles.map((tileId, index) => (
                <li key={`${tileId}-${index}`}>
                  <button
                    type="button"
                    onClick={() => onRemoveAt(index)}
                    disabled={disabled}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:opacity-50"
                    title={`${getTileLabel(tileId)} を削除`}
                    aria-label={`${getTileLabel(tileId)} を削除`}
                  >
                    {getTileLabel(tileId)} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 牌セレクター（各牌を押して追加） */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          牌を選ぶ（クリックで追加）
        </label>
        <div className="grid grid-cols-9 gap-1 sm:grid-cols-10">
          {TILE_SET.map((tile) => {
            const addable = canAddTile(selectedTiles, tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => addable && onAddTile(tile.id)}
                disabled={disabled || !addable}
                className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                title={tile.label}
                aria-label={tile.label}
              >
                {tile.label}
              </button>
            );
          })}
        </div>
      </div>

      <details className="rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          場風・自風・ドラ・巡目（任意）
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="zhuangfeng" className="block text-xs font-medium text-zinc-600">
              場風
            </label>
            <select
              id="zhuangfeng"
              value={zhuangfeng}
              onChange={(e) => onZhuangfengChange(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
              disabled={disabled}
            >
              {ZHUANGFENG_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="menfeng" className="block text-xs font-medium text-zinc-600">
              自風
            </label>
            <select
              id="menfeng"
              value={menfeng}
              onChange={(e) => onMenfengChange(Number(e.target.value))}
              className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
              disabled={disabled}
            >
              {MENFENG_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
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
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400"
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
              className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900"
              disabled={disabled}
            />
          </div>
        </div>
      </details>

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

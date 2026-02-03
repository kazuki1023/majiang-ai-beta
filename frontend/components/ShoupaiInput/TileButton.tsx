"use client";

/**
 * 牌ボタン（縦書き表示の共通スタイル）。
 * 選択した手牌の削除ボタンと、牌セレクターの追加ボタンの両方で利用する。
 */
export interface TileButtonProps {
  /** 表示する牌のラベル（例: 一萬, ②筒） */
  label: string;
  /** クリック時の処理 */
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  /** アクセシビリティ用。未指定時は label を使用 */
  ariaLabel?: string;
}

const TILE_BUTTON_CLASS =
  "flex items-center justify-center rounded border border-zinc-300 bg-white font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 [writing-mode:vertical-rl] [text-orientation:upright] h-8 w-5.5 min-w-4 text-[10px] sm:h-10 sm:w-7 sm:min-w-7 sm:text-xs";

export function TileButton({
  label,
  onClick,
  disabled = false,
  title,
  ariaLabel,
}: TileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={TILE_BUTTON_CLASS}
      title={title ?? label}
      aria-label={ariaLabel ?? label}
    >
      {label}
    </button>
  );
}

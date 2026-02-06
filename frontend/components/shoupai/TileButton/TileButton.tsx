"use client";

import type { TileId } from "@/types";
import Image from "next/image";

/**
 * 牌ボタン。画像で表示する。
 * 選択した手牌の削除と、牌セレクターの追加の両方で利用。
 * 場所ごとに className でサイズを指定できる（手牌は小さめ・セレクターは大きめで誤タップ防止）。
 */
export interface TileButtonProps {
  /** 表示する牌のラベル（例: 一萬, ②筒） */
  label: string;
  /** 表示する牌のID（共通型 TileId。例: m1, p2, s3, z4） */
  tileId: TileId;
  /** クリック時の処理 */
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  /** アクセシビリティ用。未指定時は label を使用 */
  ariaLabel?: string;
  /** サイズ・レイアウト用。未指定時はデフォルトサイズ（h-7 w-4.5 等） */
  className?: string;
}

const TILE_BUTTON_BASE =
  "flex items-center justify-center font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40";
const TILE_BUTTON_DEFAULT_SIZE =
  "h-7 w-4.5 mobile:h-8 mobile:w-5 md:h-10 md:w-7";

export function TileButton({
  label,
  tileId,
  onClick,
  disabled = false,
  title,
  ariaLabel,
  className,
}: TileButtonProps) {
  const sizeClass = className ?? TILE_BUTTON_DEFAULT_SIZE;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${TILE_BUTTON_BASE} ${sizeClass}`.trim()}
      title={title ?? label}
      aria-label={ariaLabel ?? label}
    >
      <span className="relative block size-full min-h-[24px] min-w-[18px]">
        <Image
          src={`/pai/${tileId}.gif`}
          alt={label}
          fill
          className="object-contain"
          sizes="(min-width: 640px) 40px, (min-width: 350px) 28px, 22px"
        />
      </span>
    </button>
  );
}

"use client";

import type { TileId } from "@/types";
import Image from "next/image";

/**
 * 牌ボタン。ラベル（縦書き）で表示する。
 * 選択した手牌の削除ボタンと、牌セレクターの追加ボタンの両方で利用する。
 * 将来 civillink 等の牌画像を導入した場合は、ここで画像表示に差し替える想定。
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
}

const TILE_BUTTON_CLASS =
  "flex items-center justify-center font-medium text-zinc-800 shadow-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 h-7 w-4.5 mobile:h-8 mobile:w-5.5 sm:h-10 sm:w-7";

export function TileButton({
  label,
  tileId,
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
      <span className="relative block h-7 w-5 mobile:h-8 mobile:w-5 sm:h-10 sm:w-7">
        <Image
          src={`/pai/${tileId}.gif`}
          alt={label}
          fill
          className="object-contain"
          sizes="(min-width: 640px) 28px, (min-width: 350px) 22px, 18px"
        />
      </span>
    </button>
  );
}

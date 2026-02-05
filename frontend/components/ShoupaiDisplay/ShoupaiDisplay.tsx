"use client";

import { TileButton } from "@/components/ShoupaiInput/TileButton";
import { getTileLabel, shoupaiStringToTileIds } from "@/lib/shoupai-utils";
import type { ShoupaiString } from "@/types";

/**
 * 手牌のビジュアル表示。
 * - 手牌文字列（共通型 ShoupaiString。例: m123p456s789z1234）を受け取り、牌ボタン風に並べて表示する。
 * - onRemoveAt を渡すと各牌をクリックして削除できる。
 */
export interface ShoupaiDisplayProps {
  /** 手牌文字列（共通型 ShoupaiString。例: m123p456s789z12） */
  paistr: ShoupaiString;
  /** 表示エリアに付与するクラス名 */
  className?: string;
  /** 指定インデックスの牌を削除する（渡すと牌がクリック可能になる） */
  onRemoveAt?: (index: number) => void;
  /** 操作無効化（分析中等） */
  disabled?: boolean;
}

export function ShoupaiDisplay({
  paistr,
  className,
  onRemoveAt,
  disabled = false,
}: ShoupaiDisplayProps) {
  const tileIds = shoupaiStringToTileIds(paistr ?? "");

  if (tileIds.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <ul
        className="flex w-full flex-nowrap gap-0.5 md:gap-1.5"
        aria-label="手牌"
      >
        {tileIds.map((tileId, index) => (
          <li
            key={`${tileId}-${index}`}
            className="shrink-0 grow-0 basis-[calc((100%-1.625rem)/14)] md:basis-[calc((100%-4.875rem)/14)]"
          >
            <TileButton
              label={getTileLabel(tileId)}
              tileId={tileId}
              onClick={() => onRemoveAt?.(index)}
              disabled={disabled || !onRemoveAt}
              title={onRemoveAt ? `${getTileLabel(tileId)} を削除` : undefined}
              ariaLabel={getTileLabel(tileId)}
              className="aspect-9/14 w-full max-h-9 md:max-h-10"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

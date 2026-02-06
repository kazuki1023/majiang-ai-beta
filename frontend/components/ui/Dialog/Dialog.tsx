"use client";

import { FocusTrap } from "focus-trap-react";
import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: false) => void;
  /** ダイアログの見出し（aria-labelledby で参照する要素のテキスト） */
  title: string;
  /** 見出しに付ける id（未指定時は自動生成） */
  titleId?: string;
  /** 説明に付ける id（aria-describedby 用。省略可） */
  descriptionId?: string;
  children: React.ReactNode;
  /** 閉じるボタンなどフッター部分 */
  footer?: React.ReactNode;
  /** パネルに付与するクラス名 */
  className?: string;
}

/**
 * 汎用モーダルダイアログ。
 * - フォーカス trap（focus-trap-react）
 * - Escape で閉じる
 * - オーバーレイクリックで閉じる
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  titleId: titleIdProp,
  descriptionId,
  children,
  footer,
  className,
}: DialogProps) {
  const generatedId = useId();
  const titleId = titleIdProp ?? `dialog-title-${generatedId}`;

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId ?? undefined}
      onClick={handleClose}
    >
      <FocusTrap
        focusTrapOptions={{
          allowOutsideClick: true,
          clickOutsideDeactivates: false,
        }}
      >
        <div
          role="document"
          className={
            className ??
            "w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
          }
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            id={titleId}
            className="text-base font-semibold text-zinc-800 dark:text-zinc-100"
          >
            {title}
          </h2>
          <div className="mt-2">{children}</div>
          {footer != null && <div className="mt-4">{footer}</div>}
        </div>
      </FocusTrap>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(overlay, document.body);
  }
  return overlay;
}

"use client";

/**
 * ラベル付きの選択ボタン群（場風・自風などで共通利用）
 */
export interface LabeledButtonGroupProps {
  /** グループのラベル（例: 場風, 自風） */
  label: string;
  /** アクセシビリティ用の id（aria-labelledby で参照） */
  labelId: string;
  /** 各ボタンの表示ラベル */
  options: readonly string[];
  /** 選択中のインデックス（0-based） */
  value: number;
  onChange: (index: number) => void;
  disabled?: boolean;
  /** 各ボタンの aria-label の接頭辞（例: "場風: "） */
  ariaLabelPrefix?: string;
}

const BUTTON_BASE =
  "min-w-9 flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-0 ";
const BUTTON_SELECTED =
  "bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-500";
const BUTTON_UNSELECTED =
  "bg-white text-zinc-800 hover:bg-zinc-100 disabled:bg-zinc-100";

export function LabeledButtonGroup({
  label,
  labelId,
  options,
  value,
  onChange,
  disabled = false,
  ariaLabelPrefix = "",
}: LabeledButtonGroupProps) {
  return (
    <div role="group" aria-labelledby={labelId}>
      <span
        id={labelId}
        className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label}
      </span>
      <div className="mt-0.5 flex gap-0.5 rounded border border-zinc-300 bg-zinc-50/50 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/50">
        {options.map((optionLabel, i) => (
          <button
            key={optionLabel}
            type="button"
            onClick={() => onChange(i)}
            disabled={disabled}
            className={
              BUTTON_BASE +
              (value === i ? BUTTON_SELECTED : BUTTON_UNSELECTED)
            }
            aria-pressed={value === i}
            aria-label={ariaLabelPrefix + optionLabel}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

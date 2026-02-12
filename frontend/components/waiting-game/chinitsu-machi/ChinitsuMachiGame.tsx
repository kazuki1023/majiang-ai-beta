"use client";

import { ShoupaiDisplay } from "@/components/ShoupaiDisplay";
import { useWaitingGameDismiss } from "@/components/waiting-game/WaitingGameSlot";
import { useCallback, useState } from "react";

export interface ChinitsuMachiQuestion {
  shoupai: string;
  /** 正解。単一なら "3"、複数待ちなら "2,5"、ノーテンなら "0" */
  answer: string;
}

export interface ChinitsuMachiGameProps {
  questions: ChinitsuMachiQuestion[];
}

/** 正解文字列をソート済みの Set に変換（"0" / "3" / "2,5" → Set） */
function parseAnswerSet(answer: string): Set<string> {
  if (answer === "0") return new Set(["0"]);
  return new Set(
    answer
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .sort()
  );
}

/** 正解の表示用テキスト */
function formatAnswerDisplay(answer: string): string {
  if (answer === "0") return "ノーテン（テンパイしていない）";
  const parts = answer.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return `${answer} 待ち`;
  return `${parts.join(" と ")} 待ち`;
}

/** 電卓風の並び: 7 8 9 / 4 5 6 / 1 2 3 / 0 */
const NUMBER_GRID = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0"],
];

/**
 * 清一色何待ちゲーム。
 * 待ち牌（1〜9）を複数選択可能。ノーテンは 0 を選択。
 */
export function ChinitsuMachiGame({ questions }: ChinitsuMachiGameProps) {
  const onDismiss = useWaitingGameDismiss();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState(false);

  const toggle = useCallback(
    (num: string) => {
      if (answered) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(num)) next.delete(num);
        else next.add(num);
        return next;
      });
    },
    [answered]
  );

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        問題がありません
      </div>
    );
  }

  const q = questions[index];
  const answerSet = parseAnswerSet(q.answer);
  const isCorrect =
    answered &&
    selected.size === answerSet.size &&
    [...selected].sort().join(",") === [...answerSet].sort().join(",");
  const showResult = answered;

  const handleAnswer = () => {
    if (selected.size === 0) return;
    setAnswered(true);
  };

  const handleNext = () => {
    setIndex((i) => (i + 1) % questions.length);
    setSelected(new Set());
    setAnswered(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="shrink-0">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              辞める
            </button>
          )}
        </div>
        <p className="shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          第{index + 1}問
        </p>
        <div className="w-16 shrink-0 text-right">
          <button
            type="button"
            onClick={handleNext}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            次へ
          </button>
        </div>
      </div>

      <div key={index} className="animate-fade-in-up space-y-4">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          何待ち？ (ノーテンは 0 を選択)
        </p>

        <div>
          <ShoupaiDisplay paistr={q.shoupai} className="justify-center" />
        </div>

      {/* 正誤・答えは手牌と数字入力の間 */}
      {showResult && (
        <div className="space-y-1 rounded border border-zinc-200 bg-zinc-50 py-2 dark:border-zinc-600 dark:bg-zinc-800/50">
          <p
            className={`text-center text-sm font-medium ${
              isCorrect
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
            role="status"
          >
            {isCorrect ? "正解！" : "不正解"}
          </p>
          {!isCorrect && (
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              正解は {formatAnswerDisplay(q.answer)} です
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {NUMBER_GRID.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => toggle(num)}
                disabled={answered}
                className={`h-12 w-12 shrink-0 rounded border border-zinc-300 text-base font-medium transition-colors dark:border-zinc-600 ${
                  selected.has(num)
                    ? "border-zinc-600 bg-zinc-200 text-zinc-900 dark:border-zinc-400 dark:bg-zinc-600 dark:text-zinc-100"
                    : "bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                } ${answered ? "opacity-70" : ""}`}
                title={
                  num === "0" ? "ノーテン（テンパイしていない）" : undefined
                }
              >
                {num}
              </button>
            ))}
          </div>
        ))}
      </div>

      {!showResult && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleAnswer}
            disabled={selected.size === 0}
            className="rounded border border-zinc-400 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 hover:enabled:bg-zinc-200 disabled:opacity-50 dark:border-zinc-500 dark:bg-zinc-600 dark:text-zinc-200 dark:hover:enabled:bg-zinc-500"
          >
            回答する
          </button>
        </div>
      )}
      </div>
      {/* 回答後の正誤・答えは手牌と数字入力の間に表示済み */}
    </div>
  );
}

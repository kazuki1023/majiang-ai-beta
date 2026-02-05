"use client";

import {
  selectedTilesToShoupaiString,
  shoupaiStringToTileIds,
  sortTileIdsByDisplayOrder,
} from "@/lib/shoupai-utils";
import type { Feng, ShoupaiString, TileId } from "@/types";
import { DEFAULT_XUN, MENFENG_LABELS, ZHUANGFENG_LABELS } from "@/types";
import { useState } from "react";
import { ShoupaiInputForm } from "./ShoupaiInputForm";

/**
 * Container: 手牌入力の状態とロジックを担当する。
 * 牌ボタンで選択した配列を手牌文字列に変換し、親の onSubmit(content) に渡す。
 */
export interface ShoupaiInputProps {
  /** 分析実行時に呼ばれる。content は「手牌: m123p...」形式のメッセージ本文 */
  onSubmit: (content: string) => void;
  /** 分析中は true。親がローディング状態を渡す */
  disabled?: boolean;
  /** 初期手牌（例: 画像認識結果）。渡すとその牌で入力欄を初期化し、変更時は再同期する */
  initialShoupaiString?: ShoupaiString;
}

function buildAnalysisMessage(
  shoupai: string,
  zhuangfeng: Feng,
  menfeng: Feng,
  baopai: TileId[],
  xun: number
): string {
  if (!shoupai) return "";

  const parts: string[] = [`手牌: ${shoupai}`];
  parts.push(`場風: ${ZHUANGFENG_LABELS[zhuangfeng]}`);
  parts.push(`自風: ${MENFENG_LABELS[menfeng]}`);
  if (baopai.length > 0) parts.push(`ドラ表示牌: ${baopai.join(",")}`);
  parts.push(`巡目: ${xun}`);
  parts.push("の最適な打牌を教えてください");
  return parts.join("、");
}

export function ShoupaiInput({
  onSubmit,
  disabled = false,
  initialShoupaiString,
}: ShoupaiInputProps) {
  const [selectedTiles, setSelectedTiles] = useState<TileId[]>(() =>
    initialShoupaiString ? shoupaiStringToTileIds(initialShoupaiString) : []
  );
  const [zhuangfeng, setZhuangfeng] = useState<Feng>(0);
  const [menfeng, setMenfeng] = useState<Feng>(0);
  const [baopai, setBaopai] = useState<TileId[]>([]);
  const [xun, setXun] = useState(DEFAULT_XUN);
  const [collapsed, setCollapsed] = useState(false);

  const handleAddTile = (tileId: TileId) => {
    setSelectedTiles((prev) => sortTileIdsByDisplayOrder([...prev, tileId]));
  };

  const handleRemoveAt = (index: number) => {
    setSelectedTiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const shoupai = selectedTilesToShoupaiString(selectedTiles);
    const content = buildAnalysisMessage(shoupai, zhuangfeng, menfeng, baopai, xun);
    if (content) {
      onSubmit(content);
      setCollapsed(true);
    }
  };

  return (
    <ShoupaiInputForm
      selectedTiles={selectedTiles}
      zhuangfeng={zhuangfeng}
      menfeng={menfeng}
      baopai={baopai}
      xun={xun}
      onAddTile={handleAddTile}
      onRemoveAt={handleRemoveAt}
      onZhuangfengChange={setZhuangfeng}
      onMenfengChange={setMenfeng}
      onBaopaiChange={setBaopai}
      onXunChange={setXun}
      onSubmit={handleSubmit}
      disabled={disabled}
      collapsed={collapsed}
      onToggle={() => setCollapsed((prev) => !prev)}
    />
  );
}

"use client";

import type { ReactNode } from "react";
import { AnalysisResult } from "@/components/analysis/AnalysisResult";
import { ImageUpload } from "@/components/ImageUpload";
import { ShoupaiInput } from "@/components/ShoupaiInput";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import { WaitingGameSlot } from "@/components/waiting-game/WaitingGameSlot";
import { useAnalysisChat } from "@/hooks/use-analysis-chat";
import { useImageRecognition } from "@/hooks/use-image-recognition";
import { useEffect, useState } from "react";
import { ChatErrorAlert } from "./ChatErrorAlert";
import { ChatStatusBar } from "./ChatStatusBar";

const TAB_IMAGE = "image";
const TAB_MANUAL = "manual";

export interface AnalysisPageContentProps {
  /** 待ち時間に表示するゲーム中身（枠なし）。features で getGameContent(gameId) した結果を渡す。表示終了は「辞める」で行う。 */
  waitingGameContent?: ReactNode | null;
}

/** 手牌分析の入力・結果ブロック（Client）。hooks はここで呼び、レイアウトは page が担当。 */
export function AnalysisPageContent({
  waitingGameContent = null,
}: AnalysisPageContentProps) {
  const [activeTab, setActiveTab] = useState(TAB_IMAGE);
  const [showWaitingGame, setShowWaitingGame] = useState(false);
  const imageRecognition = useImageRecognition();
  const { chatState, resultText, error, handleSubmit, handleCancel } =
    useAnalysisChat();

  // 表示開始: アップロード/認識が始まったら表示。表示終了: ユーザーが「辞める」を押すまで続ける（設計どおり）
  useEffect(() => {
    if (imageRecognition.statusPhase !== "idle") {
      setShowWaitingGame(true);
    }
  }, [imageRecognition.statusPhase]);

  return (
    <>
      <section>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab value={TAB_IMAGE}>写真から</Tab>
            <Tab value={TAB_MANUAL}>手で入力</Tab>
          </TabList>
          <TabPanel value={TAB_IMAGE}>
            <ImageUpload
              imageRecognition={imageRecognition}
              onSubmit={handleSubmit}
              submitDisabled={chatState !== "idle"}
            />
          </TabPanel>
          <TabPanel value={TAB_MANUAL}>
            <ShoupaiInput
              onSubmit={handleSubmit}
              submitDisabled={chatState !== "idle"}
            />
          </TabPanel>
        </Tabs>
      </section>

      <ChatStatusBar chatState={chatState} onCancel={handleCancel} />

      {error && <ChatErrorAlert error={error} />}

      {showWaitingGame && waitingGameContent != null && (
        <WaitingGameSlot onDismiss={() => setShowWaitingGame(false)}>
          {waitingGameContent}
        </WaitingGameSlot>
      )}

      {(resultText || chatState === "streaming") && (
        <AnalysisResult
          content={resultText}
          isStreaming={chatState === "streaming"}
          title="分析結果"
        />
      )}
    </>
  );
}

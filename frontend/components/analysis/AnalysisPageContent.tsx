"use client";

import { AnalysisResult } from "@/components/analysis/AnalysisResult";
import { ImageUpload } from "@/components/ImageUpload";
import { ShoupaiInput } from "@/components/ShoupaiInput";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/Tabs";
import { useState } from "react";
import { useAnalysisChat } from "@/hooks/use-analysis-chat";
import { ChatErrorAlert } from "./ChatErrorAlert";
import { ChatStatusBar } from "./ChatStatusBar";

const TAB_IMAGE = "image";
const TAB_MANUAL = "manual";

/** 手牌分析の入力・結果ブロック（Client）。hooks はここで呼び、レイアウトは page が担当。 */
export function AnalysisPageContent() {
  const [activeTab, setActiveTab] = useState(TAB_IMAGE);
  const { chatState, resultText, error, handleSubmit, handleCancel } =
    useAnalysisChat();

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

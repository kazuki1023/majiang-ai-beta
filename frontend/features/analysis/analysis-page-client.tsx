"use client";

import { AnalysisResult } from "@/components/AnalysisResult";
import { ImageUpload } from "@/components/ImageUpload";
import { ShoupaiInput } from "@/components/ShoupaiInput";
import { Tab, TabList, TabPanel, Tabs } from "@/components/Tabs";
import { useState } from "react";
import { ChatErrorAlert } from "./ChatErrorAlert";
import { ChatStatusBar } from "./ChatStatusBar";
import { useAnalysisChat } from "@/hooks/use-analysis-chat";

const TAB_IMAGE = "image";
const TAB_MANUAL = "manual";

/** 手牌分析の入力・結果ブロック（Client Component）。レイアウト（main 等）は page が担当する。 */
export function AnalysisPageClient() {
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
            <ImageUpload onSubmit={handleSubmit} disabled={chatState !== "idle"} />
          </TabPanel>
          <TabPanel value={TAB_MANUAL}>
            <ShoupaiInput onSubmit={handleSubmit} disabled={chatState !== "idle"} />
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

"use client";

import {
  createContext,
  useContext,
  useId,
  type ReactNode
} from "react";

type TabsContextValue = {
  value: string;
  onChange: (value: string) => void;
  tabListId: string;
  getTabId: (value: string) => string;
  getPanelId: (value: string) => string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs の子要素は Tabs 内で使用してください");
  return ctx;
}

export interface TabsProps {
  /** 現在選択されているタブの value */
  value: string;
  /** タブ切り替え時のコールバック */
  onChange: (value: string) => void;
  children: ReactNode;
}

export function Tabs({ value, onChange, children }: TabsProps) {
  const id = useId();
  const tabListId = `tabs-${id.replace(/:/g, "")}-list`;
  const getTabId = (v: string) => `tabs-${id.replace(/:/g, "")}-tab-${v}`;
  const getPanelId = (v: string) => `tabs-${id.replace(/:/g, "")}-panel-${v}`;

  return (
    <TabsContext.Provider
      value={{
        value,
        onChange,
        tabListId,
        getTabId,
        getPanelId,
      }}
    >
      <div className="w-full">{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  const { tabListId } = useTabs();
  return (
    <div
      id={tabListId}
      className={
        className ??
        "flex flex-row gap-0 rounded-t-lg border border-b-0 border-zinc-300 bg-zinc-100/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/80"
      }
      role="tablist"
      aria-label="入力方法"
    >
      {children}
    </div>
  );
}

export interface TabProps {
  /** タブの値（TabPanel の value と一致させる） */
  value: string;
  children: ReactNode;
  className?: string;
}

export function Tab({ value, children, className }: TabProps) {
  const { value: activeValue, onChange, getTabId, getPanelId } = useTabs();
  const isSelected = activeValue === value;
  return (
    <button
      type="button"
      role="tab"
      id={getTabId(value)}
      aria-selected={isSelected}
      aria-controls={getPanelId(value)}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onChange(value)}
      className={
        className ??
        `rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          isSelected
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        }`
      }
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  /** タブの値（Tab の value と一致させる） */
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: activeValue, getTabId, getPanelId } = useTabs();
  const isSelected = activeValue === value;
  return (
    <div
      role="tabpanel"
      id={getPanelId(value)}
      aria-labelledby={getTabId(value)}
      hidden={!isSelected}
      className={
        className ??
        "rounded-b-lg border border-t-0 border-zinc-300 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-800 md:p-4"
      }
    >
      {isSelected ? children : null}
    </div>
  );
}

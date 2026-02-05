/**
 * Markdown レンダリング（react-markdown + remark-gfm に依存）。
 */
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownClasses = {
  p: "mb-2 last:mb-0 text-zinc-800 dark:text-zinc-200",
  h1: "mb-2 mt-4 text-base font-semibold text-zinc-800 dark:text-zinc-200 first:mt-0",
  h2: "mb-2 mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 first:mt-0",
  h3: "mb-1 mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 first:mt-0",
  ul: "mb-2 ml-4 list-disc text-zinc-800 dark:text-zinc-200",
  ol: "mb-2 ml-4 list-decimal text-zinc-800 dark:text-zinc-200",
  li: "my-0.5",
  table: "mb-3 w-full border-collapse text-sm text-zinc-800 dark:text-zinc-200",
  thead: "border-b border-zinc-300 dark:border-zinc-600",
  th: "border-b border-r border-zinc-300 px-2 py-1.5 text-left font-medium last:border-r-0 dark:border-zinc-600",
  td: "border-b border-r border-zinc-200 px-2 py-1.5 last:border-r-0 dark:border-zinc-700",
  tr: "last:border-b-0",
  code: "rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs dark:bg-zinc-700",
  pre: "mb-2 overflow-x-auto rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-800",
  strong: "font-semibold text-zinc-800 dark:text-zinc-200",
  blockquote:
    "border-l-4 border-zinc-300 pl-2 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
};

const markdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className={markdownClasses.p}>{children}</p>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className={markdownClasses.h1}>{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className={markdownClasses.h2}>{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className={markdownClasses.h3}>{children}</h3>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className={markdownClasses.ul}>{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className={markdownClasses.ol}>{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className={markdownClasses.li}>{children}</li>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <table className={markdownClasses.table}>{children}</table>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className={markdownClasses.thead}>{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className={markdownClasses.th}>{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className={markdownClasses.td}>{children}</td>
  ),
  tr: ({ children }: { children?: ReactNode }) => (
    <tr className={markdownClasses.tr}>{children}</tr>
  ),
  code: ({ children, ...props }: { children?: ReactNode }) => (
    <code className={markdownClasses.code} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className={markdownClasses.pre}>{children}</pre>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className={markdownClasses.strong}>{children}</strong>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className={markdownClasses.blockquote}>{children}</blockquote>
  ),
};

export interface MarkdownContentProps {
  /** 表示する Markdown テキスト */
  content: string;
  /** ラッパーに付与するクラス名 */
  className?: string;
}

/**
 * Markdown 文字列をレンダリングする。GFM（表・リスト等）対応。
 * 利用側は react-markdown / remark-gfm に直接依存しない。
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

import { AnalysisPageClient } from "@/features/analysis";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-1 mobile:px-2 py-2 font-sans dark:bg-zinc-900 md:px-4 md:py-4">
      <main className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-0 md:mb-4">
          手牌分析
        </h1>
        <AnalysisPageClient />
      </main>
    </div>
  );
}

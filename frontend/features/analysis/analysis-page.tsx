import { AnalysisPageContent } from "@/components/analysis";


// 将来的にこのコンポーネントでサーバーサイドのデータフェッチや
// 認証チェックなどの処理を行うことを想定しているため、
// AnalysisPageContent をラップする薄いレイヤーとして定義している。
export function AnalysisPage() {
  return <AnalysisPageContent />;
}

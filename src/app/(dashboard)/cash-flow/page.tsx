import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Cash flow" };

export default function Page() {
  return <ComingSoon title="Cash flow" phase="phase 3" bullets={["Sankey from income to categories", "3- and 12-month category trends with >25% drift flags", "50/30/20 lens and savings rate", "Per-category MAD anomaly detection"]} />;
}

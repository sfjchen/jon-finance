import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Net worth" };

export default function Page() {
  return <ComingSoon title="Net worth" phase="phase 5" bullets={["History from daily balance snapshots", "Month-over-month split: contributions vs market", "Emergency-fund months from essential spend", "Post-grad salary / city scenario model"]} />;
}

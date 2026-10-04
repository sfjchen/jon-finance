import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Reports" };

export default function Page() {
  return <ComingSoon title="Reports" phase="phase 6" bullets={["On-demand monthly narrative with deep-linked numbers", "Report history", "Read-only MCP server so Claude can query the ledger"]} />;
}

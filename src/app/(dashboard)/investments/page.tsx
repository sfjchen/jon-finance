import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Investments" };

export default function Page() {
  return <ComingSoon title="Investments" phase="phase 5" bullets={["Taxable | Roth tabs", "TWR and XIRR vs a VTI replay of your own cash flows", "Stock/bond and US/intl allocation with 5/25 drift", "Holdings treemap, lots, wash-sale scan across accounts, Roth contribution room"]} />;
}

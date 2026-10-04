import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Recurring" };

export default function Page() {
  return <ComingSoon title="Recurring" phase="phase 3" bullets={["Subscription and bill detection by merchant periodicity", "Price-creep alerts (latest > median × 1.1)", "Upcoming charges next 14 days", "Zombie subscriptions"]} />;
}

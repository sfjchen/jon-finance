import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { money, moneyCompact, monthLabel, shortDate } from "@/lib/format";
import { Amount, Delta } from "@/components/amount";
import { KpiTile } from "@/components/kpi-tile";
import { Sparkline } from "@/components/sparkline";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function thirtyDaysAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default async function HomePage() {
  const { supabase } = await requireOwner();

  const [{ data: accounts }, { data: nw }, { data: months }, { count: reviewCount }, { data: recent }, { count: txnCount }] = await Promise.all([
    supabase.from("accounts").select("id, kind, current_balance, include_in_net_worth, is_active"),
    supabase.from("v_net_worth_daily").select("as_of, net_worth, cash, invested, liabilities").order("as_of", { ascending: true }).limit(400),
    supabase.from("v_monthly_cash_flow").select("month, income, spending, needs, wants").order("month", { ascending: false }).limit(7),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("needs_review", true),
    supabase.from("v_ledger").select("id, posted_date, merchant_norm, raw_description, amount, category_name, category_color, account_name, logo_url").order("posted_date", { ascending: false }).limit(8),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const active = (accounts ?? []).filter((a) => a.is_active && a.include_in_net_worth);
  const assets = active.filter((a) => a.kind !== "credit" && a.kind !== "loan").reduce((s, a) => s + Number(a.current_balance ?? 0), 0);
  const liabilities = active.filter((a) => a.kind === "credit" || a.kind === "loan").reduce((s, a) => s + Number(a.current_balance ?? 0), 0);
  const netWorth = assets - liabilities;
  const cash = active.filter((a) => a.kind === "depository").reduce((s, a) => s + Number(a.current_balance ?? 0), 0);
  const invested = active.filter((a) => a.kind === "investment").reduce((s, a) => s + Number(a.current_balance ?? 0), 0);

  const series = (nw ?? []).map((r) => Number(r.net_worth ?? 0));
  const cutoff = thirtyDaysAgoIso();
  const thirtyAgo = (nw ?? []).find((r) => String(r.as_of) >= cutoff);
  const nwDelta = thirtyAgo ? netWorth - Number(thirtyAgo.net_worth ?? 0) : null;

  const sorted = [...(months ?? [])].sort((a, b) => String(a.month).localeCompare(String(b.month)));
  const thisMonth = sorted[sorted.length - 1];
  const lastMonth = sorted[sorted.length - 2];
  const spendDelta = thisMonth && lastMonth ? Number(thisMonth.spending ?? 0) - Number(lastMonth.spending ?? 0) : null;
  const maxBar = Math.max(1, ...sorted.map((m) => Math.max(Number(m.income ?? 0), Number(m.spending ?? 0))));

  const empty = (txnCount ?? 0) === 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net worth</p>
          <p className="text-4xl font-semibold tracking-tight tabular-nums mt-1">{money(netWorth)}</p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Delta value={nwDelta} /> <span>past 30 days</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Sparkline points={series.length ? series : [netWorth, netWorth]} width={200} height={48} />
          <div className="text-xs text-muted-foreground space-y-0.5 tabular-nums">
            <div>Cash <span className="text-foreground">{moneyCompact(cash)}</span></div>
            <div>Invested <span className="text-foreground">{moneyCompact(invested)}</span></div>
            <div>Owed <span className="text-foreground">{moneyCompact(liabilities)}</span></div>
          </div>
        </div>
      </section>

      {empty ? (
        <Card className="p-6 shadow-none">
          <h2 className="font-medium">No data yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Link your first account to start syncing transactions, balances and holdings.</p>
          <Button asChild className="mt-4"><Link href="/accounts">Go to Accounts</Link></Button>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Spent this month" value={moneyCompact(thisMonth?.spending ?? 0)} sub={spendDelta !== null ? <Delta value={-spendDelta} className="text-xs" /> : "vs last month"} />
        <KpiTile label="Income this month" value={moneyCompact(thisMonth?.income ?? 0)} sub={thisMonth ? monthLabel(String(thisMonth.month)) : undefined} />
        <KpiTile label="Net cash flow" value={moneyCompact(Number(thisMonth?.income ?? 0) - Number(thisMonth?.spending ?? 0))} sub="income − spending" />
        <KpiTile label="To review" value={reviewCount ?? 0} sub={<Link href="/transactions?review=1" className="underline underline-offset-2">open queue</Link>} />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="p-4 shadow-none lg:col-span-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Cash flow, last 6 months</h2>
            <span className="text-xs text-muted-foreground">income vs spending</span>
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2 items-end h-40">
            {sorted.slice(-6).map((m) => {
              const inc = Number(m.income ?? 0), sp = Number(m.spending ?? 0);
              return (
                <div key={String(m.month)} className="flex flex-col items-center gap-1 h-full justify-end">
                  <div className="flex items-end gap-1 h-full w-full justify-center">
                    <div className="w-3 rounded-sm bg-emerald-600/80" style={{ height: `${(inc / maxBar) * 100}%` }} title={`Income ${money(inc)}`} />
                    <div className="w-3 rounded-sm bg-foreground/70" style={{ height: `${(sp / maxBar) * 100}%` }} title={`Spending ${money(sp)}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{monthLabel(String(m.month))}</span>
                </div>
              );
            })}
            {sorted.length === 0 ? <p className="col-span-6 text-sm text-muted-foreground self-center text-center">No months yet.</p> : null}
          </div>
        </Card>

        <Card className="p-4 shadow-none lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Recent</h2>
            <Link href="/transactions" className="text-xs text-muted-foreground underline underline-offset-2">all transactions</Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {(recent ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm truncate">{t.merchant_norm}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{shortDate(String(t.posted_date))}</span>
                    <CategoryBadge name={t.category_name} color={t.category_color} />
                  </p>
                </div>
                <Amount value={t.amount} className="text-sm" />
              </li>
            ))}
            {(recent ?? []).length === 0 ? <li className="py-6 text-sm text-muted-foreground text-center">Nothing yet.</li> : null}
          </ul>
        </Card>
      </section>
    </div>
  );
}

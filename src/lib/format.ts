const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const usdDelta = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0, signDisplay: "exceptZero" });
const pct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });

export function money(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return usd.format(Number(n));
}

export function moneyWhole(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return usdWhole.format(Number(n));
}

/** For KPI tiles and axes: $12.4K */
export function moneyCompact(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  return Math.abs(v) < 10_000 ? usdWhole.format(v) : usdCompact.format(v);
}

export function moneyDelta(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return usdDelta.format(Number(n));
}

export function percentDelta(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return pct.format(n);
}

export function shortDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")) : iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function longDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")) : iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function monthLabel(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

import { cn } from "@/lib/utils";
import { money, moneyDelta } from "@/lib/format";

/**
 * Signed amount. Direction is encoded three ways (sign, color, and the caller's column semantics)
 * so it never relies on hue alone.
 */
export function Amount({ value, className, signed = true, muted = false }: { value: number | string | null | undefined; className?: string; signed?: boolean; muted?: boolean }) {
  const v = value === null || value === undefined ? null : Number(value);
  const positive = v !== null && v > 0;
  const negative = v !== null && v < 0;
  return (
    <span
      className={cn(
        "tabular-nums",
        !muted && positive && signed && "text-emerald-700 dark:text-emerald-400",
        !muted && negative && signed && "text-foreground",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {v === null ? "—" : signed ? (positive ? "+" : "") + money(v) : money(Math.abs(v))}
    </span>
  );
}

export function Delta({ value, className }: { value: number | null | undefined; className?: string }) {
  const v = value ?? null;
  const up = v !== null && v > 0;
  const down = v !== null && v < 0;
  return (
    <span className={cn("tabular-nums inline-flex items-center gap-0.5", up && "text-emerald-700 dark:text-emerald-400", down && "text-rose-700 dark:text-rose-400", className)}>
      {up ? "▲" : down ? "▼" : ""} {v === null ? "—" : moneyDelta(v)}
    </span>
  );
}

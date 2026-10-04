import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiTile({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-1 py-4 px-4 rounded-lg shadow-none", className)}>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

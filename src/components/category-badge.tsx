import { cn } from "@/lib/utils";

export function CategoryBadge({ name, color, className }: { name: string | null | undefined; color?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-xs text-foreground/90 whitespace-nowrap", className)}>
      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color ?? "#BBBBBB" }} aria-hidden />
      {name ?? "Uncategorized"}
    </span>
  );
}

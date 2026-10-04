"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const t = toast.loading("Syncing all accounts…");
        try {
          const res = await fetch("/api/sync", { method: "POST" });
          const json = (await res.json()) as { ok?: boolean; error?: string; results?: Array<{ institution: string | null; added: number; modified: number; error?: string }> };
          if (!res.ok || !json.ok) throw new Error(json.error ?? "Sync failed");
          const added = (json.results ?? []).reduce((s, r) => s + r.added, 0);
          const errors = (json.results ?? []).filter((r) => r.error);
          if (errors.length) toast.warning(`${errors.length} item(s) failed: ${errors.map((e) => e.institution ?? "?").join(", ")}`, { id: t });
          else toast.success(`Synced ${json.results?.length ?? 0} item(s) · ${added} new transactions`, { id: t });
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Sync failed", { id: t });
        } finally {
          setBusy(false);
        }
      }}
    >
      <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} /> Sync now
    </Button>
  );
}

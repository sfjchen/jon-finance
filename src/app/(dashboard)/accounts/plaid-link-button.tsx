"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlaidLinkButton({ itemId, label = "Link account" }: { itemId?: string; label?: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchToken = useCallback(async () => {
    const res = await fetch("/api/plaid/link-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(itemId ? { item_id: itemId } : {}) });
    const json = (await res.json()) as { link_token?: string; error?: string };
    if (!res.ok || !json.link_token) throw new Error(json.error ?? "Could not create link token");
    return json.link_token;
  }, [itemId]);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (public_token) => {
      if (itemId) {
        toast.success("Connection updated");
        setBusy(true);
        await fetch("/api/sync", { method: "POST" });
        setBusy(false);
        router.refresh();
        return;
      }
      setBusy(true);
      const t = toast.loading("Linking and running first sync…");
      try {
        const res = await fetch("/api/plaid/exchange", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ public_token }) });
        const json = (await res.json()) as { ok?: boolean; institution?: string; error?: string; result?: { added: number } };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Exchange failed");
        toast.success(`${json.institution ?? "Account"} linked · ${json.result?.added ?? 0} transactions`, { id: t });
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Link failed", { id: t });
      } finally {
        setBusy(false);
        setToken(null);
      }
    },
    onExit: (err) => {
      if (err) toast.error(err.display_message ?? err.error_message ?? "Link exited");
      setToken(null);
    },
  });

  useEffect(() => {
    if (token && ready) open();
  }, [token, ready, open]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      setToken(await fetchToken());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start Plaid Link");
    } finally {
      setBusy(false);
    }
  }, [fetchToken]);

  return (
    <Button onClick={start} disabled={busy} size="sm" variant={itemId ? "outline" : "default"}>
      {itemId ? null : <Plus className="size-4" />} {busy ? "Working…" : label}
    </Button>
  );
}

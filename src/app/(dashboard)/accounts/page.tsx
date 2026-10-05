import { requireOwner } from "@/lib/auth";
import { money, longDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaidLinkButton } from "./plaid-link-button";
import { SyncButton } from "./sync-button";
import { ImportCsvDialog } from "./import-csv-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const { supabase } = await requireOwner();
  const [{ data: items }, { data: accounts }] = await Promise.all([
    supabase.from("plaid_items").select("id, item_id, institution_name, institution_logo, institution_color, status, error_message, last_synced_at, consent_expires_at, products").order("created_at"),
    supabase.from("accounts").select("id, plaid_item_id, name, official_name, mask, kind, subtype, current_balance, available_balance, credit_limit, balance_as_of, institution_name, source").order("kind").order("name"),
  ]);
  const env = process.env.PLAID_ENV === "production" ? "production" : "sandbox";
  const byItem = new Map<string | null, NonNullable<typeof accounts>>();
  for (const a of accounts ?? []) byItem.set(a.plaid_item_id, [...(byItem.get(a.plaid_item_id) ?? []), a]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Plaid <Badge variant={env === "production" ? "default" : "secondary"} className="align-middle">{env}</Badge>
            {" · "}{items?.length ?? 0} of 10 Items used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsvDialog accounts={(accounts ?? []).map((a) => ({ id: a.id, name: a.name, institution_name: a.institution_name, mask: a.mask, kind: a.kind, source: a.source }))} />
          <SyncButton />
          <PlaidLinkButton />
        </div>
      </div>

      {env === "sandbox" ? (
        <Card className="p-4 shadow-none">
          <p className="text-sm text-muted-foreground">
            Sandbox mode: in Plaid Link pick any bank and sign in with <code className="font-mono text-foreground">user_good</code> / <code className="font-mono text-foreground">pass_good</code>.
            Switch <code className="font-mono text-foreground">PLAID_ENV=production</code> to link real accounts.
          </p>
        </Card>
      ) : null}

      {(items ?? []).length === 0 && (accounts ?? []).length === 0 ? (
        <Card className="p-8 shadow-none text-center">
          <p className="font-medium">No accounts linked</p>
          <p className="text-sm text-muted-foreground mt-1">Use “Link account” to connect a bank, card, or brokerage through Plaid.</p>
        </Card>
      ) : null}

      {(items ?? []).map((item) => {
        const accts = byItem.get(item.id) ?? [];
        return (
          <Card key={item.id} className="p-0 shadow-none overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.institution_logo ? <img src={`data:image/png;base64,${item.institution_logo}`} alt="" className="size-7 rounded-md" /> : <span className="size-7 rounded-md" style={{ backgroundColor: item.institution_color ?? "#999" }} />}
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.institution_name ?? "Institution"}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.last_synced_at ? `Synced ${longDate(item.last_synced_at)}` : "Never synced"}
                    {item.consent_expires_at ? ` · consent expires ${longDate(item.consent_expires_at)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.status === "active" ? <Badge variant="secondary">active</Badge> : <Badge variant="destructive">{item.status}</Badge>}
                {item.status !== "active" ? <PlaidLinkButton itemId={item.item_id} label="Fix connection" /> : null}
              </div>
            </div>
            {item.error_message ? <p className="px-4 py-2 text-xs text-destructive border-b border-border">{item.error_message}</p> : null}
            <ul className="divide-y divide-border">
              {accts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{a.name}{a.mask ? <span className="text-muted-foreground"> ••{a.mask}</span> : null}</p>
                    <p className="text-xs text-muted-foreground">{a.kind}{a.subtype ? ` · ${a.subtype}` : ""}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p>{money(a.current_balance)}</p>
                    {a.kind === "credit" && a.credit_limit ? <p className="text-xs text-muted-foreground">of {money(a.credit_limit)} limit</p> : null}
                    {a.kind === "depository" && a.available_balance !== null ? <p className="text-xs text-muted-foreground">{money(a.available_balance)} available</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {(byItem.get(null) ?? []).length ? (
        <Card className="p-0 shadow-none overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-medium">Manual / CSV accounts</div>
          <ul className="divide-y divide-border">
            {(byItem.get(null) ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>{a.institution_name} · {a.name}</span>
                <span className="tabular-nums">{money(a.current_balance)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

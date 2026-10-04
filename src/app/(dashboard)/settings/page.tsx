import { requireOwner } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireOwner();
  const [{ data: runs }, { data: cards }, { data: merchants }, { count: catCount }, { data: rules }] = await Promise.all([
    supabase.from("sync_runs").select("id, trigger, started_at, finished_at, status, added, modified, removed, categorized, error, plaid_items(institution_name)").order("started_at", { ascending: false }).limit(20),
    supabase.from("cards").select("id, name, issuer, reward_program, statement_close_day, due_day").order("sort"),
    supabase.from("merchants").select("id, display_name, category_id, source, confidence, locked, txn_count").order("txn_count", { ascending: false }).limit(25),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("category_rules").select("id, priority, match_field, pattern, category_id, enabled, hit_count").order("priority"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.email} · Plaid {process.env.PLAID_ENV ?? "sandbox"} · Gemini {process.env.GEMINI_MODEL ?? "gemini-2.5-flash"} · {catCount ?? 0} categories</p>
      </div>

      <Card className="p-0 shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">Cards</div>
        <Table>
          <TableHeader><TableRow><TableHead>Card</TableHead><TableHead>Issuer</TableHead><TableHead>Program</TableHead><TableHead>Close / due</TableHead></TableRow></TableHeader>
          <TableBody>
            {(cards ?? []).map((c) => (
              <TableRow key={c.id} className="text-sm">
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.issuer}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{(c.reward_program as { type?: string })?.type ?? "—"}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{c.statement_close_day ?? "—"} / {c.due_day ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">Category rules <span className="text-xs text-muted-foreground font-normal">({rules?.length ?? 0})</span></div>
        {(rules ?? []).length === 0 ? <p className="px-4 py-6 text-sm text-muted-foreground">No rules yet. Rules run before the merchant cache, Plaid, and the LLM. Insert rows into <code className="font-mono">category_rules</code>; a UI arrives in phase 3.</p> : (
          <Table>
            <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>Field</TableHead><TableHead>Pattern</TableHead><TableHead>Category</TableHead><TableHead>Hits</TableHead></TableRow></TableHeader>
            <TableBody>
              {(rules ?? []).map((r) => (
                <TableRow key={r.id} className="text-sm">
                  <TableCell className="tabular-nums">{r.priority}</TableCell>
                  <TableCell className="font-mono text-xs">{r.match_field}</TableCell>
                  <TableCell className="font-mono text-xs">{r.pattern}</TableCell>
                  <TableCell className="text-xs">{r.category_id}</TableCell>
                  <TableCell className="tabular-nums">{r.hit_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-0 shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">Top merchants</div>
        <Table>
          <TableHeader><TableRow><TableHead>Merchant</TableHead><TableHead>Category</TableHead><TableHead>Source</TableHead><TableHead className="text-right">Txns</TableHead></TableRow></TableHeader>
          <TableBody>
            {(merchants ?? []).map((m) => (
              <TableRow key={m.id} className="text-sm">
                <TableCell>{m.display_name}{m.locked ? <Badge variant="outline" className="ml-2 text-[10px]">locked</Badge> : null}</TableCell>
                <TableCell className="text-xs">{m.category_id ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{m.source}{m.confidence !== null ? ` · ${Math.round(Number(m.confidence) * 100)}%` : ""}</TableCell>
                <TableCell className="text-right tabular-nums">{m.txn_count}</TableCell>
              </TableRow>
            ))}
            {(merchants ?? []).length === 0 ? <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No merchants yet.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 shadow-none overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">Sync runs</div>
        <Table>
          <TableHeader><TableRow><TableHead>Started</TableHead><TableHead>Institution</TableHead><TableHead>Trigger</TableHead><TableHead>Status</TableHead><TableHead className="text-right">+ / ~ / −</TableHead><TableHead className="text-right">Categorized</TableHead></TableRow></TableHeader>
          <TableBody>
            {(runs ?? []).map((r) => (
              <TableRow key={r.id} className="text-sm">
                <TableCell className="text-muted-foreground whitespace-nowrap">{longDate(r.started_at)}</TableCell>
                <TableCell>{r.plaid_items?.institution_name ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.trigger}</TableCell>
                <TableCell>{r.status === "ok" ? <Badge variant="secondary">ok</Badge> : r.status === "running" ? <Badge variant="outline">running</Badge> : <Badge variant="destructive" title={r.error ?? ""}>error</Badge>}</TableCell>
                <TableCell className="text-right tabular-nums">{r.added} / {r.modified} / {r.removed}</TableCell>
                <TableCell className="text-right tabular-nums">{r.categorized}</TableCell>
              </TableRow>
            ))}
            {(runs ?? []).length === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No syncs yet.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

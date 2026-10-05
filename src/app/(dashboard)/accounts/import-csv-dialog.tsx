"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMPORTERS, detectImporter } from "@/lib/importers";

interface AccountOpt { id: string; name: string; institution_name: string; mask: string | null; kind: string; source: string }

interface Staged { file: File; text: string; importerId: string; detected: boolean }

const NEW = "__new__";

export function ImportCsvDialog({ accounts }: { accounts: AccountOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<Staged[]>([]);
  const [accountId, setAccountId] = useState<string>(NEW);
  const [newName, setNewName] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newKind, setNewKind] = useState<string>("investment");
  const [busy, setBusy] = useState(false);

  const onFiles = useCallback(async (list: FileList | null) => {
    if (!list) return;
    const next: Staged[] = [];
    for (const file of Array.from(list)) {
      const text = await file.text();
      const det = detectImporter(text);
      next.push({ file, text, importerId: det?.id ?? "", detected: !!det });
    }
    setStaged((s) => [...s, ...next]);
    const first = next.find((n) => n.detected);
    if (first && !newName) {
      const imp = IMPORTERS.find((i) => i.id === first.importerId)!;
      setNewInstitution(imp.institution);
      setNewKind(imp.kind);
      setNewName(imp.institution === "Fidelity" ? "Roth IRA" : imp.label.replace(/\s*\(.*\)$/, ""));
    }
  }, [newName]);

  const grouped = useMemo(() => {
    const m = new Map<string, AccountOpt[]>();
    for (const a of accounts) m.set(a.institution_name, [...(m.get(a.institution_name) ?? []), a]);
    return Array.from(m.entries());
  }, [accounts]);

  const submit = useCallback(async () => {
    if (!staged.length) return;
    if (staged.some((s) => !s.importerId)) { toast.error("Pick an importer for every file"); return; }
    if (accountId === NEW && !newName.trim()) { toast.error("Name the new account"); return; }
    setBusy(true);
    const t = toast.loading(`Importing ${staged.length} file(s)…`);
    try {
      // One request per distinct importer so files with different formats can share the dialog.
      const byImporter = new Map<string, Staged[]>();
      for (const s of staged) byImporter.set(s.importerId, [...(byImporter.get(s.importerId) ?? []), s]);
      const lines: string[] = [];
      for (const [importerId, group] of byImporter) {
        const fd = new FormData();
        for (const s of group) fd.append("files", s.file, s.file.name);
        fd.set("importer", importerId);
        if (accountId !== NEW) fd.set("account_id", accountId);
        else {
          fd.set("new_account_name", newName.trim());
          fd.set("new_account_institution", newInstitution.trim());
          fd.set("new_account_kind", newKind);
        }
        const res = await fetch("/api/import/csv", { method: "POST", body: fd });
        const json = (await res.json()) as { ok?: boolean; error?: string; results?: Array<Record<string, unknown>> };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Import failed");
        for (const r of json.results ?? []) {
          if (r.error) lines.push(`${r.filename}: ${String(r.error)}`);
          else if (r.alreadyImported) lines.push(`${r.filename}: already imported, skipped`);
          else lines.push(`${r.filename}: +${r.inserted} txns, ${r.investment_rows} investment rows, ${r.holdings} holdings${Number(r.superseded) ? `, ${r.superseded} overlap with Plaid` : ""}`);
        }
      }
      toast.success(lines.join("\n"), { id: t, duration: 8000 });
      setStaged([]);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed", { id: t });
    } finally {
      setBusy(false);
    }
  }, [staged, accountId, newName, newInstitution, newKind, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Upload className="size-4" /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV files</DialogTitle>
          <DialogDescription>Fidelity activity and positions, or one-time history backfills from any institution. Formats are detected automatically; duplicates and Plaid overlaps are skipped.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">Files</Label>
            <Input id="files" type="file" accept=".csv,text/csv" multiple onChange={(e) => onFiles(e.target.files)} />
          </div>

          {staged.length ? (
            <ul className="space-y-2">
              {staged.map((s, i) => (
                <li key={`${s.file.name}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="truncate flex-1" title={s.file.name}>{s.file.name}</span>
                  <Select value={s.importerId} onValueChange={(v) => setStaged((arr) => arr.map((x, j) => (j === i ? { ...x, importerId: v } : x)))}>
                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Choose format" /></SelectTrigger>
                    <SelectContent>
                      {IMPORTERS.map((imp) => <SelectItem key={imp.id} value={imp.id}>{imp.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {!s.detected ? <span className="text-xs text-amber-600">not detected</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-2">
            <Label>Into account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW}>Create a new manual account…</SelectItem>
                {grouped.map(([inst, list]) => list.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{inst} · {a.name}{a.mask ? ` ••${a.mask}` : ""}{a.source === "plaid" ? " (Plaid)" : ""}</SelectItem>
                )))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Pick the matching Plaid account for history backfills so overlapping rows are reconciled. Use a new account for Fidelity.</p>
          </div>

          {accountId === NEW ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="nn">Account name</Label>
                <Input id="nn" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Roth IRA" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ni">Institution</Label>
                <Input id="ni" value={newInstitution} onChange={(e) => setNewInstitution(e.target.value)} placeholder="Fidelity" />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={newKind} onValueChange={setNewKind}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="depository">Checking / savings / balance</SelectItem>
                    <SelectItem value="credit">Credit card</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setStaged([]); setOpen(false); }} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !staged.length}>{busy ? "Importing…" : `Import ${staged.length || ""}`}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

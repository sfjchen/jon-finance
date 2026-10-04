"use client";

import { useMemo, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { Amount } from "@/components/amount";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { longDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setTransactionCategory, toggleTransfer } from "./actions";

export interface TxnRow {
  id: string;
  posted_date: string;
  amount: number;
  raw_description: string;
  merchant_raw: string | null;
  merchant_norm: string;
  category_id: string | null;
  category_source: string;
  category_confidence: number | null;
  needs_review: boolean;
  is_transfer: boolean;
  pending: boolean;
  logo_url: string | null;
  account_id: string;
  account_label: string;
}

interface Category { id: string; parent_id: string | null; name: string; color: string; kind: string }
interface Account { id: string; name: string; institution_name: string; mask: string | null }

const PAGE = 100;

export function TransactionsTable({ rows, categories, accounts, reviewOnly }: { rows: TxnRow[]; categories: Category[]; accounts: Account[]; reviewOnly: boolean }) {
  const [search, setSearch] = useState("");
  const [accountId, setAccountId] = useState<string>("all");
  const [primary, setPrimary] = useState<string>("all");
  const [showTransfers, setShowTransfers] = useState(false);
  const [page, setPage] = useState(0);
  const [local, setLocal] = useState<Record<string, Partial<TxnRow>>>({});

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const primaries = useMemo(() => categories.filter((c) => c.parent_id === null), [categories]);

  const filtered = useMemo(() => {
    const s = search.trim().toUpperCase();
    return rows
      .map((r) => ({ ...r, ...(local[r.id] ?? {}) }))
      .filter((r) => (showTransfers ? true : !r.is_transfer))
      .filter((r) => accountId === "all" || r.account_id === accountId)
      .filter((r) => {
        if (primary === "all") return true;
        const c = r.category_id ? catById.get(r.category_id) : undefined;
        const p = c ? (c.parent_id ?? c.id) : null;
        return primary === "none" ? !c : p === primary;
      })
      .filter((r) => !s || r.merchant_norm.includes(s) || r.raw_description.toUpperCase().includes(s) || r.account_label.toUpperCase().includes(s));
  }, [rows, local, search, accountId, primary, showTransfers, catById]);

  const pageRows = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const patch = useCallback((id: string, p: Partial<TxnRow>) => setLocal((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...p } })), []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search merchant, description, account" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="h-8 w-64 text-sm" />
        <Select value={accountId} onValueChange={(v) => { setAccountId(v); setPage(0); }}>
          <SelectTrigger className="h-8 w-56 text-sm"><SelectValue placeholder="Account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.institution_name} · {a.name}{a.mask ? ` ••${a.mask}` : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={primary} onValueChange={(v) => { setPrimary(v); setPage(0); }}>
          <SelectTrigger className="h-8 w-48 text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="none">Uncategorized</SelectItem>
            {primaries.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-1">
          <Switch id="transfers" checked={showTransfers} onCheckedChange={setShowTransfers} />
          <Label htmlFor="transfers" className="text-xs text-muted-foreground">Show transfers</Label>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant={reviewOnly ? "default" : "outline"} size="sm">
            <Link href={reviewOnly ? "/transactions" : "/transactions?review=1"}>{reviewOnly ? "Exit review" : "Review queue"}</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28 text-xs">Date</TableHead>
              <TableHead className="text-xs">Merchant</TableHead>
              <TableHead className="hidden lg:table-cell text-xs">Account</TableHead>
              <TableHead className="w-64 text-xs">Category</TableHead>
              <TableHead className="w-28 text-right text-xs">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => {
              const c = r.category_id ? catById.get(r.category_id) : undefined;
              return (
                <TableRow key={r.id} className={cn("text-[13.5px]", r.pending && "opacity-60", r.is_transfer && "text-muted-foreground")}>
                  <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">{longDate(r.posted_date)}</TableCell>
                  <TableCell className="max-w-[320px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {r.logo_url ? <img src={r.logo_url} alt="" className="size-5 rounded-sm shrink-0" /> : <span className="size-5 rounded-sm bg-muted shrink-0" />}
                      <div className="min-w-0">
                        <p className="truncate">{r.merchant_raw ?? titleCase(r.merchant_norm)}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.raw_description}{r.pending ? " · pending" : ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[220px]">{r.account_label}</TableCell>
                  <TableCell>
                    <CategoryPicker
                      row={r}
                      category={c}
                      categories={categories}
                      onChange={(categoryId, applyToMerchant) => {
                        patch(r.id, { category_id: categoryId, category_source: "user", needs_review: false });
                        return setTransactionCategory({ transactionId: r.id, categoryId, applyToMerchant });
                      }}
                      onToggleTransfer={(v) => { patch(r.id, { is_transfer: v }); return toggleTransfer({ transactionId: r.id, isTransfer: v }); }}
                    />
                  </TableCell>
                  <TableCell className="text-right"><Amount value={r.amount} /></TableCell>
                </TableRow>
              );
            })}
            {pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No transactions match.</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{filtered.length} transactions</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="tabular-nums">{page + 1} / {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function CategoryPicker({ row, category, categories, onChange, onToggleTransfer }: {
  row: TxnRow;
  category: Category | undefined;
  categories: Category[];
  onChange: (categoryId: string | null, applyToMerchant: boolean) => Promise<{ ok: boolean; error?: string; merchantUpdated?: number }>;
  onToggleTransfer: (v: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [applyAll, setApplyAll] = useState(true);
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const byParent = new Map<string, Category[]>();
    for (const c of categories) if (c.parent_id) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]);
    return categories.filter((c) => !c.parent_id).map((p) => ({ parent: p, children: byParent.get(p.id) ?? [] }));
  }, [categories]);

  const pick = (id: string) => {
    setOpen(false);
    startTransition(async () => {
      const res = await onChange(id, applyAll);
      if (!res.ok) toast.error(res.error ?? "Update failed");
      else if (res.merchantUpdated && res.merchantUpdated > 1) toast.success(`Updated ${res.merchantUpdated} transactions for ${titleCase(row.merchant_norm)}`);
    });
  };

  const sourceLabel = row.category_source === "user" ? <Lock className="size-3" /> : row.category_source;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-muted/60 text-left", pending && "opacity-60")}>
          <span className="flex items-center gap-1.5 min-w-0">
            {row.is_transfer ? <Badge variant="secondary" className="text-[10px]">transfer</Badge> : <CategoryBadge name={category?.name} color={category?.color} />}
            {row.needs_review ? <Badge variant="outline" className="text-[10px] border-amber-500/60 text-amber-700 dark:text-amber-400">review</Badge> : null}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">{sourceLabel}<ChevronsUpDown className="size-3" /></span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No category.</CommandEmpty>
            {grouped.map(({ parent, children }) => (
              <CommandGroup key={parent.id} heading={parent.name}>
                <CommandItem value={`${parent.name} ${parent.id}`} onSelect={() => pick(parent.id)}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: parent.color }} />
                  {parent.name} <span className="text-muted-foreground text-xs">(general)</span>
                  {row.category_id === parent.id ? <Check className="ml-auto size-4" /> : null}
                </CommandItem>
                {children.map((c) => (
                  <CommandItem key={c.id} value={`${parent.name} ${c.name} ${c.id}`} onSelect={() => pick(c.id)}>
                    <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                    {row.category_id === c.id ? <Check className="ml-auto size-4" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="border-t border-border p-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`apply-${row.id}`} className="text-xs">Apply to all “{titleCase(row.merchant_norm)}”</Label>
            <Switch id={`apply-${row.id}`} checked={applyAll} onCheckedChange={setApplyAll} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`transfer-${row.id}`} className="text-xs">Mark as transfer</Label>
            <Switch id={`transfer-${row.id}`} checked={row.is_transfer} onCheckedChange={(v) => { setOpen(false); startTransition(async () => { const res = await onToggleTransfer(v); if (!res.ok) toast.error(res.error ?? "Update failed"); }); }} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

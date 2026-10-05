import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runImport, type ImportResult } from "@/lib/importers/run";
import type { AccountKind } from "@/lib/importers/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST multipart/form-data:
 *   files: one or more CSV files
 *   importer: importer id or "auto"
 *   account_id: existing account uuid (optional)
 *   new_account_name / new_account_institution / new_account_kind / new_account_mask (optional, used when account_id is empty)
 */
export async function POST(req: Request) {
  if (!(await isAuthorizedRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "no files" }, { status: 400 });

  const importerId = (form.get("importer") as string | null) ?? "auto";
  const accountId = ((form.get("account_id") as string | null) ?? "").trim() || null;
  const newName = ((form.get("new_account_name") as string | null) ?? "").trim();
  const newAccount = !accountId && newName
    ? {
        name: newName,
        institution: ((form.get("new_account_institution") as string | null) ?? "").trim() || undefined,
        kind: (((form.get("new_account_kind") as string | null) ?? "").trim() || undefined) as AccountKind | undefined,
        mask: ((form.get("new_account_mask") as string | null) ?? "").trim() || null,
      }
    : null;

  const db = createAdminClient();
  const results: Array<ImportResult | { filename: string; error: string }> = [];
  for (const f of files) {
    try {
      const text = await f.text();
      results.push(await runImport(db, { filename: f.name, text, importerId, accountId, newAccount }));
    } catch (e) {
      results.push({ filename: f.name, error: e instanceof Error ? e.message : "import failed" });
    }
  }
  return NextResponse.json({ ok: true, results });
}

import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAllItems } from "@/lib/pipeline/sync";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 300;

async function run(req: Request, trigger: "manual" | "cron") {
  if (!(await isAuthorizedRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const results = await syncAllItems(db, trigger);
  // Touch analytics_cache so Supabase sees activity even when there are no Items (keepalive).
  await db.from("analytics_cache").upsert({ key: "last_sync", payload: { at: new Date().toISOString(), results } as unknown as Json });
  return NextResponse.json({ ok: true, results });
}

/** Vercel Cron calls GET with Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  return run(req, "cron");
}

/** The "Sync now" button calls POST with the owner session. */
export async function POST(req: Request) {
  return run(req, "manual");
}

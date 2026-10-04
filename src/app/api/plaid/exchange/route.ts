import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";
import { plaidClient, PLAID_COUNTRY_CODES } from "@/lib/plaid";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncItem } from "@/lib/pipeline/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

/** POST { public_token } → exchanges, stores the Item, runs the first sync. */
export async function POST(req: Request) {
  if (!(await isAuthorizedRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { public_token } = (await req.json().catch(() => ({}))) as { public_token?: string };
  if (!public_token) return NextResponse.json({ error: "public_token required" }, { status: 400 });

  const plaid = plaidClient();
  const db = createAdminClient();
  try {
    const { data: ex } = await plaid.itemPublicTokenExchange({ public_token });
    const { data: itemRes } = await plaid.itemGet({ access_token: ex.access_token });

    let institutionName: string | null = null;
    let logo: string | null = null;
    let color: string | null = null;
    const instId = itemRes.item.institution_id ?? null;
    if (instId) {
      try {
        const { data: inst } = await plaid.institutionsGetById({
          institution_id: instId,
          country_codes: PLAID_COUNTRY_CODES,
          options: { include_optional_metadata: true },
        });
        institutionName = inst.institution.name;
        logo = inst.institution.logo ?? null;
        color = inst.institution.primary_color ?? null;
      } catch {
        institutionName = instId;
      }
    }

    const { data: item, error } = await db
      .from("plaid_items")
      .upsert(
        {
          item_id: ex.item_id,
          access_token: ex.access_token,
          institution_id: instId,
          institution_name: institutionName,
          institution_logo: logo,
          institution_color: color,
          products: (itemRes.item.products ?? []) as string[],
          consent_expires_at: itemRes.item.consent_expiration_time ?? null,
          status: "active",
        },
        { onConflict: "item_id" },
      )
      .select("*")
      .single();
    if (error || !item) throw error ?? new Error("item insert failed");

    const result = await syncItem(db, item, "link");
    return NextResponse.json({ ok: true, institution: institutionName, result });
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error_message?: string } }; message?: string };
    return NextResponse.json({ error: err.response?.data?.error_message ?? err.message ?? "exchange failed" }, { status: 500 });
  }
}

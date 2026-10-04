import { NextResponse } from "next/server";
import { isAuthorizedRequest } from "@/lib/auth";
import { plaidClient, PLAID_PRODUCTS, PLAID_OPTIONAL_PRODUCTS, PLAID_COUNTRY_CODES, plaidEnv } from "@/lib/plaid";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** POST { item_id?: string } → { link_token }. With item_id, creates an update-mode token for re-auth. */
export async function POST(req: Request) {
  if (!(await isAuthorizedRequest(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { item_id?: string };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const base = {
    user: { client_user_id: "owner" },
    client_name: "jon-finance",
    country_codes: PLAID_COUNTRY_CODES,
    language: "en",
    // OAuth institutions (Chase, WF, US Bank) return here. Must be registered in the Plaid dashboard for production.
    ...(plaidEnv() === "production" ? { redirect_uri: `${siteUrl}/accounts` } : {}),
  };

  try {
    if (body.item_id) {
      const db = createAdminClient();
      const { data: item } = await db.from("plaid_items").select("access_token").eq("item_id", body.item_id).single();
      if (!item) return NextResponse.json({ error: "item not found" }, { status: 404 });
      const { data } = await plaidClient().linkTokenCreate({ ...base, access_token: item.access_token });
      return NextResponse.json({ link_token: data.link_token });
    }
    const { data } = await plaidClient().linkTokenCreate({
      ...base,
      products: PLAID_PRODUCTS,
      optional_products: PLAID_OPTIONAL_PRODUCTS,
      transactions: { days_requested: 730 },
    });
    return NextResponse.json({ link_token: data.link_token });
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error_message?: string } }; message?: string };
    return NextResponse.json({ error: err.response?.data?.error_message ?? err.message ?? "link token failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth";

/**
 * Auth landing. Supports both:
 *  - PKCE: ?code=...            (magic link requested from the browser)
 *  - Token hash: ?token_hash=...&type=magiclink  (server-generated links, Supabase SSR email template)
 * Then enforces the single-owner allowlist.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";
  const origin = url.origin;

  const supabase = await createClient();
  let authError: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    authError = error?.message ?? null;
  } else {
    authError = "missing code";
  }

  if (!authError) {
    const { data: { user } } = await supabase.auth.getUser();
    if (isAllowedEmail(user?.email)) return NextResponse.redirect(`${origin}${next}`);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}

import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function allowedEmail(): string {
  return (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase();
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const allowed = allowedEmail();
  return !!email && !!allowed && email.trim().toLowerCase() === allowed;
}

/** For Server Components: redirect to /login unless the signed-in user is the owner. */
export async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) redirect("/login");
  return { supabase, user };
}

/** For Route Handlers: true if the request carries an owner session or the cron secret. */
export async function isAuthorizedRequest(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) return true;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && isAllowedEmail(user.email);
}

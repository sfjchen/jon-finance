"use client";

import { useState, useCallback, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(
    error === "not_allowed" ? "That email is not allowed to access this app." : error === "auth" ? "Sign-in link was invalid or expired." : null,
  );

  const onSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    if (err) {
      setStatus("error");
      setMessage(err.message);
    } else {
      setStatus("sent");
      setMessage("Check your email for a sign-in link.");
    }
  }, [email, next]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <Button type="submit" className="w-full" disabled={status === "sending" || status === "sent"}>
        {status === "sending" ? "Sending…" : status === "sent" ? "Link sent" : "Email me a sign-in link"}
      </Button>
      {message ? <p className={`text-sm ${status === "error" || error ? "text-destructive" : "text-muted-foreground"}`}>{message}</p> : null}
    </form>
  );
}

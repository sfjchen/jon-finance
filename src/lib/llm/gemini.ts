import "server-only";

import { llmCategoryChoices } from "@/lib/categories";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface MerchantToClassify {
  merchant_norm: string;
  sample_description: string;
  typical_amount: number; // signed, account point of view
  account_kind: string;
  plaid_hint?: string | null;
}

export interface MerchantClassification {
  merchant_norm: string;
  display_name: string;
  category: string;
  confidence: number;
  reason: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
}

async function hashInput(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Classify a batch of unresolved merchants. Results are cached in llm_cache by input hash,
 * and the caller writes them into `merchants`, so each merchant is classified once.
 * Only merchant_norm, a sample description, a rounded amount, account kind and Plaid's hint are sent.
 */
export async function classifyMerchants(db: AdminClient, items: MerchantToClassify[]): Promise<MerchantClassification[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || items.length === 0) return [];

  const choices = llmCategoryChoices();
  const payload = items.map((m) => ({
    merchant: m.merchant_norm,
    sample: m.sample_description.slice(0, 80),
    amount: Math.round(m.typical_amount),
    account: m.account_kind,
    hint: m.plaid_hint ?? null,
  }));
  const inputHash = await hashInput(MODEL + JSON.stringify(payload));

  const cached = await db.from("llm_cache").select("output").eq("kind", "merchant_classify").eq("input_hash", inputHash).maybeSingle();
  if (cached.data?.output) return cached.data.output as unknown as MerchantClassification[];

  const prompt = [
    "You categorize personal finance transactions for a US college student.",
    "Amounts are from the account's point of view: negative = money out, positive = money in.",
    "Pick exactly one category id per merchant from the allowed list. Prefer the most specific detailed id.",
    "Use TRANSFER_IN/TRANSFER_OUT for moves between the user's own accounts (Venmo cash-outs, brokerage deposits, savings), LOAN_PAYMENTS_CREDIT_CARD_PAYMENT for card payments, INCOME_* for income.",
    "confidence is 0 to 1. Give a display_name in Title Case suitable for a UI.",
    "",
    "Allowed category ids:",
    choices.join(", "),
    "",
    "Merchants (JSON):",
    JSON.stringify(payload),
  ].join("\n");

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            merchant_norm: { type: "STRING" },
            display_name: { type: "STRING" },
            category: { type: "STRING" },
            confidence: { type: "NUMBER" },
            reason: { type: "STRING" },
          },
          required: ["merchant_norm", "display_name", "category", "confidence", "reason"],
        },
      },
    },
  };

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json.error?.message ?? "unknown error"}`);

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  let parsed: MerchantClassification[] = [];
  try {
    parsed = JSON.parse(text) as MerchantClassification[];
  } catch {
    parsed = [];
  }
  const allowed = new Set(choices);
  const clean = parsed
    .filter((p) => p && typeof p.merchant_norm === "string" && allowed.has(p.category))
    .map((p) => ({
      merchant_norm: p.merchant_norm,
      display_name: String(p.display_name ?? p.merchant_norm).slice(0, 80),
      category: p.category,
      confidence: Math.max(0, Math.min(1, Number(p.confidence) || 0)),
      reason: String(p.reason ?? "").slice(0, 200),
    }));

  await db.from("llm_cache").upsert(
    { kind: "merchant_classify", input_hash: inputHash, model: MODEL, output: clean as unknown as Json },
    { onConflict: "kind,input_hash" },
  );
  return clean;
}

/** Free-form narrative generation for the on-demand insights card. */
export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");
  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }),
  });
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json.error?.message ?? "unknown error"}`);
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

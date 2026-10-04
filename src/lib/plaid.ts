import "server-only";

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

export type PlaidEnv = "sandbox" | "production";

export function plaidEnv(): PlaidEnv {
  return process.env.PLAID_ENV === "production" ? "production" : "sandbox";
}

let cached: PlaidApi | null = null;

export function plaidClient(): PlaidApi {
  if (cached) return cached;
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) throw new Error("PLAID_CLIENT_ID / PLAID_SECRET missing");
  const config = new Configuration({
    basePath: PlaidEnvironments[plaidEnv()],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
        "Plaid-Version": "2020-09-14",
      },
    },
  });
  cached = new PlaidApi(config);
  return cached;
}

/** Read-only products only. Never add auth, transfer, or payment_initiation. */
export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
export const PLAID_OPTIONAL_PRODUCTS: Products[] = [Products.Investments, Products.Liabilities];
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];

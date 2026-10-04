/**
 * Merchant string normalization. The output is the cache key for categorization,
 * so it must be stable across the same merchant's variants and distinct across merchants.
 */

const PREFIXES = [
  /^(sq|sqc|tst|pp|py|dd|ub|lyft|uber)\s*\*\s*/i, // Square, Toast, PayPal, DoorDash, etc.
  /^(pos|pur|purchase|debit|credit|ach|chk|check|checkcard|visa|mc|dbt|crd)\s+(purchase|debit|withdrawal|deposit)?\s*/i,
  /^(recurring|rec)\s+(payment|pymt)\s*/i,
  /^(online|web|mobile)\s+(payment|pmt|pymt|purchase)\s*/i,
  /^(authorized on|auth on)\s+\d{1,2}\/\d{1,2}\s*/i,
];

const SUFFIXES = [
  /\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/, // trailing dates
  /\s+#?\d{3,}$/, // store numbers
  /\s+(ca|ny|wa|tx|il|ma|fl|or|nj|pa|az|co|ga|nc|va|mn|wi|mi|oh|md|dc|us|usa)$/i, // trailing state
  /\s+(card|crd)\s*\d{2,4}$/i, // "CARD 1234"
  /\s+(ref|reference)\s*#?\s*[a-z0-9]+$/i,
];

const KNOWN_ALIASES: Array<[RegExp, string]> = [
  [/\bamzn\b|\bamazon\b/i, "AMAZON"],
  [/\bwhole\s*foods?\b|\bwfm\b/i, "WHOLE FOODS"],
  [/\bventa\b|\bvenmo\b/i, "VENMO"],
  [/\bpaypal\b/i, "PAYPAL"],
  [/\bzelle\b/i, "ZELLE"],
  [/\bapple\.com\/bill\b|\bapple\s*com\s*bill\b/i, "APPLE"],
  [/\bgoogle\s*\*?/i, "GOOGLE"],
  [/\bstarbucks\b/i, "STARBUCKS"],
  [/\btrader\s*joe/i, "TRADER JOES"],
  [/\bsafeway\b/i, "SAFEWAY"],
  [/\bcostco\b/i, "COSTCO"],
  [/\btarget\b/i, "TARGET"],
  [/\bwalmart\b|\bwal-mart\b/i, "WALMART"],
  [/\buber\s*eats\b/i, "UBER EATS"],
  [/\buber\b/i, "UBER"],
  [/\blyft\b/i, "LYFT"],
  [/\bdoordash\b/i, "DOORDASH"],
  [/\bchipotle\b/i, "CHIPOTLE"],
  [/\bnetflix\b/i, "NETFLIX"],
  [/\bspotify\b/i, "SPOTIFY"],
  [/\bchevron\b/i, "CHEVRON"],
  [/\bshell\s+oil\b|\bshell\s+service\b/i, "SHELL"],
  [/\bcaltrain\b/i, "CALTRAIN"],
  [/\bbart\b/i, "BART"],
  [/\bclipper\b/i, "CLIPPER"],
  [/\bstanford\b/i, "STANFORD"],
];

export function normalizeMerchant(input: string | null | undefined, plaidMerchantName?: string | null): string {
  // Plaid's merchant_name is already clean when present.
  const base = (plaidMerchantName && plaidMerchantName.trim()) || (input ?? "");
  let s = base.normalize("NFKD").replace(/[^\x20-\x7E]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  for (const [re, alias] of KNOWN_ALIASES) {
    if (re.test(s)) return alias;
  }

  for (const re of PREFIXES) s = s.replace(re, "");
  let prev = "";
  while (prev !== s) {
    prev = s;
    for (const re of SUFFIXES) s = s.replace(re, "");
  }
  s = s.replace(/[*#]+/g, " ").replace(/\s{2,}/g, " ").trim();
  s = s.replace(/\b\d{4,}\b/g, "").replace(/\s{2,}/g, " ").trim();
  return (s || base).toUpperCase().slice(0, 80);
}

export function displayNameFromNorm(norm: string): string {
  return norm
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Hash for CSV rows without a stable source id. */
export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

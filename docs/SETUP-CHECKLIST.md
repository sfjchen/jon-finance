# Setup checklist

Claude drives your Chrome for everything it can. You only do the four things that must be yours: approve a DNS save, press Run on one command, log in to banks, and (if needed) a billing decision. Say "next" in chat to move between steps.

| # | Step | Claude does | You do |
|---|---|---|---|
| 1 | DNS for finance.sfjc.dev | Opens Cloudflare → sfjc.dev → DNS, fills CNAME `finance` → `cname.vercel-dns.com`, proxy off. Verifies with `dig` after. | Say "save it" when the prefilled form looks right (or click **Save**). |
| 2 | Supabase plan | Opens org Billing page and reads the plan. | Nothing if Free. If Pro: say "pause Veridian" or "keep Pro". |
| 3 | First sign-in | Mints a one-time sign-in URL and opens it in your Chrome. No email needed. | Nothing. |
| 4 | Plaid production | Opens dashboard.plaid.com: confirms Trial plan, adds redirect URI `https://finance.sfjc.dev/accounts`, fills app profile (name, site, privacy URL). | In **Developers → Keys** click the copy icon next to the **Production** secret, then press Run below. The script reads your clipboard, stores the secret locally and in Vercel, clears the clipboard, redeploys. The secret is never shown. |
| 5 | Link your 7 institutions | Opens finance.sfjc.dev/accounts and clicks **Link account** for each, in order: Wells Fargo, Chase, U.S. Bank, Discover, Robinhood, Venmo, PayPal. | Log in to each bank inside the Plaid window. Not Fidelity. |
| 6 | Rotate sandbox secret | Opens Developers → Keys and clicks Rotate on Sandbox. | Say "yes" to confirm. |
| 7 | Fidelity + backfills | Walks you to each export page and imports the files. | Click Download on each site; drop files on Accounts → Import CSV (or tell Claude the folder). |

Step 4 command (run after copying the Production secret):

```bash
~/Desktop/jon-finance/scripts/set-plaid-production.sh
```

Bank-specific notes for step 5:
- **Wells Fargo:** if Plaid says "account settings incompatible", log in to wellsfargo.com → Control Tower → Manage Access → Data sharing → allow, then retry.
- **Chase:** one connection covers both cards; tick both on the account picker.
- **Discover:** will need a relink once it moves to Capital One (2026–2027).
- **Venmo:** search "Venmo – Personal"; it brings the Venmo Credit Card too.

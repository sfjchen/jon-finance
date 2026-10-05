# Setup checklist (the parts only you can do)

Work top to bottom. Each step says where to click, what to enter, and how to confirm it worked. Tell Claude when a step is done and it will verify from the CLI.

---

## 1. Point `finance.sfjc.dev` at Vercel (Cloudflare DNS)

The domain is already attached to the Vercel project. Only the DNS record is missing.

1. Open https://dash.cloudflare.com and sign in.
2. Click the **sfjc.dev** zone.
3. Left menu → **DNS** → **Records** → **Add record**.
4. Fill in:
   - Type: **CNAME**
   - Name: `finance`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (click the orange cloud so it turns grey). This matters; Vercel needs to issue the TLS certificate itself.
   - TTL: Auto
5. **Save**.

**Confirm:** after 1 to 5 minutes, https://finance.sfjc.dev/login should load. From a terminal:

```bash
dig +short finance.sfjc.dev @1.1.1.1
```

should print `cname.vercel-dns.com.` and some IPs. In Vercel (https://vercel.com/sfjchen-projects/jon-finance/settings/domains) the domain should show a green "Valid Configuration".

---

## 2. Confirm the Supabase org is still free

1. Open https://supabase.com/dashboard.
2. Top-left org switcher → **Jchen04's Org**.
3. Left menu → **Billing** (or **Organization settings → Billing**).
4. Read the **Plan** line.

- **Free:** nothing to do. You now have three projects (sfjchen's Project, Veridian, jon-finance); if Supabase later pauses one for exceeding the limit, pause Veridian yourself instead so jon-finance stays up.
- **Pro:** each project beyond the first bills about $10/month of compute. To stay at $0 for this app, either pause a project you don't use (project → **Settings → General → Pause project**) or downgrade the org to Free (Billing → Change plan). Downgrading requires at most two active projects.

**Confirm:** Billing page shows Free, or you've decided to accept the Pro cost.

---

## 3. First sign-in

1. Go to https://finance.sfjc.dev/login (after step 1). Before DNS is live, you can use https://jon-finance.vercel.app while signed in to Vercel in the same browser; Vercel's deployment protection will let you through as the team owner.
2. Enter `jchen04@stanford.edu` and click **Email me a sign-in link**.
3. Open the email from `noreply@mail.app.supabase.io` (check Spam the first time) and click the link. It lands on the home page.

Notes:
- Only that email can get in. Any other address is signed out immediately with "not allowed".
- Supabase's built-in mailer allows about 2 emails per hour. If you need to sign in more often during testing, run locally:

```bash
npx tsx scripts/dev-login-link.ts http://localhost:3000
```

and open the printed URL.

---

## 4. Switch Plaid from sandbox to production (when you're ready to link real banks)

Do this only after steps 1 and 3 work.

### 4a. Make sure the Trial plan is active
1. Open https://dashboard.plaid.com.
2. Left menu → **Settings → Billing** (or the plan banner at the top). It should say **Trial** (free, 10 Items). If it still says Sandbox-only, click **Get started with Trial** / **Upgrade** and complete the short form. No card is required for Trial.

### 4b. Register the OAuth redirect URI (required for Chase, Wells Fargo, U.S. Bank)
1. Left menu → **Developers → API**.
2. Under **Allowed redirect URIs** click **Configure** → **Add new URI**.
3. Enter exactly: `https://finance.sfjc.dev/accounts`
4. Save.

### 4c. Fill in the application profile (Plaid shows it to users on OAuth screens)
1. Left menu → **Settings → Team settings → Application** (sometimes labeled **Company profile**).
2. App name: `jon-finance`. Website: `https://finance.sfjc.dev`. Upload any square logo. If a privacy-policy URL is required, use `https://finance.sfjc.dev/privacy` (Claude will add that page).

### 4d. Copy the production secret
1. Left menu → **Developers → Keys**.
2. Copy the **Production** secret (not Sandbox, not Development).
3. On your Mac, edit `~/Desktop/jon-finance/.env.local`:
   - `PLAID_SECRET=` → paste the production secret
   - `PLAID_ENV=production`
4. Tell Claude "Plaid env updated". Claude will push the two variables to Vercel without printing them and trigger a redeploy. If you prefer to do it yourself:

```bash
cd ~/Desktop/jon-finance && set -a && source .env.local && set +a && printf '%s' "$PLAID_SECRET" | vercel env add PLAID_SECRET production --force && printf 'production' | vercel env add PLAID_ENV production --force && vercel redeploy $(vercel ls jon-finance --prod 2>/dev/null | grep -m1 -o 'https://[^ ]*')
```

### 4e. Link the real institutions (7 Items of 10)
On https://finance.sfjc.dev/accounts click **Link account** once per institution:

| Order | Institution in Plaid search | Notes |
|---|---|---|
| 1 | Wells Fargo | OAuth. If Plaid says "account settings incompatible", first log in to wellsfargo.com → **Control Tower → Manage Access → Data sharing** and allow third-party access, then retry. |
| 2 | Chase | One Item covers both Prime Visa and Freedom Unlimited. Pick both cards on the account-selection screen. |
| 3 | U.S. Bank | OAuth. |
| 4 | Discover | Will move to Capital One during the 2026-2027 migration; expect one relink later. |
| 5 | Robinhood | Shows as brokerage; investments product pulls holdings. |
| 6 | Venmo | Search "Venmo – Personal". Brings the Venmo balance and the Venmo Credit Card. |
| 7 | PayPal | Balance and transactions. |

Do **not** link Fidelity through Plaid (it will fail or burn an Item slot). Fidelity is imported by CSV, see `docs/IMPORT-GUIDE.md`.

**Confirm:** Accounts page shows each institution with a green "active" badge and "Synced" timestamp, and Settings → Sync runs lists an "ok" row per Item.

---

## 5. Rotate the sandbox secret (housekeeping)

You pasted the sandbox secret into chat. It can't touch real data, but rotate it anyway:

1. https://dashboard.plaid.com → **Developers → Keys**.
2. Next to **Sandbox** secret click **Rotate** (or the circular-arrows icon) → confirm.
3. If you still run sandbox locally, paste the new value into `.env.local`. Once you're on production (step 4) the sandbox secret is unused.

---

## 6. Optional but recommended

- **Vercel → jon-finance → Settings → Deployment Protection:** leave "Vercel Authentication" on for Preview; Production is only reachable via the custom domain anyway, and app-level auth gates everything.
- **Supabase → jon-finance → Authentication → Providers → Email:** confirm "Enable email provider" is on and "Confirm email" is on (Claude set this via config push).
- **Backups:** Supabase Free has no automatic backups. Once real data is in, ask Claude to add a weekly `pg_dump` to an encrypted file in iCloud or a private GitHub release.

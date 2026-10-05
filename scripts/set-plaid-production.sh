#!/bin/bash
# Switch Plaid to production without the secret ever appearing on screen.
# 1) In dashboard.plaid.com → Developers → Keys, click the copy icon next to the *Production* secret.
# 2) Run this script. It reads the clipboard, writes PLAID_SECRET/PLAID_ENV to .env.local,
#    pushes both to Vercel production, clears the clipboard, and redeploys.
set -euo pipefail
cd "$(dirname "$0")/.."

SECRET="$(pbpaste | tr -d '[:space:]')"
if [[ ! "$SECRET" =~ ^[a-f0-9]{30}$ ]]; then
  echo "Clipboard does not look like a Plaid secret (expected 30 hex chars). Copy the Production secret first." >&2
  exit 1
fi

# Update .env.local in place (create keys if missing).
touch .env.local
grep -q '^PLAID_SECRET=' .env.local && sed -i '' "s|^PLAID_SECRET=.*|PLAID_SECRET=$SECRET|" .env.local || echo "PLAID_SECRET=$SECRET" >> .env.local
grep -q '^PLAID_ENV=' .env.local && sed -i '' "s|^PLAID_ENV=.*|PLAID_ENV=production|" .env.local || echo "PLAID_ENV=production" >> .env.local

printf '%s' "$SECRET" | vercel env add PLAID_SECRET production --force >/dev/null
printf 'production' | vercel env add PLAID_ENV production --force >/dev/null
printf '' | pbcopy
unset SECRET

echo "Plaid production secret stored locally and in Vercel. Clipboard cleared. Redeploying…"
vercel redeploy "$(vercel ls jon-finance --prod 2>/dev/null | grep -m1 -o 'https://[^ ]*')" >/dev/null && echo "Redeploy started."

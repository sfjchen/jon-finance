# Open-Source & Self-Hosted Personal Finance Landscape (researched 2026-10-04)

*For a Python/Node developer building a local, read-only, insights-only pipeline.*

## 1. Full apps (self-hosted)

### Actual Budget
- Local-first envelope budgeting, NodeJS, MIT, ~29k stars, monthly releases. [repo](https://github.com/actualbudget/actual)
- **Ingestion:** CSV/OFX/QFX/QIF import; bank sync via **SimpleFIN Bridge**, GoCardless (EU), others. [bank-sync](https://actualbudget.org/docs/advanced/bank-sync/)
- **Storage:** SQLite with CRDT sync; directly queryable.
- **Dedup/transfers:** exact `imported_id`, fuzzy payee+amount ±7 days, fuzzy amount/date ±7 days. [reconciliation](https://medium.com/actualbudget/how-transaction-reconciliation-works-8dc5749bbd21)
- **Categorization:** Rules engine, no ML.
- **API:** `@actual-app/api` npm with **ActualQL**; Python via **actualpy**. [API](https://actualbudget.org/docs/api/) · [actualpy](https://github.com/bvanelli/actualpy)
- **Investments:** Weak.

### Firefly III (+ Data Importer)
- PHP/Laravel, AGPL, ~25k stars. Strong rules engine, full REST API. Heavy for insights-only. [repo](https://github.com/firefly-iii/firefly-iii)

### Maybe → Sure (community fork)
- Maybe Finance archived July 2025. Fork **we-promise/sure** (Rails/Postgres), ~10k stars, monthly releases. SimpleFIN first-class; Plaid needs own keys. Good investments + net worth, nicest UI. [sure](https://github.com/we-promise/sure)

### Ghostfolio (investments only)
- Angular/NestJS/Postgres, ~9k stars, weekly releases. CSV/JSON activity import incl. Robinhood; REST import endpoint; Python client. No spending. [repo](https://github.com/ghostfolio/ghostfolio)

## 2. Plain-text accounting

### Beancount v3 + Fava
- Python; text ledger; `beanquery` SQL-like. Importer frameworks: **beangulp** (identify/extract/file), **smart_importer** (sklearn trained on your ledger), **beancount-import** (web UI; sources OFX/Venmo/PayPal/Amazon; source-ID dedup; **cross-source transfer detection**). [beancount](https://github.com/beancount/beancount) · [fava](https://github.com/beancount/fava) · [beangulp](https://github.com/beancount/beangulp) · [smart_importer](https://github.com/beancount/smart_importer) · [beancount-import](https://github.com/jbms/beancount-import)
- Community workflow: raw statements folder → importers → review in Fava → commit to git. [10-years write-up](https://sgoel.dev/posts/10-years-of-personal-finances-in-plain-text-files/)
- Native lots, cost basis, `bean-price` with yfinance.

### hledger / ledger-cli
- hledger (Haskell) has powerful CSV rules; `hledger-flow` documents drop-folder automation. Less ergonomic for Python. [hledger](https://hledger.org/import-csv.html)

## 3. Commercial comparison points

| Tool | Price (2026) | Export/API |
|---|---|---|
| Monarch | $99.99/yr Core | CSV; unofficial `monarchmoney` Python (GraphQL) |
| Copilot | ~$95/yr, Apple-first | CSV only |
| YNAB | $109/yr | **Official REST API** |
| Lunch Money | min $60/yr | **Official API v2**; Python `lunchable` |
| Tiller | $99/yr | Google Sheets feed |
| Empower | Free | CSV only |

**Aggregators for DIY:** SimpleFIN ($15/yr, read-only, `GET /accounts`, ~90-day history, `pysimplefin`); Plaid Trial (free, 10 Items, `plaid-python`).

## 4. Python libraries
`ofxtools`, `ofxparse`, `plaid-python`, `robin_stocks` (unofficial), `yfinance` (brittle), `lunchable`, `actualpy`, `pysimplefin`.

## 5. Notable DIY pipeline repos
- **MNGGibson/finance-dashboard**: SimpleFIN cron → Postgres (accounts, transactions upserted by id, balance_snapshots, category_rules) → rules → merchant table → LLM fallback cached per merchant → Streamlit. Card payments shown separately. [repo](https://github.com/MNGGibson/finance-dashboard)
- **Local data stack**: dlt → DuckDB → dbt staging/intermediate/marts → Evidence.dev. [write-up](https://rasmusengelbrecht.substack.com/p/my-local-data-stack-duckdb-dlt-dbt)
- **thu-vu92/local-llms-analyse-finance**: Ollama + LangChain categorization. [repo](https://github.com/thu-vu92/local-llms-analyse-finance)

## 6. Architecture patterns people converge on

**Pipeline shape:** `raw/<source>/<date>.{csv,ofx,json}` (immutable) → per-source parser → **normalized ledger** (`txn_id, account_id, posted_date, amount, currency, raw_desc, clean_merchant, source, source_id, hash`) → categorization writing a separate `txn_category` table (preserves overrides) → marts (monthly cashflow, by-category, net-worth snapshots) → dashboard. **Store balance snapshots per run** for net-worth history.

**Deduplication across sources:**
- Prefer **stable source IDs** (Plaid `transaction_id`, OFX `FITID`) and upsert; fall back to content hash `(account, date, amount, normalized_desc)`.
- Within-account fuzzy: same amount ±7 days.
- **Venmo/PayPal double-count:** bank sees "VENMO PAYMENT", Venmo sees the real payee. Treat bank-side Venmo lines as transfers to a "Venmo" account and let Venmo's feed carry the spend (Copilot's approach). Unmatched Venmo flows count as real income/spend.
- Credit-card payments: show separately from spending.

**Transfer detection:** pair opposite-sign equal amounts across own accounts within a window (4–7 days), mark both legs `is_transfer`, exclude from income/expense. Edge cases: split payoffs, pending vs posted dates.

## 7. LLM-based categorization: what works
- **Rule-first, then model:** rules/merchant lookup resolve 60–80% at ~100% precision; only novel merchants hit the model. **Cache decisions per normalized merchant.** [expensesorted](https://www.expensesorted.com/blog/advanced-bank-transaction-categorization-beyond-llms)
- **Embedding classifier** as a middle tier: 70–80% cold → 94–97% after ~200 corrections.
- **Retrieval-augmented few-shot:** retrieve 5–20 most similar labeled historical transactions into the prompt; beats fixed few-shot. [arXiv 2311.06102](https://arxiv.org/abs/2311.06102)
- **Prompt design:** pass category list verbatim, normalized merchant + amount + account type + Plaid PFC hint, ask for strict JSON `{category, confidence, reason}`, route low confidence to a review queue, feed corrections back as retrieval examples.
- No widely-cited public benchmark for personal transaction categorization.

## Recommended shortlist
1. **Build the pipeline yourself** (raw → parsers → normalized ledger → rules+LLM fallback → SQL marts → dashboard). Nothing off-the-shelf is insights-only without baggage.
2. **Plaid Trial / SimpleFIN + CSV** for ingestion, read-only.
3. Borrow **beancount-import's** source-ID matching and transfer detection ideas.
4. **Sure** (Maybe fork) is the UI reference point for a clean, integrated net-worth + spending + investments view.

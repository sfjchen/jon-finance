# UI/UX Research: Single-User Personal Finance Dashboard (researched 2026-10-04)

## 1. App teardowns

**Copilot Money** (Apple-only, dark-first). Dashboard order: spending-progress graph with "Free to Spend" → To Review queue → Budgets → Upcoming recurrings → Net This Month ([help](https://help.copilot.money/en/articles/6045480-dashboard-tab-overview)). Near-black navy canvas `#000814`, semantic data colors green `#00CC4B` income / red-orange `#FF4433` spending / blue `#1C6CFF` net worth / yellow `#FECE4C` warning, charts as "the primary interface" with progressive disclosure ([analysis](https://blakecrosley.com/guides/design/copilot-money)). Investments tab: Returns/Balances toggle, timeframe picker, benchmark overlay, TWR ignoring transfers, Top Movers, Holdings, Allocation ([help](https://help.copilot.money/en/articles/5377645-investments-tab-overview)). Criticism: allocation too coarse.

**Monarch Money** (web). Customizable widget dashboard: Weekly Recap, Investments, Budget, Net worth, recent transactions. Signature: Cash Flow **Sankey** ([blog](https://www.monarch.com/blog/visualize-your-cash-flow-like-never-before)). AI Weekly Recap plus contextual sparkle insights, numbers alongside explanation ([winter release](https://www.monarch.com/blog/winter-release)). Complaints: investments can't compare retirement vs taxable; notes/tags hidden behind a click.

**YNAB**: envelope-first; 2026 swipe "Card Mode" review and global Hide Amounts toggle. Not a model for insights-only.

**Lunch Money**: web-first, gated review queue as a daily ritual, keyboard-centric.

**Maybe → Sure (we-promise/sure)**. Shell: 84px icon-only left rail + expandable 320px account sidebar + collapsible right AI panel; mobile = top bar + bottom nav ([layout](https://github.com/we-promise/sure/blob/main/app/views/layouts/application.html.erb)). Dashboard = period picker + draggable sections (balance sheet, cashflow Sankey, net worth chart). DS components: Button, Dialog, Menu, Tabs, Segmented Control, Pill, Progress Ring, Sparkline, Table, Category Select ([DS](https://github.com/we-promise/sure/tree/main/app/components/DS)). Hand-rolled D3 charts. Tokens: Geist + Geist Mono, semantic surface/success/warning/destructive, radius 8/10px ([tokens](https://github.com/we-promise/sure/blob/main/design/tokens/sure.tokens.json)).

**Rocket Money**: subscriptions screen is the standout; UI regressed into upsells. **Empower**: reference for domestic/international/bond allocation; otherwise degraded. **Robinhood**: one big number, line chart with 1D/1W/1M/3M/YTD/1Y/ALL, screen tint by direction; critiques: small toggle targets, no custom range, no allocation ([critique](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/)). **Wealthfront**: dashboard centered on net-worth projection.

**Mercury** (fintech benchmark): light-first warm canvas `#f6f5f2`, ink `#2a2924`, indigo `#5266eb` as the only saturated color, success `#2f7d57` / danger `#b54a3a` only for state, tabular numerals on every balance, 240px sidebar, 1280px max, 8px radius, no shadows, rows become stacked KV cards <640px ([breakdown](https://www.925studios.co/blog/mercury-design-breakdown)).

**Linear / Vercel / Stripe**: reduced sidebar noise, LCH theming from 3 variables; Vercel moved to hideable sidebar + floating mobile bottom bar (Feb 2026); Stripe: high density, tables as primary UI, inline sparklines, "color only ever means state."

## 2. Community consensus

- **Weekly-used screens**: transaction review queue, net worth trend, cash flow, upcoming recurrings.
- **Loves**: Copilot categorization and animation; Monarch Sankey and all-in-one view.
- **Hates**: sync breakage; metadata hidden behind clicks; shallow investment analysis (no taxable vs retirement split; coarse allocation); duplicates; upsells; small time-toggle targets.
- **Bogleheads**: want stock/bond and US/intl allocation, performance that ignores contributions, account grouping, YoY net worth. "A simple tracker you update monthly beats a comprehensive dashboard you abandon."
- **r/CreditCards**: no mainstream PF app answers "which card do I use here?"; people use CardPointers/MaxRewards and value retroactive "missed rewards" views. **Biggest unfilled gap.**

## 3. Design-system recommendations (Next.js 2026)

- **Charts**: shadcn/ui charts on **Recharts v3** (`ChartConfig` → `--chart-N` CSS vars, light/dark, `accessibilityLayer`) ([shadcn](https://ui.shadcn.com/docs/components/chart)). Recharts ships Line/Area/Bar/Pie/Treemap and **Sankey**. Nivo heavier; visx slower to build; Tremor is a Recharts wrapper.
- **Numbers**: `tabular-nums` on every amount, KPI, axis label; right-align in tables. `Intl.NumberFormat` compact for KPIs/axes, full precision in tables, `signDisplay: "exceptZero"` for deltas, never sign by color alone.
- **Tables**: TanStack Table v8 + shadcn DataTable; inline category edit via cell Combobox, Enter to commit. Virtualize only >2k rows.
- **Command palette**: `cmdk` via shadcn Command in ⌘K dialog.

## 4. Layout recommendations

**Home (insights-only).** Above the fold: Net Worth hero with delta + sparkline + range toggle; 4-tile KPI strip (Spent vs last month, Income MTD, Net cash flow, Reward leak); Review-queue count as a button. Below: 6-month cash-flow bars, upcoming recurrings (14 days), top-5 category deltas, narrative card. No envelopes.

**Cards page.** (a) Which-card matrix: rows = categories, columns = cards, cell = effective % back, best cell highlighted with a filled chip; merchant search box. (b) Reward leak table: last-30-day transactions where card used ≠ best card, "left on table" column, monthly total KPI. (c) Per-card tiles: statement balance, due date, utilization bar, rotating-category status.

**Investments page.** Value line with Returns/Balance toggle and benchmark overlay; TWR ignoring contributions. **Taxable | Roth tabs.** Stock/bond and US/intl bars; holdings treemap colored by day change; holdings table with cost basis, gain, overlap warning. Roth contribution-room progress ring.

**LLM narrative.** One card, 3–5 bullets, each with an inline number and a deep-link chip to the filtered view; generated date and "based on N transactions" footer; regenerate button. No chat bubble on home.

**Mobile.** Priorities: review queue (swipe), net worth hero, upcoming recurrings, which-card lookup. Floating bottom bar; tables → stacked KV cards <640px; 44px targets.

## 5. Accessibility and color

- Red/green alone fails ~1 in 12 men; encode direction with sign, arrow, and position; grayscale test.
- Semantic money colors differ in lightness (Mercury `#2f7d57` / `#b54a3a`), always paired with `+`/`−`.
- Category palette: **Paul Tol muted** (9 + grey "Other") is the only vetted CVD-safe option past 8 ([Tol](https://personal.sron.nl/~pault/)). Assign once in a `categories` table, reuse everywhere.
- Direct-label donut segments; Recharts `accessibilityLayer` on; global privacy-blur toggle.

## Design decisions

1. **Nav:** 240px collapsible left sidebar (Home, Transactions, Cash Flow, Cards, Investments, Net Worth, Recurring, Reports) + ⌘K palette; floating bottom bar on mobile.
2. **Home hierarchy:** Net Worth hero + range toggle → 4 KPI tiles → Review-queue button → 6-month cash-flow bars → Upcoming → narrative card.
3. **Chart lib:** Recharts v3 through shadcn `ChartContainer`; Sankey and Treemap from Recharts; no second chart library.
4. **Sparklines:** hand-rolled inline SVG.
5. **Dark mode:** ship both, default `system`, design light first.
6. **Palette:** neutral-first, one indigo accent, green/red reserved for signed money and state.
7. **Category colors:** Paul Tol muted, 9 + grey "Other", stored per category in DB.
8. **Never encode gain/loss by hue alone:** sign + arrow glyph, lightness-separated green/red.
9. **Typography:** Geist (UI) + Geist Mono (IDs/tickers), `tabular-nums` on every amount.
10. **Number formatting:** compact in tiles/axes, full cents in tables, `signDisplay: "exceptZero"`, never parentheses.
11. **Density:** Stripe/Linear level: 13–14px table text, 36px rows, 8px radius, hairline borders, no shadows except modals.
12. **Transactions:** TanStack Table, inline Combobox category edit, keyboard `j/k`, `c` to categorize, Enter to approve.
13. **Cards page** leads with the which-card matrix and a monthly "left on the table" KPI.
14. **Investments:** Taxable | Roth tabs, TWR with benchmark overlay, stock/bond + US/intl bars, holdings treemap, overlap warning.
15. **LLM narrative:** one card, 3–5 bullets with inline numbers and deep-link chips, timestamp and data-count footer.

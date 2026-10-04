-- Deterministic rules that run before the merchant cache, Plaid, and the LLM.
-- Lower priority number = evaluated first. Patterns are case-insensitive substrings unless is_regex.

insert into category_rules (priority, match_field, pattern, is_regex, category_id, mark_transfer, enabled) values
  -- Credit card payments (either side). Transfer pairing will also catch these when both legs are visible.
  (10, 'raw_description', '(AUTOMATIC PAYMENT|AUTOPAY|PAYMENT - THANK YOU|PAYMENT THANK YOU|ONLINE PAYMENT.*THANK|CARDMEMBER SERV|CHASE CREDIT CRD|DISCOVER E-PAYMENT|US BANK.*PAYMENT|SYNCHRONY.*PAYMENT)', true, 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT', false, true),
  -- P2P rails: bank-side lines are transfers to the Venmo/PayPal ledger; the Venmo/PayPal feeds carry the real spend.
  (20, 'raw_description', '(VENMO|PAYPAL.*(TRANSFER|INST XFER|CASHOUT))', true, 'TRANSFER_OUT_ACCOUNT_TRANSFER', false, true),
  (21, 'raw_description', 'ZELLE', false, 'TRANSFER_OUT_OTHER_TRANSFER_OUT', false, true),
  -- Brokerage / IRA funding
  (30, 'raw_description', '(ROBINHOOD|FIDELITY|FID BKG|VANGUARD|SCHWAB)', true, 'TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS', false, true),
  -- Bank interest
  (40, 'raw_description', '(INTEREST PAYMENT|INTRST PYMNT|INTEREST PAID|INT PAYMENT)', true, 'INCOME_INTEREST_EARNED', false, true),
  -- Wages / payroll
  (41, 'raw_description', '(PAYROLL|DIRECT DEP|DIR DEP|STANFORD UNIV.*(PAY|SAL)|ADP|GUSTO|WORKDAY)', true, 'INCOME_WAGES', false, true),
  -- Obvious merchants Plaid sometimes rates LOW
  (100, 'merchant_norm', 'AMAZON', false, 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES', false, true),
  (100, 'merchant_norm', 'WHOLE FOODS', false, 'FOOD_AND_DRINK_GROCERIES', false, true),
  (100, 'merchant_norm', 'TRADER JOES', false, 'FOOD_AND_DRINK_GROCERIES', false, true),
  (100, 'merchant_norm', 'SAFEWAY', false, 'FOOD_AND_DRINK_GROCERIES', false, true),
  (100, 'merchant_norm', 'COSTCO', false, 'GENERAL_MERCHANDISE_SUPERSTORES', false, true),
  (100, 'merchant_norm', 'UBER EATS', false, 'FOOD_AND_DRINK_RESTAURANT', false, true),
  (100, 'merchant_norm', 'DOORDASH', false, 'FOOD_AND_DRINK_RESTAURANT', false, true),
  (100, 'merchant_norm', 'UBER', false, 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES', false, true),
  (100, 'merchant_norm', 'LYFT', false, 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES', false, true),
  (100, 'merchant_norm', 'CALTRAIN', false, 'TRANSPORTATION_PUBLIC_TRANSIT', false, true),
  (100, 'merchant_norm', 'CLIPPER', false, 'TRANSPORTATION_PUBLIC_TRANSIT', false, true),
  (100, 'merchant_norm', 'BART', false, 'TRANSPORTATION_PUBLIC_TRANSIT', false, true),
  (100, 'merchant_norm', 'NETFLIX', false, 'ENTERTAINMENT_TV_AND_MOVIES', false, true),
  (100, 'merchant_norm', 'SPOTIFY', false, 'ENTERTAINMENT_MUSIC_AND_AUDIO', false, true),
  (100, 'merchant_norm', 'STARBUCKS', false, 'FOOD_AND_DRINK_COFFEE', false, true),
  (100, 'merchant_norm', 'CHEVRON', false, 'TRANSPORTATION_GAS', false, true),
  (100, 'merchant_norm', 'SHELL', false, 'TRANSPORTATION_GAS', false, true)
on conflict do nothing;

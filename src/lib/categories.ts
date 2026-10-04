/**
 * Category taxonomy: Plaid Personal Finance Categories (PFC).
 * Primary ids are the 16 PFC primaries; detailed ids are `${primary}_${detail}`.
 * This file is the source of truth; `scripts/seed-categories.ts` upserts it into Postgres.
 */

export type CategoryKind = "income" | "expense" | "transfer" | "investment";
export type BudgetBucket = "need" | "want" | "save" | "income" | "transfer";

export interface PrimaryCategory {
  id: string;
  name: string;
  kind: CategoryKind;
  bucket: BudgetBucket;
  color: string;
  icon: string;
  detailed: Array<{ id: string; name: string; bucket?: BudgetBucket }>;
}

// Paul Tol "muted" palette (colorblind-safe) + grey for transfers.
const TOL = {
  indigo: "#332288",
  cyan: "#88CCEE",
  teal: "#44AA99",
  green: "#117733",
  olive: "#999933",
  sand: "#DDCC77",
  rose: "#CC6677",
  wine: "#882255",
  purple: "#AA4499",
  grey: "#BBBBBB",
} as const;

const d = (primary: string, detail: string, name: string, bucket?: BudgetBucket) => ({
  id: `${primary}_${detail}`,
  name,
  ...(bucket ? { bucket } : {}),
});

export const PRIMARY_CATEGORIES: PrimaryCategory[] = [
  {
    id: "INCOME", name: "Income", kind: "income", bucket: "income", color: TOL.green, icon: "banknote",
    detailed: [
      d("INCOME", "DIVIDENDS", "Dividends"),
      d("INCOME", "INTEREST_EARNED", "Interest earned"),
      d("INCOME", "RETIREMENT_PENSION", "Retirement / pension"),
      d("INCOME", "TAX_REFUND", "Tax refund"),
      d("INCOME", "UNEMPLOYMENT", "Unemployment"),
      d("INCOME", "WAGES", "Wages"),
      d("INCOME", "OTHER_INCOME", "Other income"),
    ],
  },
  {
    id: "TRANSFER_IN", name: "Transfer in", kind: "transfer", bucket: "transfer", color: TOL.grey, icon: "arrow-down-left",
    detailed: [
      d("TRANSFER_IN", "CASH_ADVANCES_AND_LOANS", "Cash advances and loans"),
      d("TRANSFER_IN", "DEPOSIT", "Deposit"),
      d("TRANSFER_IN", "INVESTMENT_AND_RETIREMENT_FUNDS", "From investment / retirement"),
      d("TRANSFER_IN", "SAVINGS", "From savings"),
      d("TRANSFER_IN", "ACCOUNT_TRANSFER", "Account transfer"),
      d("TRANSFER_IN", "OTHER_TRANSFER_IN", "Other transfer in"),
    ],
  },
  {
    id: "TRANSFER_OUT", name: "Transfer out", kind: "transfer", bucket: "transfer", color: TOL.grey, icon: "arrow-up-right",
    detailed: [
      d("TRANSFER_OUT", "INVESTMENT_AND_RETIREMENT_FUNDS", "To investment / retirement", "save"),
      d("TRANSFER_OUT", "SAVINGS", "To savings", "save"),
      d("TRANSFER_OUT", "WITHDRAWAL", "Withdrawal"),
      d("TRANSFER_OUT", "ACCOUNT_TRANSFER", "Account transfer"),
      d("TRANSFER_OUT", "OTHER_TRANSFER_OUT", "Other transfer out"),
    ],
  },
  {
    id: "LOAN_PAYMENTS", name: "Loan payments", kind: "transfer", bucket: "transfer", color: TOL.grey, icon: "credit-card",
    detailed: [
      d("LOAN_PAYMENTS", "CAR_PAYMENT", "Car payment", "need"),
      d("LOAN_PAYMENTS", "CREDIT_CARD_PAYMENT", "Credit card payment"),
      d("LOAN_PAYMENTS", "PERSONAL_LOAN_PAYMENT", "Personal loan payment", "need"),
      d("LOAN_PAYMENTS", "MORTGAGE_PAYMENT", "Mortgage payment", "need"),
      d("LOAN_PAYMENTS", "STUDENT_LOAN_PAYMENT", "Student loan payment", "need"),
      d("LOAN_PAYMENTS", "OTHER_PAYMENT", "Other loan payment", "need"),
    ],
  },
  {
    id: "BANK_FEES", name: "Bank fees", kind: "expense", bucket: "need", color: TOL.wine, icon: "receipt",
    detailed: [
      d("BANK_FEES", "ATM_FEES", "ATM fees"),
      d("BANK_FEES", "FOREIGN_TRANSACTION_FEES", "Foreign transaction fees"),
      d("BANK_FEES", "INSUFFICIENT_FUNDS", "Insufficient funds"),
      d("BANK_FEES", "INTEREST_CHARGE", "Interest charge"),
      d("BANK_FEES", "OVERDRAFT_FEES", "Overdraft fees"),
      d("BANK_FEES", "OTHER_BANK_FEES", "Other bank fees"),
    ],
  },
  {
    id: "ENTERTAINMENT", name: "Entertainment", kind: "expense", bucket: "want", color: TOL.purple, icon: "clapperboard",
    detailed: [
      d("ENTERTAINMENT", "CASINOS_AND_GAMBLING", "Casinos and gambling"),
      d("ENTERTAINMENT", "MUSIC_AND_AUDIO", "Music and audio"),
      d("ENTERTAINMENT", "SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS", "Events, parks, museums"),
      d("ENTERTAINMENT", "TV_AND_MOVIES", "TV and movies"),
      d("ENTERTAINMENT", "VIDEO_GAMES", "Video games"),
      d("ENTERTAINMENT", "OTHER_ENTERTAINMENT", "Other entertainment"),
    ],
  },
  {
    id: "FOOD_AND_DRINK", name: "Food and drink", kind: "expense", bucket: "want", color: TOL.teal, icon: "utensils",
    detailed: [
      d("FOOD_AND_DRINK", "BEER_WINE_AND_LIQUOR", "Beer, wine, liquor"),
      d("FOOD_AND_DRINK", "COFFEE", "Coffee"),
      d("FOOD_AND_DRINK", "FAST_FOOD", "Fast food"),
      d("FOOD_AND_DRINK", "GROCERIES", "Groceries", "need"),
      d("FOOD_AND_DRINK", "RESTAURANT", "Restaurants"),
      d("FOOD_AND_DRINK", "VENDING_MACHINES", "Vending machines"),
      d("FOOD_AND_DRINK", "OTHER_FOOD_AND_DRINK", "Other food and drink"),
    ],
  },
  {
    id: "GENERAL_MERCHANDISE", name: "Shopping", kind: "expense", bucket: "want", color: TOL.indigo, icon: "shopping-bag",
    detailed: [
      d("GENERAL_MERCHANDISE", "BOOKSTORES_AND_NEWSSTANDS", "Bookstores"),
      d("GENERAL_MERCHANDISE", "CLOTHING_AND_ACCESSORIES", "Clothing"),
      d("GENERAL_MERCHANDISE", "CONVENIENCE_STORES", "Convenience stores"),
      d("GENERAL_MERCHANDISE", "DEPARTMENT_STORES", "Department stores"),
      d("GENERAL_MERCHANDISE", "DISCOUNT_STORES", "Discount stores"),
      d("GENERAL_MERCHANDISE", "ELECTRONICS", "Electronics"),
      d("GENERAL_MERCHANDISE", "GIFTS_AND_NOVELTIES", "Gifts"),
      d("GENERAL_MERCHANDISE", "OFFICE_SUPPLIES", "Office supplies"),
      d("GENERAL_MERCHANDISE", "ONLINE_MARKETPLACES", "Online marketplaces"),
      d("GENERAL_MERCHANDISE", "PET_SUPPLIES", "Pet supplies"),
      d("GENERAL_MERCHANDISE", "SPORTING_GOODS", "Sporting goods"),
      d("GENERAL_MERCHANDISE", "SUPERSTORES", "Superstores"),
      d("GENERAL_MERCHANDISE", "TOBACCO_AND_VAPE", "Tobacco and vape"),
      d("GENERAL_MERCHANDISE", "OTHER_GENERAL_MERCHANDISE", "Other shopping"),
    ],
  },
  {
    id: "HOME_IMPROVEMENT", name: "Home", kind: "expense", bucket: "need", color: TOL.olive, icon: "house",
    detailed: [
      d("HOME_IMPROVEMENT", "FURNITURE", "Furniture", "want"),
      d("HOME_IMPROVEMENT", "HARDWARE", "Hardware"),
      d("HOME_IMPROVEMENT", "REPAIR_AND_MAINTENANCE", "Repair and maintenance"),
      d("HOME_IMPROVEMENT", "SECURITY", "Security"),
      d("HOME_IMPROVEMENT", "OTHER_HOME_IMPROVEMENT", "Other home"),
    ],
  },
  {
    id: "MEDICAL", name: "Medical", kind: "expense", bucket: "need", color: TOL.rose, icon: "heart-pulse",
    detailed: [
      d("MEDICAL", "DENTAL_CARE", "Dental"),
      d("MEDICAL", "EYE_CARE", "Eye care"),
      d("MEDICAL", "NURSING_CARE", "Nursing care"),
      d("MEDICAL", "PHARMACIES_AND_SUPPLEMENTS", "Pharmacies"),
      d("MEDICAL", "PRIMARY_CARE", "Primary care"),
      d("MEDICAL", "VETERINARY_SERVICES", "Veterinary"),
      d("MEDICAL", "OTHER_MEDICAL", "Other medical"),
    ],
  },
  {
    id: "PERSONAL_CARE", name: "Personal care", kind: "expense", bucket: "want", color: TOL.cyan, icon: "sparkles",
    detailed: [
      d("PERSONAL_CARE", "GYMS_AND_FITNESS_CENTERS", "Gym and fitness"),
      d("PERSONAL_CARE", "HAIR_AND_BEAUTY", "Hair and beauty"),
      d("PERSONAL_CARE", "LAUNDRY_AND_DRY_CLEANING", "Laundry", "need"),
      d("PERSONAL_CARE", "OTHER_PERSONAL_CARE", "Other personal care"),
    ],
  },
  {
    id: "GENERAL_SERVICES", name: "Services", kind: "expense", bucket: "need", color: TOL.sand, icon: "wrench",
    detailed: [
      d("GENERAL_SERVICES", "ACCOUNTING_AND_FINANCIAL_PLANNING", "Accounting and financial"),
      d("GENERAL_SERVICES", "AUTOMOTIVE", "Automotive"),
      d("GENERAL_SERVICES", "CHILDCARE", "Childcare"),
      d("GENERAL_SERVICES", "CONSULTING_AND_LEGAL", "Consulting and legal"),
      d("GENERAL_SERVICES", "EDUCATION", "Education"),
      d("GENERAL_SERVICES", "INSURANCE", "Insurance"),
      d("GENERAL_SERVICES", "POSTAGE_AND_SHIPPING", "Postage and shipping"),
      d("GENERAL_SERVICES", "STORAGE", "Storage"),
      d("GENERAL_SERVICES", "OTHER_GENERAL_SERVICES", "Other services"),
    ],
  },
  {
    id: "GOVERNMENT_AND_NON_PROFIT", name: "Government and giving", kind: "expense", bucket: "need", color: TOL.wine, icon: "landmark",
    detailed: [
      d("GOVERNMENT_AND_NON_PROFIT", "DONATIONS", "Donations", "want"),
      d("GOVERNMENT_AND_NON_PROFIT", "GOVERNMENT_DEPARTMENTS_AND_AGENCIES", "Government agencies"),
      d("GOVERNMENT_AND_NON_PROFIT", "TAX_PAYMENT", "Tax payment"),
      d("GOVERNMENT_AND_NON_PROFIT", "OTHER_GOVERNMENT_AND_NON_PROFIT", "Other government / non-profit"),
    ],
  },
  {
    id: "TRANSPORTATION", name: "Transportation", kind: "expense", bucket: "need", color: TOL.olive, icon: "car",
    detailed: [
      d("TRANSPORTATION", "BIKES_AND_SCOOTERS", "Bikes and scooters"),
      d("TRANSPORTATION", "GAS", "Gas"),
      d("TRANSPORTATION", "PARKING", "Parking"),
      d("TRANSPORTATION", "PUBLIC_TRANSIT", "Public transit"),
      d("TRANSPORTATION", "TAXIS_AND_RIDE_SHARES", "Taxis and ride shares", "want"),
      d("TRANSPORTATION", "TOLLS", "Tolls"),
      d("TRANSPORTATION", "OTHER_TRANSPORTATION", "Other transportation"),
    ],
  },
  {
    id: "TRAVEL", name: "Travel", kind: "expense", bucket: "want", color: TOL.cyan, icon: "plane",
    detailed: [
      d("TRAVEL", "FLIGHTS", "Flights"),
      d("TRAVEL", "LODGING", "Lodging"),
      d("TRAVEL", "RENTAL_CARS", "Rental cars"),
      d("TRAVEL", "OTHER_TRAVEL", "Other travel"),
    ],
  },
  {
    id: "RENT_AND_UTILITIES", name: "Rent and utilities", kind: "expense", bucket: "need", color: TOL.sand, icon: "plug",
    detailed: [
      d("RENT_AND_UTILITIES", "GAS_AND_ELECTRICITY", "Gas and electricity"),
      d("RENT_AND_UTILITIES", "INTERNET_AND_CABLE", "Internet and cable"),
      d("RENT_AND_UTILITIES", "RENT", "Rent"),
      d("RENT_AND_UTILITIES", "SEWAGE_AND_WASTE_MANAGEMENT", "Sewage and waste"),
      d("RENT_AND_UTILITIES", "TELEPHONE", "Phone"),
      d("RENT_AND_UTILITIES", "WATER", "Water"),
      d("RENT_AND_UTILITIES", "OTHER_UTILITIES", "Other utilities"),
    ],
  },
];

export interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  kind: CategoryKind;
  bucket: BudgetBucket;
  color: string;
  icon: string | null;
  sort: number;
}

export function flattenCategories(): CategoryRow[] {
  const rows: CategoryRow[] = [];
  PRIMARY_CATEGORIES.forEach((p, i) => {
    rows.push({ id: p.id, parent_id: null, name: p.name, kind: p.kind, bucket: p.bucket, color: p.color, icon: p.icon, sort: i * 100 });
    p.detailed.forEach((c, j) => {
      rows.push({
        id: c.id, parent_id: p.id, name: c.name, kind: p.kind,
        bucket: c.bucket ?? p.bucket, color: p.color, icon: null, sort: i * 100 + j + 1,
      });
    });
  });
  return rows;
}

const ALL = flattenCategories();
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function categoryById(id: string | null | undefined): CategoryRow | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function primaryOf(id: string | null | undefined): CategoryRow | undefined {
  const c = categoryById(id);
  if (!c) return undefined;
  return c.parent_id ? BY_ID.get(c.parent_id) : c;
}

/** Resolve a Plaid PFC pair to a known category id (detailed if known, else primary, else null). */
export function resolvePlaidCategory(primary?: string | null, detailed?: string | null): string | null {
  if (detailed && BY_ID.has(detailed)) return detailed;
  if (primary && BY_ID.has(primary)) return primary;
  return null;
}

/** The compact list the LLM is allowed to choose from. */
export function llmCategoryChoices(): string[] {
  return ALL.map((c) => c.id);
}

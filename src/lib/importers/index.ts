import type { Importer } from "./types";
import { wellsFargo, chase, usBank, discover } from "./banks";
import { venmo, paypal } from "./p2p";
import { robinhood, fidelityActivity, fidelityPositions } from "./brokerages";

export const IMPORTERS: Importer[] = [wellsFargo, chase, usBank, discover, venmo, paypal, robinhood, fidelityActivity, fidelityPositions];

export function importerById(id: string): Importer | undefined {
  return IMPORTERS.find((i) => i.id === id);
}

/** Sniff the file text and return the first importer whose detect() matches. */
export function detectImporter(text: string): Importer | undefined {
  return IMPORTERS.find((i) => {
    try { return i.detect(text); } catch { return false; }
  });
}

export type { Importer, ParseResult, NormalizedTxn, NormalizedInvestmentTxn, NormalizedHolding } from "./types";

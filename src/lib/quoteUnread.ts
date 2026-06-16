import type { QuoteRequest } from "./firebase/quoteRepository";

/** Quote has not been reviewed in admin yet. */
export function isQuoteUnread(quote: QuoteRequest): boolean {
  return quote.adminReadAt === null;
}

export function countUnreadQuotes(quotes: QuoteRequest[]): number {
  return quotes.filter(isQuoteUnread).length;
}

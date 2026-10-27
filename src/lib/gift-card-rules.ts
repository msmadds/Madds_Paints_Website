/**
 * Gift card rules shared by the server and the browser (no secrets here).
 */

/** Amounts buyers can choose, in TZS. */
export const GIFT_CARD_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

/** Cards are valid for this many months from the day they are issued. */
export const GIFT_CARD_VALID_MONTHS = 12;

/** Codes use letters and digits that cannot be confused (no 0/O, 1/I/L). */
export const GIFT_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const GIFT_CODE_LENGTH = 12;

/** "7kq4 mx2p-rt9h" → "7KQ4MX2PRT9H" (or null if it cannot be a code). */
export function normaliseGiftCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[\s-]/g, "");
  if (c.length !== GIFT_CODE_LENGTH) return null;
  for (const ch of c) if (!GIFT_CODE_ALPHABET.includes(ch)) return null;
  return c;
}

/** "7KQ4MX2PRT9H" → "7KQ4-MX2P-RT9H" */
export function formatGiftCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

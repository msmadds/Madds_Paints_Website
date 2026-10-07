/**
 * Time-limited promotion. Applied on the server at checkout (src/lib/orders.ts)
 * and shown in the banner, cart and checkout. Ends automatically at `endsAt`.
 */
export const PROMOTION = {
  code: "CSW2026",
  name: "Customer Service Week",
  percent: 10,
  /** Times are Dar es Salaam (EAT, UTC+3). */
  startsAt: new Date("2026-10-05T00:00:00+03:00"),
  endsAt: new Date("2026-10-11T23:59:59+03:00"),
} as const;

export function promotionActive(now = new Date()): boolean {
  return now >= PROMOTION.startsAt && now <= PROMOTION.endsAt;
}

/** Price of an available original after the promotion discount. */
export function salePrice(price: number): number {
  return Math.round((price * (100 - PROMOTION.percent)) / 100);
}

/** Discount on original paintings only; prints stay at full price. */
export function originalsDiscount(lines: { kind: "original" | "print"; lineTotal: number }[], now = new Date()): number {
  if (!promotionActive(now)) return 0;
  const originals = lines.filter((l) => l.kind === "original").reduce((s, l) => s + l.lineTotal, 0);
  return Math.round((originals * PROMOTION.percent) / 100);
}

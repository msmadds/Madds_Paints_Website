import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import type { GiftCard } from "@/db/schema";
import { randomToken } from "./crypto";
import { sendGiftCard } from "./email";
import type { Settings } from "./settings";
import { GIFT_CARD_VALID_MONTHS, GIFT_CODE_ALPHABET, GIFT_CODE_LENGTH, normaliseGiftCode } from "./gift-card-rules";

/*
 * Gift card workflow
 * ------------------
 *  1. Bought      → an order with one `gift_card` item, paid by M-Pesa like any other.
 *  2. Paid        → a card is issued for each gift card item (idempotent per item)
 *                   and emailed to the recipient, or to the buyer.
 *  3. Spent       → at checkout the balance is taken off the order total inside the
 *                   order transaction; a row in gift_card_redemptions records it.
 *  4. Cancelled   → redemptions on the order are reversed (balance restored) and
 *                   cards bought by the order are disabled.
 */

function generateCode(): string {
  let c = "";
  for (let i = 0; i < GIFT_CODE_LENGTH; i++) c += GIFT_CODE_ALPHABET[randomInt(GIFT_CODE_ALPHABET.length)];
  return c;
}

export function giftCardExpiry(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + GIFT_CARD_VALID_MONTHS);
  return d;
}

export function giftCardUsable(card: Pick<GiftCard, "status" | "balance" | "expiresAt">, now = new Date()) {
  return card.status === "active" && card.balance > 0 && card.expiresAt > now;
}

/** Why a card cannot be used, in words a customer understands. */
export function giftCardProblem(card: Pick<GiftCard, "status" | "balance" | "expiresAt"> | undefined, now = new Date()): string | null {
  if (!card) return "We could not find that gift card. Check the code and try again.";
  if (card.status !== "active") return "This gift card is no longer active. Contact us if you think this is a mistake.";
  if (card.expiresAt <= now) return "This gift card has expired.";
  if (card.balance <= 0) return "This gift card has been fully used.";
  return null;
}

export async function findGiftCardByCode(input: string) {
  const code = normaliseGiftCode(input);
  if (!code) return undefined;
  return db.query.giftCards.findFirst({ where: eq(schema.giftCards.code, code) });
}

/** Creates a card with a unique code. Must run inside a transaction. */
export async function insertGiftCard(
  tx: Tx,
  values: Omit<typeof schema.giftCards.$inferInsert, "code" | "accessToken" | "balance">,
): Promise<GiftCard> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const clash = await tx.query.giftCards.findFirst({ where: eq(schema.giftCards.code, code), columns: { id: true } });
    if (clash) continue;
    const [card] = await tx
      .insert(schema.giftCards)
      .values({ ...values, code, accessToken: randomToken(24), balance: values.initialValue })
      .returning();
    return card;
  }
  throw new Error("Could not generate a unique gift card code.");
}

/** Issues one card per paid gift card item on the order. Safe to call more than once. */
export async function issueGiftCardsForOrder(tx: Tx, orderId: string, now: Date) {
  const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order) return [];
  const items = await tx.query.orderItems.findMany({
    where: and(eq(schema.orderItems.orderId, orderId), eq(schema.orderItems.itemType, "gift_card")),
  });
  const issued: GiftCard[] = [];
  for (const item of items) {
    const existing = await tx.query.giftCards.findFirst({ where: eq(schema.giftCards.purchaseOrderItemId, item.id) });
    if (existing) continue;
    const d = item.details;
    issued.push(
      await insertGiftCard(tx, {
        initialValue: item.unitPrice,
        currency: order.currency,
        purchaseOrderId: order.id,
        purchaseOrderItemId: item.id,
        senderName: d?.senderName ?? order.customerName,
        recipientName: d?.sendToRecipient ? d.recipientName ?? null : null,
        deliverToEmail: d?.sendToRecipient ? d.recipientEmail ?? order.email : order.email,
        message: d?.message ?? null,
        expiresAt: giftCardExpiry(now),
        issuedBy: "order",
      }),
    );
  }
  if (issued.length) {
    await tx.insert(schema.orderEvents).values({
      orderId,
      type: "gift_card_issued",
      message: `Gift card${issued.length > 1 ? "s" : ""} issued: ${issued.map((c) => c.code.slice(-4)).map((s) => `…${s}`).join(", ")}.`,
    });
  }
  return issued;
}

/**
 * Takes up to `amount` from the card for this order. Returns the amount taken.
 * Must run inside the order transaction; the row lock stops two orders
 * spending the same balance at once.
 */
export async function redeemGiftCard(tx: Tx, code: string, orderId: string, amount: number, currency: string, now: Date) {
  const [card] = await tx.select().from(schema.giftCards).where(eq(schema.giftCards.code, code)).for("update");
  const problem = giftCardProblem(card, now);
  if (problem) return { error: problem } as const;
  if (card.currency !== currency) return { error: "This gift card cannot be used for this order's currency." } as const;
  const take = Math.min(card.balance, amount);
  if (take <= 0) return { taken: 0, card } as const;
  await tx
    .update(schema.giftCards)
    .set({ balance: sql`${schema.giftCards.balance} - ${take}`, updatedAt: now })
    .where(eq(schema.giftCards.id, card.id));
  await tx.insert(schema.giftCardRedemptions).values({ giftCardId: card.id, orderId, amount: take });
  return { taken: take, card } as const;
}

/** Restores balances spent on a cancelled order and disables cards it bought. */
export async function reverseGiftCardsForOrder(tx: Tx, orderId: string, now: Date) {
  const open = await tx.query.giftCardRedemptions.findMany({
    where: and(eq(schema.giftCardRedemptions.orderId, orderId), isNull(schema.giftCardRedemptions.reversedAt)),
  });
  for (const r of open) {
    await tx
      .update(schema.giftCards)
      .set({ balance: sql`${schema.giftCards.balance} + ${r.amount}`, updatedAt: now })
      .where(eq(schema.giftCards.id, r.giftCardId));
    await tx.update(schema.giftCardRedemptions).set({ reversedAt: now }).where(eq(schema.giftCardRedemptions.id, r.id));
  }
  await tx
    .update(schema.giftCards)
    .set({ status: "disabled", updatedAt: now })
    .where(eq(schema.giftCards.purchaseOrderId, orderId));
  return open.length;
}

/** Cards that still need emailing (issued but not yet sent). */
export async function unsentGiftCards(orderId: string) {
  return db.query.giftCards.findMany({
    where: and(eq(schema.giftCards.purchaseOrderId, orderId), isNull(schema.giftCards.emailedAt)),
  });
}

export async function markGiftCardEmailed(id: string) {
  await db.update(schema.giftCards).set({ emailedAt: new Date(), updatedAt: new Date() }).where(eq(schema.giftCards.id, id));
}

/** Emails every card on the order that has not been sent yet. */
export async function deliverGiftCardsForOrder(orderId: string, settings: Settings) {
  for (const card of await unsentGiftCards(orderId)) {
    if (await sendGiftCard(card, settings)) await markGiftCardEmailed(card.id);
  }
}

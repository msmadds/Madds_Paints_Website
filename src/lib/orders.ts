import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db, schema, type Tx } from "@/db";
import type { Order, OrderItem, OrderStatus } from "@/db/schema";
import { generateOrderNumber, randomToken, safeEqual } from "./crypto";
import { formatMoney, ORDER_STATUS_LABELS } from "./format";
import type { CartItemInput, CheckoutInput } from "./validation";
import { COLLECTOR_CONSENT_TEXT } from "./validation";
import type { WebhookResult } from "./payments/types";
import { originalsDiscount, PROMOTION } from "./promotion";

/*
 * Inventory workflow
 * ------------------
 *  1. Order created   → originals are atomically moved available→reserved and
 *                       held by the order; print stock is atomically decremented.
 *                       If anything is unavailable the whole transaction rolls back.
 *  2. Reference sent  → hold no longer expires; admin reviews the payment.
 *  3. Payment verified→ held originals become SOLD automatically.
 *  4. Cancelled / hold expired without a reference → stock is handed back once
 *                       (guarded by orders.stock_released).
 *
 * The conditional UPDATE … WHERE status = 'available' is what prevents two
 * customers buying the same original at the same moment: only one UPDATE can
 * match the row.
 */

export class CheckoutError extends Error {
  constructor(message: string, public code: "unavailable" | "invalid" | "conflict" = "invalid") {
    super(message);
  }
}

type Line = {
  itemType: "original" | "print";
  artworkId: string;
  printVariantId: string | null;
  title: string;
  sizeLabel: string | null;
  imageUrl: string | null;
  medium: string | null;
  coaNumber: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  currency: string;
};

async function firstImage(tx: Tx, artworkId: string) {
  const img = await tx.query.artworkImages.findFirst({
    where: eq(schema.artworkImages.artworkId, artworkId),
    orderBy: [asc(schema.artworkImages.sortOrder)],
  });
  return img?.url ?? null;
}

/** Collapse duplicate cart lines and keep a stable lock order. */
export function normaliseCart(items: CartItemInput[]) {
  const originals = [...new Set(items.filter((i) => i.kind === "original").map((i) => i.artworkId))].sort();
  const prints = new Map<string, number>();
  for (const i of items) if (i.kind === "print") prints.set(i.variantId, Math.min(20, (prints.get(i.variantId) ?? 0) + i.quantity));
  return { originals, prints: [...prints.entries()].sort(([a], [b]) => a.localeCompare(b)) };
}

export type CreatedOrder = Order & { items: OrderItem[] };

export async function createOrder(input: CheckoutInput, holdHours: number, currency: string): Promise<CreatedOrder> {
  await releaseExpiredHolds();
  const { originals, prints } = normaliseCart(input.items);
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + holdHours * 3_600_000);
  const orderId = randomUUID();

  return db.transaction(async (tx) => {
    const lines: Line[] = [];

    for (const artworkId of originals) {
      const [a] = await tx
        .update(schema.artworks)
        .set({ status: "reserved", holdOrderId: orderId, holdExpiresAt, updatedAt: now })
        .where(
          and(
            eq(schema.artworks.id, artworkId),
            eq(schema.artworks.status, "available"),
            eq(schema.artworks.published, true),
            isNotNull(schema.artworks.price),
          ),
        )
        .returning();
      if (!a) {
        const existing = await tx.query.artworks.findFirst({ where: eq(schema.artworks.id, artworkId) });
        throw new CheckoutError(
          existing
            ? `"${existing.title}" has just been ${existing.status === "sold" ? "sold" : "reserved by another collector"}. Remove it from your cart to continue.`
            : "One of the originals in your cart is no longer available.",
          "unavailable",
        );
      }
      lines.push({
        itemType: "original",
        artworkId: a.id,
        printVariantId: null,
        title: a.title,
        sizeLabel: null,
        imageUrl: await firstImage(tx, a.id),
        medium: a.medium,
        coaNumber: a.coaIncluded ? a.coaNumber : null,
        unitPrice: a.price!,
        quantity: 1,
        lineTotal: a.price!,
        currency: a.currency,
      });
    }

    for (const [variantId, quantity] of prints) {
      const variant = await tx.query.printVariants.findFirst({
        where: eq(schema.printVariants.id, variantId),
        with: { printProduct: { with: { artwork: true } } },
      });
      const product = variant?.printProduct;
      const artwork = product?.artwork;
      if (!variant || !variant.active || !product?.published || !artwork?.published) {
        throw new CheckoutError("One of the prints in your cart is no longer available.", "unavailable");
      }
      const [updated] = await tx
        .update(schema.printVariants)
        .set({
          stock: sql`CASE WHEN ${schema.printVariants.stock} IS NULL THEN NULL ELSE ${schema.printVariants.stock} - ${quantity} END`,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.printVariants.id, variantId),
            or(isNull(schema.printVariants.stock), gte(schema.printVariants.stock, quantity)),
          ),
        )
        .returning({ id: schema.printVariants.id });
      if (!updated) {
        throw new CheckoutError(
          variant.stock && variant.stock > 0
            ? `Only ${variant.stock} of "${artwork.title}" (${variant.sizeLabel}) left. Lower the quantity to continue.`
            : `"${artwork.title}" (${variant.sizeLabel}) has sold out. Remove it from your cart to continue.`,
          "unavailable",
        );
      }
      lines.push({
        itemType: "print",
        artworkId: artwork.id,
        printVariantId: variant.id,
        title: artwork.title,
        sizeLabel: variant.sizeLabel,
        imageUrl: await firstImage(tx, artwork.id),
        medium: `Print on ${product.paperWeightGsm} GSM ${product.paperType.toLowerCase()}`,
        coaNumber: null,
        unitPrice: variant.price,
        quantity,
        lineTotal: variant.price * quantity,
        currency: variant.currency,
      });
    }

    if (lines.some((l) => l.currency !== currency)) {
      throw new CheckoutError("Items in your cart use different currencies. Contact us to complete this order.");
    }

    const zone = await tx.query.deliveryZones.findFirst({
      where: and(eq(schema.deliveryZones.id, input.deliveryZoneId), eq(schema.deliveryZones.active, true)),
    });
    if (!zone) throw new CheckoutError("Choose a delivery option.");

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const deliveryFee = zone.feeToBeConfirmed ? 0 : zone.fee;
    const discountTotal = originalsDiscount(lines.map((l) => ({ kind: l.itemType, lineTotal: l.lineTotal })), now);
    const total = subtotal + deliveryFee - discountTotal;

    let orderNumber = generateOrderNumber(now);
    for (let i = 0; i < 5; i++) {
      const clash = await tx.query.orders.findFirst({
        where: eq(schema.orders.orderNumber, orderNumber),
        columns: { id: true },
      });
      if (!clash) break;
      orderNumber = generateOrderNumber(now);
    }

    const [order] = await tx
      .insert(schema.orders)
      .values({
        id: orderId,
        orderNumber,
        accessToken: randomToken(24),
        status: "pending_payment",
        paymentStatus: "unpaid",
        paymentMethod: "mpesa_manual",
        customerName: input.customerName,
        phone: input.phone,
        email: input.email ?? null,
        address: input.address,
        city: input.city,
        deliveryNotes: input.deliveryNotes ?? null,
        deliveryZoneId: zone.id,
        deliveryZoneName: zone.name,
        deliveryFeeToBeConfirmed: zone.feeToBeConfirmed,
        currency,
        subtotal,
        deliveryFee,
        discountTotal,
        discountCode: discountTotal > 0 ? PROMOTION.code : null,
        total,
        collectorOptIn: Boolean(input.joinCollectorList && input.email),
        holdExpiresAt,
      })
      .returning();

    const items = await tx
      .insert(schema.orderItems)
      .values(
        lines.map((l) => ({
          orderId,
          itemType: l.itemType,
          artworkId: l.artworkId,
          printVariantId: l.printVariantId,
          title: l.title,
          sizeLabel: l.sizeLabel,
          imageUrl: l.imageUrl,
          medium: l.medium,
          coaNumber: l.coaNumber,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })),
      )
      .returning();

    await tx.insert(schema.orderEvents).values({
      orderId,
      type: "created",
      message: `Order placed for ${formatMoney(total, currency)}. Awaiting M-Pesa payment.`,
      actor: "customer",
    });

    return { ...order, items };
  });
}

/* ------------------------------------------------------------------ */
/* Releasing stock                                                    */
/* ------------------------------------------------------------------ */

/** Hands reserved stock back exactly once. Must run inside a transaction. */
async function releaseStock(tx: Tx, orderId: string, now: Date) {
  const [claimed] = await tx
    .update(schema.orders)
    .set({ stockReleased: true, updatedAt: now })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.stockReleased, false)))
    .returning({ id: schema.orders.id });
  if (!claimed) return false;

  const items = await tx.query.orderItems.findMany({ where: eq(schema.orderItems.orderId, orderId) });
  for (const item of items) {
    if (item.itemType === "print" && item.printVariantId) {
      await tx
        .update(schema.printVariants)
        .set({ stock: sql`${schema.printVariants.stock} + ${item.quantity}`, updatedAt: now })
        .where(and(eq(schema.printVariants.id, item.printVariantId), isNotNull(schema.printVariants.stock)));
    }
  }
  await tx
    .update(schema.artworks)
    .set({ status: "available", holdOrderId: null, holdExpiresAt: null, soldAt: null, soldOrderId: null, updatedAt: now })
    .where(or(eq(schema.artworks.holdOrderId, orderId), eq(schema.artworks.soldOrderId, orderId)));
  return true;
}

/** Cancels unpaid orders whose hold expired before a payment code was sent. */
export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date();
  const expired = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.status, "pending_payment"),
        eq(schema.orders.stockReleased, false),
        isNotNull(schema.orders.holdExpiresAt),
        lt(schema.orders.holdExpiresAt, now),
      ),
    )
    .limit(100);

  let count = 0;
  for (const { id } of expired) {
    await db.transaction(async (tx) => {
      const [o] = await tx
        .update(schema.orders)
        .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
        .where(and(eq(schema.orders.id, id), eq(schema.orders.status, "pending_payment"), lt(schema.orders.holdExpiresAt, now)))
        .returning({ id: schema.orders.id });
      if (!o) return;
      await releaseStock(tx, id, now);
      await tx.insert(schema.orderEvents).values({
        orderId: id,
        type: "expired",
        message: "Cancelled automatically: no M-Pesa payment code was received before the hold expired. Items were returned to stock.",
      });
      count++;
    });
  }
  return count;
}

let lastRelease = 0;
/** Cheap, per-instance throttled wrapper for use on page loads. */
export async function releaseExpiredHoldsThrottled() {
  await connection();
  if (Date.now() - lastRelease < 60_000) return;
  lastRelease = Date.now();
  try {
    await releaseExpiredHolds();
  } catch (err) {
    console.error("[orders] releaseExpiredHolds failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Customer-facing                                                    */
/* ------------------------------------------------------------------ */

export async function getOrderForCustomer(orderNumber: string, key: string) {
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.orderNumber, orderNumber.toUpperCase()),
    with: {
      items: { orderBy: [asc(schema.orderItems.createdAt)] },
      payments: { orderBy: [asc(schema.payments.createdAt)] },
    },
  });
  if (!order || !safeEqual(order.accessToken, key)) return null;
  return order;
}

export async function submitPaymentReference(args: {
  orderNumber: string;
  key: string;
  reference: string;
  payerPhone?: string;
}): Promise<Order> {
  const order = await getOrderForCustomer(args.orderNumber, args.key);
  if (!order) throw new CheckoutError("We could not find that order. Use the link from your confirmation page.");
  if (order.status === "cancelled") {
    throw new CheckoutError(
      "This order was cancelled because payment was not received in time. If you have already paid, contact us with your M-Pesa code and we will sort it out.",
    );
  }
  if (!["pending_payment", "payment_verification"].includes(order.status)) {
    throw new CheckoutError("Payment for this order has already been confirmed.");
  }

  const now = new Date();
  try {
    return await db.transaction(async (tx) => {
      await tx.insert(schema.payments).values({
        orderId: order.id,
        provider: "mpesa_manual",
        amount: order.total,
        currency: order.currency,
        reference: args.reference,
        payerPhone: args.payerPhone ?? null,
        status: "submitted",
      });
      const [updated] = await tx
        .update(schema.orders)
        .set({ status: "payment_verification", paymentStatus: "pending_verification", holdExpiresAt: null, updatedAt: now })
        .where(and(eq(schema.orders.id, order.id), inArray(schema.orders.status, ["pending_payment", "payment_verification"])))
        .returning();
      if (!updated) throw new CheckoutError("This order can no longer accept a payment code. Contact us for help.");
      await tx
        .update(schema.artworks)
        .set({ holdExpiresAt: null, updatedAt: now })
        .where(eq(schema.artworks.holdOrderId, order.id));
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        type: "reference_submitted",
        message: `Customer submitted M-Pesa code ${args.reference}.`,
        actor: "customer",
      });
      return updated;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new CheckoutError("That M-Pesa code has already been submitted. Check the code in your SMS, or contact us.", "conflict");
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

async function markPaid(tx: Tx, orderId: string, actor: string, now: Date) {
  const [o] = await tx
    .update(schema.orders)
    .set({ status: "paid", paymentStatus: "paid", paidAt: now, holdExpiresAt: null, updatedAt: now })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.stockReleased, false)))
    .returning();
  if (!o) throw new CheckoutError("This order was cancelled and its items released. Create a new order instead.");
  // Rule: once an original is paid for, it is automatically SOLD.
  await tx
    .update(schema.artworks)
    .set({ status: "sold", soldAt: now, soldOrderId: orderId, holdOrderId: null, holdExpiresAt: null, updatedAt: now })
    .where(eq(schema.artworks.holdOrderId, orderId));
  await tx.insert(schema.orderEvents).values({ orderId, type: "paid", message: "Payment verified. Order marked Paid.", actor });
  return o;
}

export async function verifyPayment(paymentId: string, actor: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) });
    if (!payment) throw new CheckoutError("Payment not found.");
    if (payment.status === "verified") throw new CheckoutError("This payment is already verified.");
    await tx
      .update(schema.payments)
      .set({ status: "verified", verifiedAt: now, verifiedBy: actor, updatedAt: now })
      .where(eq(schema.payments.id, paymentId));
    return markPaid(tx, payment.orderId, actor, now);
  });
}

export async function rejectPayment(paymentId: string, actor: string, note: string, holdHours: number) {
  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + holdHours * 3_600_000);
  return db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({ where: eq(schema.payments.id, paymentId) });
    if (!payment) throw new CheckoutError("Payment not found.");
    await tx
      .update(schema.payments)
      .set({ status: "rejected", reviewNote: note || null, verifiedBy: actor, updatedAt: now })
      .where(eq(schema.payments.id, paymentId));
    const pendingOthers = await tx.query.payments.findFirst({
      where: and(eq(schema.payments.orderId, payment.orderId), eq(schema.payments.status, "submitted")),
    });
    if (!pendingOthers) {
      await tx
        .update(schema.orders)
        .set({ status: "pending_payment", paymentStatus: "unpaid", holdExpiresAt, updatedAt: now })
        .where(and(eq(schema.orders.id, payment.orderId), eq(schema.orders.status, "payment_verification")));
      await tx
        .update(schema.artworks)
        .set({ holdExpiresAt, updatedAt: now })
        .where(eq(schema.artworks.holdOrderId, payment.orderId));
    }
    await tx.insert(schema.orderEvents).values({
      orderId: payment.orderId,
      type: "payment_rejected",
      message: `M-Pesa code ${payment.reference} could not be verified.${note ? ` Note: ${note}` : ""} Hold extended by ${holdHours} hours.`,
      actor,
    });
  });
}

/** Admin records a payment received outside the website (e.g. customer phoned in). */
export async function recordManualPayment(orderId: string, reference: string, actor: string) {
  const now = new Date();
  try {
    return await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
      if (!order) throw new CheckoutError("Order not found.");
      await tx.insert(schema.payments).values({
        orderId,
        provider: "mpesa_manual",
        amount: order.total,
        currency: order.currency,
        reference,
        status: "verified",
        verifiedAt: now,
        verifiedBy: actor,
      });
      return markPaid(tx, orderId, actor, now);
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new CheckoutError("That M-Pesa code is already recorded on another payment.");
    throw err;
  }
}

export async function cancelOrder(orderId: string, actor: string, reason?: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
    if (!order) throw new CheckoutError("Order not found.");
    if (order.status === "cancelled") return order;
    const released = await releaseStock(tx, orderId, now);
    const [updated] = await tx
      .update(schema.orders)
      .set({ status: "cancelled", cancelledAt: now, holdExpiresAt: null, updatedAt: now })
      .where(eq(schema.orders.id, orderId))
      .returning();
    await tx.insert(schema.orderEvents).values({
      orderId,
      type: "cancelled",
      message: `Order cancelled.${released ? " Items returned to stock." : ""}${
        order.paymentStatus === "paid" ? " Payment had been received: arrange a refund with the customer." : ""
      }${reason ? ` Reason: ${reason}` : ""}`,
      actor,
    });
    return updated;
  });
}

const FULFILMENT: OrderStatus[] = ["processing", "ready_for_delivery", "shipped_delivered", "completed"];

export async function setOrderStatus(orderId: string, status: OrderStatus, actor: string) {
  if (status === "cancelled") return cancelOrder(orderId, actor);
  const now = new Date();
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
    if (!order) throw new CheckoutError("Order not found.");
    if (order.status === "cancelled") throw new CheckoutError("Cancelled orders cannot be reopened. Ask the customer to order again.");
    if (status === "paid") {
      if (order.paymentStatus === "paid") {
        const [o] = await tx.update(schema.orders).set({ status, updatedAt: now }).where(eq(schema.orders.id, orderId)).returning();
        return o;
      }
      return markPaid(tx, orderId, actor, now);
    }
    if (FULFILMENT.includes(status) && order.paymentStatus !== "paid") {
      throw new CheckoutError("Verify the M-Pesa payment before moving this order to fulfilment.");
    }
    if (status === "pending_payment" || status === "payment_verification") {
      throw new CheckoutError("Payment statuses are set by the payment flow. Use Verify or Reject on the payment instead.");
    }
    const [o] = await tx.update(schema.orders).set({ status, updatedAt: now }).where(eq(schema.orders.id, orderId)).returning();
    await tx.insert(schema.orderEvents).values({
      orderId,
      type: "status",
      message: `Status changed to ${ORDER_STATUS_LABELS[status]}.`,
      actor,
    });
    return o;
  });
}

/** Entry point for future automatic gateways (M-Pesa API, Airtel Money, card …). */
export async function confirmAutomaticPayment(providerId: string, result: WebhookResult) {
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, result.orderRef) });
  if (!order) throw new CheckoutError("Unknown order.");
  if (!result.success) return order;
  if (result.amount < order.total || result.currency !== order.currency) {
    throw new CheckoutError("Amount mismatch; leaving for manual review.");
  }
  const now = new Date();
  return db.transaction(async (tx) => {
    await tx
      .insert(schema.payments)
      .values({
        orderId: order.id,
        provider: providerId,
        amount: result.amount,
        currency: result.currency,
        reference: result.reference,
        payerPhone: result.payerPhone ?? null,
        status: "verified",
        raw: result.raw as object,
        verifiedAt: now,
        verifiedBy: providerId,
      })
      .onConflictDoNothing();
    if (order.paymentStatus === "paid") return order;
    return markPaid(tx, order.id, providerId, now);
  });
}

/* ------------------------------------------------------------------ */
/* Collector list                                                     */
/* ------------------------------------------------------------------ */

/** Adds or re-subscribes an email. Returns the token when a welcome should be sent. */
export async function addCollector(email: string, name: string | null, source = "checkout") {
  const normalized = email.trim().toLowerCase();
  const existing = await db.query.collectors.findFirst({ where: eq(schema.collectors.email, normalized) });
  const now = new Date();
  if (existing && !existing.unsubscribedAt) return null; // already subscribed
  if (existing) {
    await db
      .update(schema.collectors)
      .set({ unsubscribedAt: null, consentText: COLLECTOR_CONSENT_TEXT, consentedAt: now, source, updatedAt: now })
      .where(eq(schema.collectors.id, existing.id));
    return existing.unsubscribeToken;
  }
  const token = randomToken(24);
  await db
    .insert(schema.collectors)
    .values({ email: normalized, name, source, consentText: COLLECTOR_CONSENT_TEXT, unsubscribeToken: token })
    .onConflictDoNothing();
  return token;
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

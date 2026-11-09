"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { login, logout, requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { saveSettings, settingsSchema, getSettings } from "@/lib/settings";
import { deleteImage } from "@/lib/storage";
import {
  CheckoutError,
  cancelOrder,
  isUniqueViolation,
  recordManualPayment,
  rejectPayment,
  setOrderStatus,
  verifyPayment,
} from "@/lib/orders";
import { sendPaymentConfirmed } from "@/lib/email";
import { deliverGiftCardsForOrder, giftCardExpiry, insertGiftCard } from "@/lib/gift-cards";
import { currentMonthKey } from "@/lib/commissions";
import { sendGiftCard } from "@/lib/email";
import { orderStatus } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function back(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optInt = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(/[,\s]/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
const optDec = (fd: FormData, k: string) => {
  const v = str(fd, k).replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(1) : "bad";
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

function refreshShop() {
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ */
/* auth                                                               */
/* ------------------------------------------------------------------ */

export async function loginAction(_: { error?: string; email?: string } | undefined, fd: FormData) {
  const res = await login(str(fd, "email"), String(fd.get("password") ?? ""));
  if (!res.ok) return { error: res.error, email: str(fd, "email") };
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ */
/* artworks                                                           */
/* ------------------------------------------------------------------ */

function parseArtwork(fd: FormData) {
  const title = str(fd, "title");
  const errors: string[] = [];
  if (title.length < 1) errors.push("Enter a title.");
  const price = optInt(fd, "price");
  if (Number.isNaN(price) || (price !== null && price < 0)) errors.push("Price must be a whole number, or empty if not for sale.");
  const year = optInt(fd, "year");
  if (Number.isNaN(year) || (year !== null && (year < 1900 || year > 2100))) errors.push("Enter a valid year.");
  const widthCm = optDec(fd, "widthCm");
  const heightCm = optDec(fd, "heightCm");
  const depthCm = optDec(fd, "depthCm");
  if ([widthCm, heightCm, depthCm].includes("bad")) errors.push("Dimensions must be numbers in centimetres.");
  const sortOrder = optInt(fd, "sortOrder") ?? 0;
  const coaNumber = str(fd, "coaNumber") || null;
  return {
    errors,
    values: {
      title: title.slice(0, 200),
      slug: slugify(str(fd, "slug") || title) || `work-${Date.now()}`,
      artistName: str(fd, "artistName") || "MedePaints",
      medium: str(fd, "medium").slice(0, 200),
      description: str(fd, "description").slice(0, 8000),
      widthCm: widthCm as string | null,
      heightCm: heightCm as string | null,
      depthCm: depthCm as string | null,
      year: year as number | null,
      price: price as number | null,
      coaIncluded: bool(fd, "coaIncluded"),
      coaNumber,
      featured: bool(fd, "featured"),
      published: bool(fd, "published"),
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    },
  };
}

export async function createArtwork(fd: FormData) {
  await requireAdmin();
  const { errors, values } = parseArtwork(fd);
  if (errors.length) back("/admin/artworks/new", "error", errors.join(" "));
  let id: string;
  try {
    const [row] = await db.insert(schema.artworks).values(values).returning({ id: schema.artworks.id });
    id = row.id;
  } catch (err) {
    if (isUniqueViolation(err)) back("/admin/artworks/new", "error", "That URL slug or certificate number is already used by another artwork.");
    throw err;
  }
  refreshShop();
  back(`/admin/artworks/${id}`, "ok", "Artwork created. Add images and prints below.");
}

export async function updateArtwork(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const path = `/admin/artworks/${id}`;
  const { errors, values } = parseArtwork(fd);
  if (errors.length) back(path, "error", errors.join(" "));

  const current = await db.query.artworks.findFirst({ where: eq(schema.artworks.id, id) });
  if (!current) back("/admin/artworks", "error", "Artwork not found.");

  const requested = z.enum(["available", "reserved", "sold"]).safeParse(str(fd, "status"));
  const statusPatch: Partial<typeof schema.artworks.$inferInsert> = {};
  if (requested.success && requested.data !== current.status) {
    if (current.holdOrderId) {
      back(path, "error", "This original is held by an order. Verify, reject or cancel that order to change its status.");
    }
    statusPatch.status = requested.data;
    if (requested.data === "sold") statusPatch.soldAt = new Date();
    if (requested.data !== "sold") {
      statusPatch.soldAt = null;
      statusPatch.soldOrderId = null;
    }
  }
  try {
    await db
      .update(schema.artworks)
      .set({ ...values, ...statusPatch, updatedAt: new Date() })
      .where(eq(schema.artworks.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) back(path, "error", "That URL slug or certificate number is already used by another artwork.");
    throw err;
  }
  console.info(`[admin] ${admin.email} updated artwork ${id}`);
  refreshShop();
  back(path, "ok", "Saved.");
}

export async function deleteArtwork(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const a = await db.query.artworks.findFirst({ where: eq(schema.artworks.id, id), with: { images: true } });
  if (!a) back("/admin/artworks", "error", "Artwork not found.");
  if (a.status === "sold" || a.holdOrderId) {
    back(`/admin/artworks/${id}`, "error", "Sold or held originals are kept as a record. Untick “Published” to hide it instead.");
  }
  if (str(fd, "confirm") !== a.title) {
    back(`/admin/artworks/${id}`, "error", "Type the exact title to confirm deletion.");
  }
  await db.delete(schema.artworks).where(eq(schema.artworks.id, id));
  for (const img of a.images) await deleteImage(img.url);
  refreshShop();
  back("/admin/artworks", "ok", `Deleted “${a.title}”.`);
}

export async function addArtworkImage(input: { artworkId: string; url: string; width: number; height: number; alt: string }) {
  await requireAdmin();
  const parsed = z
    .object({
      artworkId: z.uuid(),
      url: z.string().refine((u) => u.startsWith("https://") || u.startsWith("/uploads/"), "Invalid image URL"),
      width: z.number().int().positive().max(20000),
      height: z.number().int().positive().max(20000),
      alt: z.string().max(300),
    })
    .parse(input);
  const existing = await db.query.artworkImages.findMany({ where: eq(schema.artworkImages.artworkId, parsed.artworkId) });
  await db.insert(schema.artworkImages).values({ ...parsed, sortOrder: existing.length });
  refreshShop();
  return { ok: true };
}

export async function makeMainImage(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "imageId");
  const artworkId = str(fd, "artworkId");
  const images = await db.query.artworkImages.findMany({
    where: eq(schema.artworkImages.artworkId, artworkId),
    orderBy: (i, { asc }) => [asc(i.sortOrder)],
  });
  const ordered = [images.find((i) => i.id === id)!, ...images.filter((i) => i.id !== id)].filter(Boolean);
  for (const [idx, img] of ordered.entries()) {
    await db.update(schema.artworkImages).set({ sortOrder: idx }).where(eq(schema.artworkImages.id, img.id));
  }
  refreshShop();
  back(`/admin/artworks/${artworkId}`, "ok", "Main image updated.");
}

export async function updateImageAlt(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  await db
    .update(schema.artworkImages)
    .set({ alt: str(fd, "alt").slice(0, 300) })
    .where(eq(schema.artworkImages.id, str(fd, "imageId")));
  refreshShop();
  back(`/admin/artworks/${artworkId}`, "ok", "Image description saved.");
}

export async function deleteArtworkImage(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  const [img] = await db.delete(schema.artworkImages).where(eq(schema.artworkImages.id, str(fd, "imageId"))).returning();
  if (img) await deleteImage(img.url);
  refreshShop();
  back(`/admin/artworks/${artworkId}`, "ok", "Image removed.");
}

/** Tag an artwork into the ticked collections (from the artwork's edit page). */
export async function saveArtworkCollections(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  const ids = [...new Set(fd.getAll("collectionIds").map(String))].filter((v) => z.uuid().safeParse(v).success);
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.artworkCollections)
      .where(
        and(
          eq(schema.artworkCollections.artworkId, artworkId),
          ids.length ? notInArray(schema.artworkCollections.collectionId, ids) : undefined,
        ),
      );
    if (ids.length) {
      await tx
        .insert(schema.artworkCollections)
        .values(ids.map((collectionId) => ({ artworkId, collectionId, sortOrder: 1000 }))) // after the works already placed
        .onConflictDoNothing();
    }
  });
  refreshShop();
  back(`/admin/artworks/${artworkId}`, "ok", "Collections saved.");
}

/* ------------------------------------------------------------------ */
/* collections                                                        */
/* ------------------------------------------------------------------ */

function parseCollection(fd: FormData) {
  const title = str(fd, "title");
  const errors: string[] = [];
  if (!title) errors.push("Enter a name for the collection.");
  const sortOrder = optInt(fd, "sortOrder") ?? 0;
  const cover = str(fd, "coverArtworkId");
  return {
    errors,
    values: {
      title: title.slice(0, 200),
      slug: slugify(str(fd, "slug") || title) || `collection-${Date.now()}`,
      description: str(fd, "description").slice(0, 8000),
      coverArtworkId: z.uuid().safeParse(cover).success ? cover : null,
      published: bool(fd, "published"),
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
    },
  };
}

/** Replace a collection's works with the ticked artworks; their order on the form becomes the display order. */
async function setCollectionWorks(collectionId: string, artworkIds: string[]) {
  const ids = [...new Set(artworkIds)].filter((v) => z.uuid().safeParse(v).success);
  await db.transaction(async (tx) => {
    await tx
      .delete(schema.artworkCollections)
      .where(
        and(
          eq(schema.artworkCollections.collectionId, collectionId),
          ids.length ? notInArray(schema.artworkCollections.artworkId, ids) : undefined,
        ),
      );
    if (!ids.length) return;
    const existing = await tx
      .select({ artworkId: schema.artworkCollections.artworkId })
      .from(schema.artworkCollections)
      .where(and(eq(schema.artworkCollections.collectionId, collectionId), inArray(schema.artworkCollections.artworkId, ids)));
    const have = new Set(existing.map((e) => e.artworkId));
    for (const [idx, artworkId] of ids.entries()) {
      if (have.has(artworkId)) {
        await tx
          .update(schema.artworkCollections)
          .set({ sortOrder: idx })
          .where(and(eq(schema.artworkCollections.collectionId, collectionId), eq(schema.artworkCollections.artworkId, artworkId)));
      } else {
        await tx.insert(schema.artworkCollections).values({ collectionId, artworkId, sortOrder: idx });
      }
    }
  });
}

export async function createCollection(fd: FormData) {
  await requireAdmin();
  const { errors, values } = parseCollection(fd);
  if (errors.length) back("/admin/collections", "error", errors.join(" "));
  let id: string;
  try {
    const [row] = await db.insert(schema.collections).values(values).returning({ id: schema.collections.id });
    id = row.id;
  } catch (err) {
    if (isUniqueViolation(err)) back("/admin/collections", "error", "That URL slug is already used by another collection.");
    throw err;
  }
  refreshShop();
  back(`/admin/collections/${id}`, "ok", "Collection created. Tick the paintings that belong to it below.");
}

export async function updateCollection(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const path = `/admin/collections/${id}`;
  const { errors, values } = parseCollection(fd);
  if (errors.length) back(path, "error", errors.join(" "));
  try {
    await db.update(schema.collections).set({ ...values, updatedAt: new Date() }).where(eq(schema.collections.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) back(path, "error", "That URL slug is already used by another collection.");
    throw err;
  }
  await setCollectionWorks(id, fd.getAll("artworkIds").map(String));
  console.info(`[admin] ${admin.email} updated collection ${id}`);
  refreshShop();
  back(path, "ok", "Saved.");
}

export async function deleteCollection(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const [c] = await db.delete(schema.collections).where(eq(schema.collections.id, id)).returning();
  if (!c) back("/admin/collections", "error", "Collection not found.");
  refreshShop();
  back("/admin/collections", "ok", `Deleted the collection “${c.title}”. The paintings themselves are unchanged.`);
}

/* ------------------------------------------------------------------ */
/* prints                                                             */
/* ------------------------------------------------------------------ */

export async function savePrintProduct(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  const path = `/admin/artworks/${artworkId}`;
  const gsm = optInt(fd, "paperWeightGsm") ?? 300;
  const editionType = str(fd, "editionType") === "limited" ? "limited" : "open";
  const editionSize = optInt(fd, "editionSize");
  if (Number.isNaN(gsm) || gsm < 50 || gsm > 1000) back(path, "error", "Paper weight must be between 50 and 1000 GSM.");
  if (editionType === "limited" && (!editionSize || Number.isNaN(editionSize) || editionSize < 1)) {
    back(path, "error", "Enter the edition size for a limited edition.");
  }
  const values = {
    artworkId,
    paperType: str(fd, "paperType") || "Matte fine art paper",
    paperWeightGsm: gsm,
    editionType: editionType as "open" | "limited",
    editionSize: editionType === "limited" ? editionSize : null,
    description: str(fd, "description").slice(0, 4000),
    published: bool(fd, "published"),
    updatedAt: new Date(),
  };
  await db
    .insert(schema.printProducts)
    .values(values)
    .onConflictDoUpdate({ target: schema.printProducts.artworkId, set: values });
  refreshShop();
  back(path, "ok", "Print details saved.");
}

function parseVariant(fd: FormData) {
  const price = optInt(fd, "price");
  const stock = optInt(fd, "stock");
  const w = optDec(fd, "widthCm");
  const h = optDec(fd, "heightCm");
  const errors: string[] = [];
  if (!str(fd, "sizeLabel")) errors.push("Enter a size name, e.g. A3.");
  if (price === null || Number.isNaN(price) || price <= 0) errors.push("Enter a price above zero.");
  if (Number.isNaN(stock) || (stock !== null && stock < 0)) errors.push("Stock must be zero or more, or empty for unlimited.");
  if (w === "bad" || h === "bad") errors.push("Print dimensions must be numbers in centimetres.");
  return {
    errors,
    values: {
      sizeLabel: str(fd, "sizeLabel").slice(0, 60),
      widthCm: w as string | null,
      heightCm: h as string | null,
      price: price as number,
      stock: stock as number | null,
      active: bool(fd, "active"),
      sortOrder: (optInt(fd, "sortOrder") as number | null) ?? 0,
    },
  };
}

export async function addPrintVariant(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  const path = `/admin/artworks/${artworkId}`;
  const product = await db.query.printProducts.findFirst({ where: eq(schema.printProducts.artworkId, artworkId) });
  if (!product) back(path, "error", "Save the print details first.");
  const { errors, values } = parseVariant(fd);
  if (errors.length) back(path, "error", errors.join(" "));
  await db.insert(schema.printVariants).values({ ...values, printProductId: product.id });
  refreshShop();
  back(path, "ok", `Added size ${values.sizeLabel}.`);
}

export async function addStandardSizes(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  const path = `/admin/artworks/${artworkId}`;
  const product = await db.query.printProducts.findFirst({ where: eq(schema.printProducts.artworkId, artworkId) });
  if (!product) back(path, "error", "Save the print details first.");
  const prices = { A4: optInt(fd, "a4"), A3: optInt(fd, "a3"), A2: optInt(fd, "a2") };
  const dims = { A4: ["21.0", "29.7"], A3: ["29.7", "42.0"], A2: ["42.0", "59.4"] } as const;
  const rows = (Object.keys(prices) as (keyof typeof prices)[])
    .filter((k) => prices[k] && !Number.isNaN(prices[k]) && prices[k]! > 0)
    .map((k, i) => ({
      printProductId: product.id,
      sizeLabel: k,
      widthCm: dims[k][0],
      heightCm: dims[k][1],
      price: prices[k]!,
      stock: product.editionType === "limited" ? 0 : null,
      sortOrder: i,
    }));
  if (!rows.length) back(path, "error", "Enter at least one price.");
  await db.insert(schema.printVariants).values(rows);
  refreshShop();
  back(path, "ok", `Added ${rows.map((r) => r.sizeLabel).join(", ")}.${product.editionType === "limited" ? " Set stock for each size." : ""}`);
}

export async function updatePrintVariant(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  const path = `/admin/artworks/${artworkId}`;
  const { errors, values } = parseVariant(fd);
  if (errors.length) back(path, "error", errors.join(" "));
  await db.update(schema.printVariants).set({ ...values, updatedAt: new Date() }).where(eq(schema.printVariants.id, str(fd, "variantId")));
  refreshShop();
  back(path, "ok", `Saved size ${values.sizeLabel}.`);
}

export async function deletePrintVariant(fd: FormData) {
  await requireAdmin();
  const artworkId = str(fd, "artworkId");
  // Order items keep a snapshot of size and price, so history is preserved.
  await db.delete(schema.printVariants).where(eq(schema.printVariants.id, str(fd, "variantId")));
  refreshShop();
  back(`/admin/artworks/${artworkId}`, "ok", "Size removed.");
}

/* ------------------------------------------------------------------ */
/* orders                                                             */
/* ------------------------------------------------------------------ */

async function runOrder(path: string, fn: () => Promise<unknown>, okMessage: string) {
  try {
    await fn();
  } catch (err) {
    if (err instanceof CheckoutError) back(path, "error", err.message);
    throw err;
  }
  refreshShop();
  back(path, "ok", okMessage);
}

export async function verifyPaymentAction(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = str(fd, "orderId");
  const path = `/admin/orders/${orderId}`;
  await runOrder(
    path,
    async () => {
      const order = await verifyPayment(str(fd, "paymentId"), admin.email);
      const settings = await getSettings();
      const items = await db.query.orderItems.findMany({ where: eq(schema.orderItems.orderId, order.id) });
      after(async () => {
        await deliverGiftCardsForOrder(order.id, settings).catch((e) => console.error(e));
        await sendPaymentConfirmed(order, items, settings).catch((e) => console.error(e));
      });
    },
    "Payment verified. Order marked Paid; originals marked SOLD.",
  );
}

export async function rejectPaymentAction(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = str(fd, "orderId");
  const settings = await getSettings();
  await runOrder(
    `/admin/orders/${orderId}`,
    () => rejectPayment(str(fd, "paymentId"), admin.email, str(fd, "note").slice(0, 500), settings.holdHours),
    "Payment rejected. The customer can submit a new code.",
  );
}

export async function recordPaymentAction(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = str(fd, "orderId");
  const path = `/admin/orders/${orderId}`;
  const ref = str(fd, "reference").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{4,30}$/.test(ref)) back(path, "error", "Enter the M-Pesa confirmation code (letters and numbers).");
  await runOrder(
    path,
    async () => {
      const order = await recordManualPayment(orderId, ref, admin.email);
      const settings = await getSettings();
      const items = await db.query.orderItems.findMany({ where: eq(schema.orderItems.orderId, order.id) });
      after(async () => {
        await deliverGiftCardsForOrder(order.id, settings).catch((e) => console.error(e));
        await sendPaymentConfirmed(order, items, settings).catch((e) => console.error(e));
      });
    },
    "Payment recorded. Order marked Paid.",
  );
}

export async function setStatusAction(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = str(fd, "orderId");
  const status = z.enum(orderStatus.enumValues).safeParse(str(fd, "status"));
  if (!status.success) back(`/admin/orders/${orderId}`, "error", "Choose a status.");
  await runOrder(
    `/admin/orders/${orderId}`,
    async () => {
      await setOrderStatus(orderId, status.data, admin.email);
      if (status.data === "paid") {
        const settings = await getSettings();
        after(() => deliverGiftCardsForOrder(orderId, settings).catch((e) => console.error(e)));
      }
    },
    "Status updated.",
  );
}

export async function cancelOrderAction(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = str(fd, "orderId");
  await runOrder(
    `/admin/orders/${orderId}`,
    () => cancelOrder(orderId, admin.email, str(fd, "reason").slice(0, 500) || undefined),
    "Order cancelled and items returned to stock.",
  );
}

export async function updateOrderDetails(fd: FormData) {
  const admin = await requireAdmin();
  const orderId = str(fd, "orderId");
  const fee = optInt(fd, "deliveryFee");
  const path = `/admin/orders/${orderId}`;
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order) back("/admin/orders", "error", "Order not found.");
  const patch: Partial<typeof schema.orders.$inferInsert> = {
    adminNotes: str(fd, "adminNotes").slice(0, 4000) || null,
    trackingCarrier: str(fd, "trackingCarrier").slice(0, 80) || null,
    trackingNumber: str(fd, "trackingNumber").slice(0, 120) || null,
    updatedAt: new Date(),
  };
  if (fee !== null && !Number.isNaN(fee) && fee >= 0 && fee !== order.deliveryFee) {
    if (order.paymentStatus === "paid") back(path, "error", "The delivery fee cannot change after payment.");
    patch.deliveryFee = fee;
    patch.deliveryFeeToBeConfirmed = false;
    patch.total = Math.max(0, order.subtotal + fee - order.discountTotal - order.giftCardTotal);
    await db.insert(schema.orderEvents).values({
      orderId,
      type: "delivery_fee",
      message: `Delivery fee set to ${fee}. New total ${patch.total}.`,
      actor: admin.email,
    });
  }
  await db.update(schema.orders).set(patch).where(eq(schema.orders.id, orderId));
  back(path, "ok", "Order details saved.");
}

/* ------------------------------------------------------------------ */
/* commission tracker                                                 */
/* ------------------------------------------------------------------ */

/** "YYYY-MM-DD" from a date input, or null. */
const optDate = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function parseCommissionJob(fd: FormData) {
  const errors: string[] = [];
  const clientName = str(fd, "clientName");
  const title = str(fd, "title");
  if (!clientName) errors.push("Enter the client's name.");
  if (!title) errors.push("Say what the commission is.");
  const price = optInt(fd, "price");
  if (Number.isNaN(price) || (price !== null && price < 0)) errors.push("Price must be a whole number of shillings.");
  const status = z.enum(schema.commissionJobStatus.enumValues).safeParse(str(fd, "status"));
  return {
    errors,
    values: {
      clientName: clientName.slice(0, 160),
      clientContact: str(fd, "clientContact").slice(0, 200),
      title: title.slice(0, 200),
      details: str(fd, "details").slice(0, 8000),
      size: str(fd, "size").slice(0, 120),
      price: price as number | null,
      status: status.success ? status.data : ("agreed" as const),
      agreedOn: optDate(fd, "agreedOn"),
      dueOn: optDate(fd, "dueOn"),
      deliveredOn: optDate(fd, "deliveredOn"),
      notes: str(fd, "notes").slice(0, 8000),
    },
  };
}

/** Records the first payment straight from the add/edit form when an amount is entered. */
async function insertCommissionPayment(jobId: string, fd: FormData) {
  const amount = optInt(fd, "paymentAmount");
  if (amount === null) return null;
  if (Number.isNaN(amount) || amount <= 0) return "Payment amount must be a whole number above zero.";
  await db.insert(schema.commissionPayments).values({
    jobId,
    amount,
    paidOn: optDate(fd, "paymentDate") ?? new Date().toISOString().slice(0, 10),
    method: str(fd, "paymentMethod").slice(0, 60),
    note: str(fd, "paymentNote").slice(0, 300),
  });
  return null;
}

export async function createCommissionJob(fd: FormData) {
  await requireAdmin();
  const { errors, values } = parseCommissionJob(fd);
  if (errors.length) back("/admin/commission-tracker", "error", errors.join(" "));
  const [row] = await db.insert(schema.commissionJobs).values(values).returning({ id: schema.commissionJobs.id });
  const payError = await insertCommissionPayment(row.id, fd);
  if (payError) back(`/admin/commission-tracker/${row.id}`, "error", `Commission saved, but the payment was not: ${payError}`);
  // Straight to the new commission so draft images can be added (they need the saved commission).
  redirect(
    `/admin/commission-tracker/${row.id}?ok=${encodeURIComponent(`Added the commission for ${values.clientName}. You can upload draft images below.`)}#drafts`,
  );
}

export async function updateCommissionJob(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const path = `/admin/commission-tracker/${id}`;
  const { errors, values } = parseCommissionJob(fd);
  if (errors.length) back(path, "error", errors.join(" "));
  await db.update(schema.commissionJobs).set({ ...values, updatedAt: new Date() }).where(eq(schema.commissionJobs.id, id));
  console.info(`[admin] ${admin.email} updated commission job ${id}`);
  back(path, "ok", "Saved.");
}

export async function addCommissionPayment(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "jobId");
  const path = `/admin/commission-tracker/${id}`;
  if (optInt(fd, "paymentAmount") === null) back(path, "error", "Enter the amount received.");
  const payError = await insertCommissionPayment(id, fd);
  if (payError) back(path, "error", payError);
  back(path, "ok", "Payment recorded.");
}

export async function deleteCommissionPayment(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "jobId");
  await db
    .delete(schema.commissionPayments)
    .where(and(eq(schema.commissionPayments.id, str(fd, "paymentId")), eq(schema.commissionPayments.jobId, id)));
  back(`/admin/commission-tracker/${id}`, "ok", "Payment removed.");
}

export async function deleteCommissionJob(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const images = await db.query.commissionImages.findMany({ where: eq(schema.commissionImages.jobId, id) });
  const [job] = await db.delete(schema.commissionJobs).where(eq(schema.commissionJobs.id, id)).returning();
  if (!job) back("/admin/commission-tracker", "error", "Commission not found.");
  for (const img of images) await deleteImage(img.url);
  back("/admin/commission-tracker", "ok", `Deleted the commission for ${job.clientName}, its payments and drafts.`);
}

export async function addCommissionImage(input: { jobId: string; url: string; width: number; height: number }) {
  await requireAdmin();
  const parsed = z
    .object({
      jobId: z.uuid(),
      url: z.string().refine((u) => u.startsWith("https://") || u.startsWith("/uploads/"), "Invalid image URL"),
      width: z.number().int().positive().max(20000),
      height: z.number().int().positive().max(20000),
    })
    .parse(input);
  await db.insert(schema.commissionImages).values(parsed);
  return { ok: true };
}

export async function updateCommissionImageCaption(fd: FormData) {
  await requireAdmin();
  const jobId = str(fd, "jobId");
  await db
    .update(schema.commissionImages)
    .set({ caption: str(fd, "caption").slice(0, 300) })
    .where(and(eq(schema.commissionImages.id, str(fd, "imageId")), eq(schema.commissionImages.jobId, jobId)));
  back(`/admin/commission-tracker/${jobId}`, "ok", "Caption saved.");
}

export async function deleteCommissionImage(fd: FormData) {
  await requireAdmin();
  const jobId = str(fd, "jobId");
  const [img] = await db
    .delete(schema.commissionImages)
    .where(and(eq(schema.commissionImages.id, str(fd, "imageId")), eq(schema.commissionImages.jobId, jobId)))
    .returning();
  if (img) await deleteImage(img.url);
  back(`/admin/commission-tracker/${jobId}`, "ok", "Draft image removed.");
}

/* ------------------------------------------------------------------ */
/* collectors, messages                                               */
/* ------------------------------------------------------------------ */

export async function removeCollector(fd: FormData) {
  await requireAdmin();
  await db.delete(schema.collectors).where(eq(schema.collectors.id, str(fd, "id")));
  back("/admin/collectors", "ok", "Email removed from the Collector List.");
}

export async function toggleMessageHandled(fd: FormData) {
  await requireAdmin();
  await db
    .update(schema.contactMessages)
    .set({ handled: str(fd, "handled") === "true" })
    .where(eq(schema.contactMessages.id, str(fd, "id")));
  back("/admin/messages", "ok", "Message updated.");
}

/* ------------------------------------------------------------------ */
/* delivery zones                                                     */
/* ------------------------------------------------------------------ */

function parseZone(fd: FormData) {
  const fee = optInt(fd, "fee") ?? 0;
  const errors: string[] = [];
  if (!str(fd, "name")) errors.push("Enter a name.");
  if (Number.isNaN(fee) || fee < 0) errors.push("Fee must be zero or more.");
  return {
    errors,
    values: {
      name: str(fd, "name").slice(0, 120),
      fee: fee as number,
      estimate: str(fd, "estimate").slice(0, 120),
      feeToBeConfirmed: bool(fd, "feeToBeConfirmed"),
      active: bool(fd, "active"),
      sortOrder: (optInt(fd, "sortOrder") as number | null) ?? 0,
      country: (str(fd, "country") || "TZ").toUpperCase().slice(0, 2),
    },
  };
}

export async function saveZone(fd: FormData) {
  await requireAdmin();
  const { errors, values } = parseZone(fd);
  if (errors.length) back("/admin/delivery", "error", errors.join(" "));
  const id = str(fd, "id");
  if (id) await db.update(schema.deliveryZones).set({ ...values, updatedAt: new Date() }).where(eq(schema.deliveryZones.id, id));
  else await db.insert(schema.deliveryZones).values(values);
  back("/admin/delivery", "ok", `Saved “${values.name}”.`);
}

export async function deleteZone(fd: FormData) {
  await requireAdmin();
  await db.delete(schema.deliveryZones).where(eq(schema.deliveryZones.id, str(fd, "id")));
  back("/admin/delivery", "ok", "Delivery option removed.");
}

/* ------------------------------------------------------------------ */
/* settings                                                           */
/* ------------------------------------------------------------------ */

export async function saveCommissionsAction(fd: FormData) {
  await requireAdmin();
  const ids = [...new Set(fd.getAll("commissionArtworkIds").map(String))];
  const parsed = settingsSchema
    .pick({
      commissionsOpen: true,
      commissionsIntro: true,
      commissionsProcess: true,
      commissionsClosedNote: true,
      commissionArtworkIds: true,
      commissionsCapacity: true,
      commissionsBooked: true,
      commissionsBookedMonth: true,
    })
    .safeParse({
      commissionsOpen: bool(fd, "commissionsOpen"),
      commissionsIntro: str(fd, "commissionsIntro"),
      commissionsProcess: str(fd, "commissionsProcess"),
      commissionsClosedNote: str(fd, "commissionsClosedNote"),
      commissionArtworkIds: ids,
      commissionsCapacity: str(fd, "commissionsCapacity") || "0",
      commissionsBooked: str(fd, "commissionsBooked") || "0",
      commissionsBookedMonth: currentMonthKey(),
    });
  if (!parsed.success) {
    back("/admin/commissions", "error", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  await saveSettings(parsed.data);
  refreshShop();
  back("/admin/commissions", "ok", parsed.data.commissionsOpen ? "Saved. Commissions are open." : "Saved. Commissions are closed.");
}

export async function saveSettingsAction(fd: FormData) {
  await requireAdmin();
  const raw: Record<string, unknown> = {};
  for (const key of Object.keys(settingsSchema.shape)) {
    if (key === "emailEnabled") raw[key] = bool(fd, key);
    else if (fd.has(key)) raw[key] = str(fd, key);
  }
  const parsed = settingsSchema.partial().safeParse(raw);
  if (!parsed.success) {
    back("/admin/settings", "error", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  if (parsed.data.heroArtworkSlug) {
    const exists = await db.query.artworks.findFirst({
      where: and(eq(schema.artworks.slug, parsed.data.heroArtworkSlug), eq(schema.artworks.published, true)),
    });
    if (!exists) back("/admin/settings", "error", "The homepage artwork slug does not match a published artwork.");
  }
  await saveSettings(parsed.data);
  refreshShop();
  back("/admin/settings", "ok", "Settings saved.");
}

/* ------------------------------------------------------------------ */
/* gift cards                                                         */
/* ------------------------------------------------------------------ */

export async function issueGiftCardAction(fd: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      amount: z.coerce.number().int().min(1000, "Enter an amount of at least TZS 1,000.").max(10_000_000),
      recipientName: z.string().trim().max(160),
      deliverToEmail: z.union([z.literal(""), z.email("Enter a valid email address.")]),
      senderName: z.string().trim().max(160),
      message: z.string().trim().max(300),
      send: z.boolean(),
    })
    .safeParse({
      amount: str(fd, "amount").replace(/[,\s]/g, ""),
      recipientName: str(fd, "recipientName"),
      deliverToEmail: str(fd, "deliverToEmail").toLowerCase(),
      senderName: str(fd, "senderName"),
      message: str(fd, "message"),
      send: bool(fd, "send"),
    });
  if (!parsed.success) back("/admin/gift-cards", "error", parsed.error.issues.map((i) => i.message).join(" "));
  const v = parsed.data;
  if (v.send && !v.deliverToEmail) back("/admin/gift-cards", "error", "Add an email address to send the card, or untick Send.");
  const settings = await getSettings();
  const now = new Date();
  const card = await db.transaction((tx) =>
    insertGiftCard(tx, {
      initialValue: v.amount,
      currency: settings.currency,
      recipientName: v.recipientName || null,
      deliverToEmail: v.deliverToEmail || null,
      senderName: v.senderName || settings.businessName,
      message: v.message || null,
      expiresAt: giftCardExpiry(now),
      issuedBy: admin.email,
    }),
  );
  if (v.send) {
    const sent = await sendGiftCard(card, settings);
    if (sent) await db.update(schema.giftCards).set({ emailedAt: new Date() }).where(eq(schema.giftCards.id, card.id));
    back(`/admin/gift-cards?q=${card.code}`, sent ? "ok" : "error", sent ? "Gift card issued and emailed." : "Gift card issued, but the email could not be sent. Check email settings, then use Resend.");
  }
  back(`/admin/gift-cards?q=${card.code}`, "ok", "Gift card issued.");
}

export async function resendGiftCardAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const back_ = `/admin/gift-cards?q=${encodeURIComponent(str(fd, "q"))}`;
  const card = await db.query.giftCards.findFirst({ where: eq(schema.giftCards.id, id) });
  if (!card) back(back_, "error", "Gift card not found.");
  const email = str(fd, "email").toLowerCase();
  if (email && !z.email().safeParse(email).success) back(back_, "error", "Enter a valid email address.");
  const target = email ? { ...card, deliverToEmail: email } : card;
  if (!target.deliverToEmail) back(back_, "error", "This card has no email address. Enter one to send it.");
  const sent = await sendGiftCard(target, await getSettings());
  if (!sent) back(back_, "error", "The email could not be sent. Check that email is set up in Settings.");
  await db
    .update(schema.giftCards)
    .set({ emailedAt: new Date(), deliverToEmail: target.deliverToEmail, updatedAt: new Date() })
    .where(eq(schema.giftCards.id, id));
  back(back_, "ok", `Gift card emailed to ${target.deliverToEmail}.`);
}

export async function setGiftCardStatusAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status") === "active" ? "active" : "disabled";
  await db.update(schema.giftCards).set({ status, updatedAt: new Date() }).where(eq(schema.giftCards.id, id));
  back(`/admin/gift-cards?q=${encodeURIComponent(str(fd, "q"))}`, "ok", status === "active" ? "Gift card enabled." : "Gift card disabled. It can no longer be used at checkout.");
}

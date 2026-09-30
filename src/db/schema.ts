/**
 * MedePaints database schema (PostgreSQL via Drizzle ORM).
 *
 * Money is stored as integers in whole units of the row's currency (TZS today).
 * Every money-bearing row also stores its currency code so that multiple
 * currencies can be introduced later without a rewrite.
 *
 * Future-ready notes:
 *  - `payments` is a separate table keyed by provider, so Airtel Money,
 *    Mixx by Yas (Tigo Pesa), cards or automatic M-Pesa (API) can be added as
 *    new providers without touching `orders`.
 *  - Guest checkout is the rule; optional collector accounts can be added
 *    later with a nullable `customer_id` on orders.
 *  - `orders.discount_total` / `discount_code` let discount codes and gift
 *    cards be added without changing how totals are stored.
 *  - `print_products.edition_type/edition_size` + `print_variants.stock`
 *    support limited editions today; numbered editions can add an
 *    `edition_numbers` table later.
 *  - `delivery_zones.country` and `orders.country` support international orders.
 *  - `orders.tracking_*` fields support shipment tracking.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  varchar,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const artworkStatus = pgEnum("artwork_status", ["available", "reserved", "sold"]);
export const editionType = pgEnum("edition_type", ["open", "limited"]);
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "payment_verification",
  "paid",
  "processing",
  "ready_for_delivery",
  "shipped_delivered",
  "completed",
  "cancelled",
]);
export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "pending_verification",
  "paid",
  "failed",
  "refunded",
]);
export const paymentRecordStatus = pgEnum("payment_record_status", [
  "submitted",
  "verified",
  "rejected",
]);
export const orderItemType = pgEnum("order_item_type", ["original", "print"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ------------------------------------------------------------------ */
/* Catalogue                                                          */
/* ------------------------------------------------------------------ */

export const artworks = pgTable(
  "artworks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    artistName: varchar("artist_name", { length: 120 }).notNull().default("MedePaints"),
    description: text("description").notNull().default(""),
    medium: varchar("medium", { length: 200 }).notNull().default(""),
    widthCm: numeric("width_cm", { precision: 7, scale: 1 }),
    heightCm: numeric("height_cm", { precision: 7, scale: 1 }),
    depthCm: numeric("depth_cm", { precision: 7, scale: 1 }),
    year: integer("year"),
    /** Price of the original. Null = not for sale (shown in the gallery only). */
    price: integer("price"),
    currency: varchar("currency", { length: 3 }).notNull().default("TZS"),
    /** Originals always have exactly one unit; `status` tracks that unit. */
    status: artworkStatus("status").notNull().default("available"),
    /** Order currently holding this original (set atomically at checkout). */
    holdOrderId: uuid("hold_order_id"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    soldOrderId: uuid("sold_order_id"),
    coaIncluded: boolean("coa_included").notNull().default(true),
    coaNumber: varchar("coa_number", { length: 80 }),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("artworks_slug_idx").on(t.slug),
    index("artworks_status_idx").on(t.status),
    uniqueIndex("artworks_coa_number_idx").on(t.coaNumber),
  ],
);

export const artworkImages = pgTable(
  "artwork_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artworkId: uuid("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 300 }).notNull().default(""),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("artwork_images_artwork_idx").on(t.artworkId)],
);

/** One print product per artwork; each size is a row in print_variants. */
export const printProducts = pgTable(
  "print_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    artworkId: uuid("artwork_id")
      .notNull()
      .references(() => artworks.id, { onDelete: "cascade" }),
    description: text("description").notNull().default(""),
    paperType: varchar("paper_type", { length: 120 }).notNull().default("Matte fine art paper"),
    paperWeightGsm: integer("paper_weight_gsm").notNull().default(300),
    editionType: editionType("edition_type").notNull().default("open"),
    /** Total edition size for limited editions. */
    editionSize: integer("edition_size"),
    published: boolean("published").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("print_products_artwork_idx").on(t.artworkId)],
);

export const printVariants = pgTable(
  "print_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printProductId: uuid("print_product_id")
      .notNull()
      .references(() => printProducts.id, { onDelete: "cascade" }),
    sizeLabel: varchar("size_label", { length: 60 }).notNull(),
    widthCm: numeric("width_cm", { precision: 6, scale: 1 }),
    heightCm: numeric("height_cm", { precision: 6, scale: 1 }),
    price: integer("price").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("TZS"),
    /** Null = unlimited (printed on demand). A number = units left. */
    stock: integer("stock"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("print_variants_product_idx").on(t.printProductId)],
);

/* ------------------------------------------------------------------ */
/* Orders & payments                                                  */
/* ------------------------------------------------------------------ */

export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("TZ"),
  fee: integer("fee").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("TZS"),
  /** When true the fee is agreed with the customer after ordering. */
  feeToBeConfirmed: boolean("fee_to_be_confirmed").notNull().default(false),
  estimate: varchar("estimate", { length: 120 }).notNull().default(""),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    /** Random secret in the confirmation link so orders cannot be enumerated. */
    accessToken: varchar("access_token", { length: 64 }).notNull(),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),
    paymentMethod: varchar("payment_method", { length: 40 }).notNull().default("mpesa_manual"),

    customerName: varchar("customer_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: varchar("email", { length: 254 }),
    address: text("address").notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    country: varchar("country", { length: 2 }).notNull().default("TZ"),
    deliveryNotes: text("delivery_notes"),
    deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id, {
      onDelete: "set null",
    }),
    deliveryZoneName: varchar("delivery_zone_name", { length: 120 }),
    deliveryFeeToBeConfirmed: boolean("delivery_fee_to_be_confirmed").notNull().default(false),

    currency: varchar("currency", { length: 3 }).notNull().default("TZS"),
    subtotal: integer("subtotal").notNull(),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    discountTotal: integer("discount_total").notNull().default(0),
    discountCode: varchar("discount_code", { length: 60 }),
    total: integer("total").notNull(),

    collectorOptIn: boolean("collector_opt_in").notNull().default(false),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    /** True once reserved stock has been handed back (cancel / expiry). */
    stockReleased: boolean("stock_released").notNull().default(false),

    trackingCarrier: varchar("tracking_carrier", { length: 80 }),
    trackingNumber: varchar("tracking_number", { length: 120 }),

    adminNotes: text("admin_notes"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_phone_idx").on(t.phone),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    itemType: orderItemType("item_type").notNull(),
    artworkId: uuid("artwork_id").references(() => artworks.id, { onDelete: "set null" }),
    printVariantId: uuid("print_variant_id").references(() => printVariants.id, {
      onDelete: "set null",
    }),
    /* Snapshots keep the order accurate even if the product changes later. */
    title: varchar("title", { length: 200 }).notNull(),
    sizeLabel: varchar("size_label", { length: 60 }),
    imageUrl: text("image_url"),
    medium: varchar("medium", { length: 200 }),
    coaNumber: varchar("coa_number", { length: 80 }),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** mpesa_manual today; later mpesa_api, airtel_money, mixx_yas, card … */
    provider: varchar("provider", { length: 40 }).notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("TZS"),
    /** Provider transaction / receipt code (e.g. the M-Pesa confirmation code). */
    reference: varchar("reference", { length: 64 }).notNull(),
    payerPhone: varchar("payer_phone", { length: 32 }),
    status: paymentRecordStatus("status").notNull().default("submitted"),
    /** Raw payload from automated gateways. Never PINs or credentials. */
    raw: jsonb("raw"),
    reviewNote: text("review_note"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: varchar("verified_by", { length: 254 }),
    ...timestamps,
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    uniqueIndex("payments_provider_reference_idx").on(t.provider, t.reference),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 60 }).notNull(),
    message: text("message").notNull(),
    actor: varchar("actor", { length: 254 }).notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Collector list, contact, settings, security                        */
/* ------------------------------------------------------------------ */

export const collectors = pgTable(
  "collectors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 160 }),
    source: varchar("source", { length: 40 }).notNull().default("checkout"),
    /** Exact wording the person agreed to, kept as consent evidence. */
    consentText: text("consent_text").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
    unsubscribeToken: varchar("unsubscribe_token", { length: 64 }).notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("collectors_email_idx").on(t.email),
    uniqueIndex("collectors_token_idx").on(t.unsubscribeToken),
  ],
);

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 254 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row store (id = 1) for admin-editable settings. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  data: jsonb("data").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 120 }).notNull(),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                          */
/* ------------------------------------------------------------------ */

export const artworksRelations = relations(artworks, ({ many, one }) => ({
  images: many(artworkImages),
  printProduct: one(printProducts, {
    fields: [artworks.id],
    references: [printProducts.artworkId],
  }),
}));

export const artworkImagesRelations = relations(artworkImages, ({ one }) => ({
  artwork: one(artworks, { fields: [artworkImages.artworkId], references: [artworks.id] }),
}));

export const printProductsRelations = relations(printProducts, ({ one, many }) => ({
  artwork: one(artworks, { fields: [printProducts.artworkId], references: [artworks.id] }),
  variants: many(printVariants),
}));

export const printVariantsRelations = relations(printVariants, ({ one }) => ({
  printProduct: one(printProducts, {
    fields: [printVariants.printProductId],
    references: [printProducts.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(payments),
  events: many(orderEvents),
  deliveryZone: one(deliveryZones, {
    fields: [orders.deliveryZoneId],
    references: [deliveryZones.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export type Artwork = typeof artworks.$inferSelect;
export type ArtworkImage = typeof artworkImages.$inferSelect;
export type PrintProduct = typeof printProducts.$inferSelect;
export type PrintVariant = typeof printVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type Collector = typeof collectors.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];
export type ArtworkStatus = (typeof artworkStatus.enumValues)[number];

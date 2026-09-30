CREATE TYPE "public"."artwork_status" AS ENUM('available', 'reserved', 'sold');--> statement-breakpoint
CREATE TYPE "public"."edition_type" AS ENUM('open', 'limited');--> statement-breakpoint
CREATE TYPE "public"."order_item_type" AS ENUM('original', 'print');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'payment_verification', 'paid', 'processing', 'ready_for_delivery', 'shipped_delivered', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('submitted', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'pending_verification', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "artwork_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artwork_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" varchar(300) DEFAULT '' NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(200) NOT NULL,
	"artist_name" varchar(120) DEFAULT 'MedePaints' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"medium" varchar(200) DEFAULT '' NOT NULL,
	"width_cm" numeric(7, 1),
	"height_cm" numeric(7, 1),
	"depth_cm" numeric(7, 1),
	"year" integer,
	"price" integer,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"status" "artwork_status" DEFAULT 'available' NOT NULL,
	"hold_order_id" uuid,
	"hold_expires_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	"sold_order_id" uuid,
	"coa_included" boolean DEFAULT true NOT NULL,
	"coa_number" varchar(80),
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(160),
	"source" varchar(40) DEFAULT 'checkout' NOT NULL,
	"consent_text" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribe_token" varchar(64) NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(32),
	"email" varchar(254),
	"subject" varchar(200),
	"message" text NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"country" varchar(2) DEFAULT 'TZ' NOT NULL,
	"fee" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"fee_to_be_confirmed" boolean DEFAULT false NOT NULL,
	"estimate" varchar(120) DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"type" varchar(60) NOT NULL,
	"message" text NOT NULL,
	"actor" varchar(254) DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_type" "order_item_type" NOT NULL,
	"artwork_id" uuid,
	"print_variant_id" uuid,
	"title" varchar(200) NOT NULL,
	"size_label" varchar(60),
	"image_url" text,
	"medium" varchar(200),
	"coa_number" varchar(80),
	"unit_price" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(32) NOT NULL,
	"access_token" varchar(64) NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"payment_method" varchar(40) DEFAULT 'mpesa_manual' NOT NULL,
	"customer_name" varchar(160) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(254),
	"address" text NOT NULL,
	"city" varchar(120) NOT NULL,
	"country" varchar(2) DEFAULT 'TZ' NOT NULL,
	"delivery_notes" text,
	"delivery_zone_id" uuid,
	"delivery_zone_name" varchar(120),
	"delivery_fee_to_be_confirmed" boolean DEFAULT false NOT NULL,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"subtotal" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"discount_total" integer DEFAULT 0 NOT NULL,
	"discount_code" varchar(60),
	"total" integer NOT NULL,
	"collector_opt_in" boolean DEFAULT false NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"stock_released" boolean DEFAULT false NOT NULL,
	"tracking_carrier" varchar(80),
	"tracking_number" varchar(120),
	"admin_notes" text,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" varchar(40) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"reference" varchar(64) NOT NULL,
	"payer_phone" varchar(32),
	"status" "payment_record_status" DEFAULT 'submitted' NOT NULL,
	"raw" jsonb,
	"review_note" text,
	"verified_at" timestamp with time zone,
	"verified_by" varchar(254),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artwork_id" uuid NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"paper_type" varchar(120) DEFAULT 'Matte fine art paper' NOT NULL,
	"paper_weight_gsm" integer DEFAULT 300 NOT NULL,
	"edition_type" "edition_type" DEFAULT 'open' NOT NULL,
	"edition_size" integer,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"print_product_id" uuid NOT NULL,
	"size_label" varchar(60) NOT NULL,
	"width_cm" numeric(6, 1),
	"height_cm" numeric(6, 1),
	"price" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"stock" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artwork_images" ADD CONSTRAINT "artwork_images_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_print_variant_id_print_variants_id_fk" FOREIGN KEY ("print_variant_id") REFERENCES "public"."print_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_zone_id_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_products" ADD CONSTRAINT "print_products_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_variants" ADD CONSTRAINT "print_variants_print_product_id_print_products_id_fk" FOREIGN KEY ("print_product_id") REFERENCES "public"."print_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artwork_images_artwork_idx" ON "artwork_images" USING btree ("artwork_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artworks_slug_idx" ON "artworks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "artworks_status_idx" ON "artworks" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "artworks_coa_number_idx" ON "artworks" USING btree ("coa_number");--> statement-breakpoint
CREATE UNIQUE INDEX "collectors_email_idx" ON "collectors" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "collectors_token_idx" ON "collectors" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "login_attempts_key_idx" ON "login_attempts" USING btree ("key","created_at");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_reference_idx" ON "payments" USING btree ("provider","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "print_products_artwork_idx" ON "print_products" USING btree ("artwork_id");--> statement-breakpoint
CREATE INDEX "print_variants_product_idx" ON "print_variants" USING btree ("print_product_id");
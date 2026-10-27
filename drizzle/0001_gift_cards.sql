ALTER TYPE "public"."order_item_type" ADD VALUE 'gift_card';--> statement-breakpoint
CREATE TABLE "gift_card_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reversed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"access_token" varchar(64) NOT NULL,
	"initial_value" integer NOT NULL,
	"balance" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"purchase_order_id" uuid,
	"purchase_order_item_id" uuid,
	"sender_name" varchar(160),
	"recipient_name" varchar(160),
	"deliver_to_email" varchar(254),
	"message" text,
	"expires_at" timestamp with time zone NOT NULL,
	"emailed_at" timestamp with time zone,
	"issued_by" varchar(254) DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_card_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "gift_card_redemptions" ADD CONSTRAINT "gift_card_redemptions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_redemptions" ADD CONSTRAINT "gift_card_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchase_order_id_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_purchase_order_item_id_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gift_card_redemptions_card_order_idx" ON "gift_card_redemptions" USING btree ("gift_card_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_code_idx" ON "gift_cards" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_cards_purchase_item_idx" ON "gift_cards" USING btree ("purchase_order_item_id");--> statement-breakpoint
CREATE INDEX "gift_cards_order_idx" ON "gift_cards" USING btree ("purchase_order_id");
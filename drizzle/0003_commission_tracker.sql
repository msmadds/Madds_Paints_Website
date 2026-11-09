CREATE TYPE "public"."commission_job_status" AS ENUM('enquiry', 'agreed', 'in_progress', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TABLE "commission_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_name" varchar(160) NOT NULL,
	"client_contact" varchar(200) DEFAULT '' NOT NULL,
	"title" varchar(200) NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"size" varchar(120) DEFAULT '' NOT NULL,
	"price" integer,
	"currency" varchar(3) DEFAULT 'TZS' NOT NULL,
	"status" "commission_job_status" DEFAULT 'agreed' NOT NULL,
	"agreed_on" date,
	"due_on" date,
	"delivered_on" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"paid_on" date NOT NULL,
	"method" varchar(60) DEFAULT '' NOT NULL,
	"note" varchar(300) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_job_id_commission_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."commission_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_jobs_status_idx" ON "commission_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commission_payments_job_idx" ON "commission_payments" USING btree ("job_id");
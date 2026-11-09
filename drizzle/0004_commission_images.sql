CREATE TABLE "commission_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"caption" varchar(300) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_images" ADD CONSTRAINT "commission_images_job_id_commission_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."commission_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_images_job_idx" ON "commission_images" USING btree ("job_id");
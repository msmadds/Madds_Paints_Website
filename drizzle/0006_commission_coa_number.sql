ALTER TABLE "commission_jobs" ADD COLUMN "coa_number" varchar(80);--> statement-breakpoint
CREATE UNIQUE INDEX "commission_jobs_coa_number_idx" ON "commission_jobs" USING btree ("coa_number");
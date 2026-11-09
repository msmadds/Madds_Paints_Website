import "server-only";
import { asc, desc, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CommissionJob } from "@/db/schema";
import type { ContactSuggestion } from "@/components/admin/client-contact-fields";

export type JobWithPayments = CommissionJob & { payments: { amount: number }[] };

/** Today's date in Dar es Salaam as "YYYY-MM-DD", to compare with due dates. */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dar_es_Salaam" }).format(new Date());
}

export function paidSoFar(job: JobWithPayments): number {
  return job.payments.reduce((sum, p) => sum + p.amount, 0);
}

/** What the client still owes. Cancelled jobs and enquiries without a price owe nothing. */
export function balanceDue(job: JobWithPayments): number {
  if (job.status === "cancelled" || job.price === null) return 0;
  return Math.max(job.price - paidSoFar(job), 0);
}

export function isOpen(job: CommissionJob): boolean {
  return job.status !== "delivered" && job.status !== "cancelled";
}

export function isOverdue(job: CommissionJob, today = todayKey()): boolean {
  return isOpen(job) && job.dueOn !== null && job.dueOn < today;
}

/** Emails on the Collector List, then contacts of past commission clients, without repeats. */
export async function contactSuggestions(): Promise<ContactSuggestion[]> {
  const [collectors, jobs] = await Promise.all([
    db
      .select({ contact: schema.collectors.email, name: schema.collectors.name })
      .from(schema.collectors)
      .where(isNull(schema.collectors.unsubscribedAt))
      .orderBy(asc(schema.collectors.email)),
    db
      .select({ contact: schema.commissionJobs.clientContact, name: schema.commissionJobs.clientName })
      .from(schema.commissionJobs)
      .orderBy(desc(schema.commissionJobs.createdAt)),
  ]);
  const seen = new Set<string>();
  const out: ContactSuggestion[] = [];
  for (const s of [...collectors, ...jobs]) {
    const key = s.contact.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ contact: s.contact.trim(), name: s.name || null });
  }
  return out;
}

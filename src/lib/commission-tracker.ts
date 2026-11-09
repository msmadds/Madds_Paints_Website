import type { CommissionJob } from "@/db/schema";

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

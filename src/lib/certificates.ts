import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";

/** Certificate numbers look like MH-2026-010: prefix, year, then a three-digit count that restarts each year. */
const PATTERN = /^MH-(\d{4})-(\d+)$/;

export function certificateYear(): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", year: "numeric" }).format(new Date()));
}

export function formatCertificate(year: number, n: number): string {
  return `MH-${year}-${String(n).padStart(3, "0")}`;
}

/** The next free number this year, and any skipped numbers below it. */
export function nextCertificate(numbers: (string | null)[], year = certificateYear()) {
  const used = new Set<number>();
  for (const num of numbers) {
    const m = num?.match(PATTERN);
    if (m && Number(m[1]) === year) used.add(Number(m[2]));
  }
  const highest = used.size ? Math.max(...used) : 0;
  const skipped: string[] = [];
  for (let i = 1; i < highest; i++) if (!used.has(i)) skipped.push(formatCertificate(year, i));
  return {
    next: formatCertificate(year, highest + 1),
    highest: highest ? formatCertificate(year, highest) : null,
    skipped,
  };
}

export type CertificateEntry = { number: string; kind: "artwork" | "commission"; id: string; title: string; detail: string; hidden: boolean; status: string };

/** Every certificate number on artworks and commissions, plus artworks still waiting for one. */
export async function certificateRegister() {
  const [works, jobs] = await Promise.all([
    db.query.artworks.findMany({
      columns: { id: true, title: true, year: true, status: true, published: true, coaIncluded: true, coaNumber: true },
      orderBy: [asc(schema.artworks.title)],
    }),
    db.query.commissionJobs.findMany({
      columns: { id: true, title: true, clientName: true, status: true, coaNumber: true },
    }),
  ]);
  const numbered: CertificateEntry[] = [
    ...works.filter((r) => r.coaNumber).map((r) => ({
      number: r.coaNumber!, kind: "artwork" as const, id: r.id, title: r.title,
      detail: r.year ? String(r.year) : "", hidden: !r.published, status: r.status,
    })),
    ...jobs.filter((r) => r.coaNumber).map((r) => ({
      number: r.coaNumber!, kind: "commission" as const, id: r.id, title: r.title,
      detail: `Commission for ${r.clientName}`, hidden: false, status: r.status,
    })),
  ].sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
  const needsNumber = works.filter((r) => r.coaIncluded && !r.coaNumber);
  return { numbered, needsNumber, ...nextCertificate(numbered.map((r) => r.number)) };
}

/** Where a certificate number is already used, ignoring the record being saved. Null when free. */
export async function certificateTakenBy(number: string | null, except: { artworkId?: string; jobId?: string }) {
  if (!number) return null;
  const [work, job] = await Promise.all([
    db.query.artworks.findFirst({
      columns: { title: true },
      where: except.artworkId ? and(eq(schema.artworks.coaNumber, number), ne(schema.artworks.id, except.artworkId)) : eq(schema.artworks.coaNumber, number),
    }),
    db.query.commissionJobs.findFirst({
      columns: { title: true, clientName: true },
      where: except.jobId ? and(eq(schema.commissionJobs.coaNumber, number), ne(schema.commissionJobs.id, except.jobId)) : eq(schema.commissionJobs.coaNumber, number),
    }),
  ]);
  if (work) return `the painting "${work.title}"`;
  if (job) return `the commission "${job.title}" for ${job.clientName}`;
  return null;
}

export function isStandardCertificate(num: string): boolean {
  return PATTERN.test(num);
}

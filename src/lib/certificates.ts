import "server-only";
import { asc } from "drizzle-orm";
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

/** Every artwork with its certificate details, published or not. */
export async function certificateRegister() {
  const rows = await db.query.artworks.findMany({
    columns: { id: true, title: true, year: true, status: true, published: true, coaIncluded: true, coaNumber: true },
    orderBy: [asc(schema.artworks.title)],
  });
  const numbered = rows
    .filter((r) => r.coaNumber)
    .sort((a, b) => a.coaNumber!.localeCompare(b.coaNumber!, "en", { numeric: true }));
  const needsNumber = rows.filter((r) => r.coaIncluded && !r.coaNumber);
  return { numbered, needsNumber, ...nextCertificate(rows.map((r) => r.coaNumber)) };
}

export function isStandardCertificate(num: string): boolean {
  return PATTERN.test(num);
}

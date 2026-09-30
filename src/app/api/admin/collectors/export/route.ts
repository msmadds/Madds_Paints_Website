import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAdminSession } from "@/lib/auth";

function csv(v: string | null | undefined) {
  const s = (v ?? "").replace(/"/g, '""');
  // Neutralise spreadsheet formula injection.
  return /^[=+\-@]/.test(s) ? `"'${s}"` : `"${s}"`;
}

export async function GET(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const includeUnsubscribed = new URL(req.url).searchParams.get("all") === "1";
  const rows = await db.query.collectors.findMany({ orderBy: [asc(schema.collectors.createdAt)] });
  const list = includeUnsubscribed ? rows : rows.filter((r) => !r.unsubscribedAt);
  const lines = [
    ["email", "name", "joined", "source", "status", "unsubscribed_at"].join(","),
    ...list.map((r) =>
      [
        csv(r.email),
        csv(r.name),
        csv(r.consentedAt.toISOString()),
        csv(r.source),
        csv(r.unsubscribedAt ? "unsubscribed" : "subscribed"),
        csv(r.unsubscribedAt?.toISOString() ?? ""),
      ].join(","),
    ),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="medepaints-collectors-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

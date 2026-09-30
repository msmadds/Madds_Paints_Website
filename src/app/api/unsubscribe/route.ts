import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";

/** POST /api/unsubscribe  { token }  — also supports RFC 8058 one-click (form POST). */
export async function POST(req: Request) {
  let token: string | null = null;
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    token = (await req.json().catch(() => ({})))?.token ?? null;
  } else {
    token = new URL(req.url).searchParams.get("token");
  }
  const parsed = z.string().min(10).max(64).safeParse(token);
  if (!parsed.success) return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  const [row] = await db
    .update(schema.collectors)
    .set({ unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.collectors.unsubscribeToken, parsed.data))
    .returning({ id: schema.collectors.id });
  if (!row) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

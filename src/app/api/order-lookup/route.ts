import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { fieldErrors, lookupSchema } from "@/lib/validation";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const key = `lookup:${await clientIp()}`;
  if (await isRateLimited(key, 8, 30)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes, or contact us." }, { status: 429 });
  }
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.orderNumber, parsed.data.orderNumber), eq(schema.orders.phone, parsed.data.phone)),
    columns: { orderNumber: true, accessToken: true },
  });
  if (!order) {
    await recordAttempt(key, false);
    return NextResponse.json({ error: "No order matches that number and phone. Check both and try again." }, { status: 404 });
  }
  return NextResponse.json({ orderNumber: order.orderNumber, key: order.accessToken });
}

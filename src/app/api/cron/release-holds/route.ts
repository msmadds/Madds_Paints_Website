import { NextResponse } from "next/server";
import { releaseExpiredHolds } from "@/lib/orders";

/** Called by Vercel Cron (see vercel.json). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const released = await releaseExpiredHolds();
  return NextResponse.json({ released });
}

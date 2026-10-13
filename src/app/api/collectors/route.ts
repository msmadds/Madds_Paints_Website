import { NextResponse, after } from "next/server";
import { collectorSignupSchema, fieldErrors } from "@/lib/validation";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth";
import { addCollector } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { sendCollectorWelcome } from "@/lib/email";

/** Collector List sign-up outside checkout (homepage and /collector-list). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = collectorSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const key = `collector:${await clientIp()}`;
  if (await isRateLimited(key, 5, 60)) {
    return NextResponse.json({ error: "Too many sign-ups from this connection. Try again later." }, { status: 429 });
  }
  try {
    await recordAttempt(key, false); // counts toward the per-hour limit
    const token = await addCollector(parsed.data.email, parsed.data.name ?? null, "website");
    if (token) {
      const settings = await getSettings();
      after(() => sendCollectorWelcome(parsed.data.email, token, settings).catch((e) => console.error(e)));
    }
    // Same reply whether or not the email was already on the list.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/collectors]", err);
    return NextResponse.json({ error: "Could not add you right now. Try again in a moment." }, { status: 500 });
  }
}

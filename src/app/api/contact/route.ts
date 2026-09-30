import { NextResponse, after } from "next/server";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { db, schema } from "@/db";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { notifyAdmin } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const key = `contact:${await clientIp()}`;
  if (await isRateLimited(key, 5, 60)) {
    return NextResponse.json({ error: "You have sent several messages already. We will reply soon." }, { status: 429 });
  }
  const { website: _hp, ...data } = parsed.data;
  try {
    await db.insert(schema.contactMessages).values(data);
    await recordAttempt(key, false); // counts toward the per-hour limit
    const settings = await getSettings();
    after(() =>
      notifyAdmin(
        `New message from ${data.name}`,
        [data.subject ?? "", data.message, [data.phone, data.email].filter(Boolean).join(" / ")].filter(Boolean),
        settings,
        "/admin/messages",
      ).catch((e) => console.error(e)),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/contact]", err);
    return NextResponse.json({ error: "Your message could not be sent. Try again, or message us on WhatsApp." }, { status: 500 });
  }
}

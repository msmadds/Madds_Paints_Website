import { NextResponse, after } from "next/server";
import { fieldErrors, referenceSchema } from "@/lib/validation";
import { CheckoutError, submitPaymentReference } from "@/lib/orders";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { notifyAdmin } from "@/lib/email";
import { formatMoney } from "@/lib/format";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = referenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the M-Pesa code.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const key = `ref:${await clientIp()}`;
  if (await isRateLimited(key, 10, 30)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes, or contact us." }, { status: 429 });
  }
  try {
    const order = await submitPaymentReference(parsed.data);
    const settings = await getSettings();
    after(() =>
      notifyAdmin(
        `M-Pesa code to verify: ${order.orderNumber}`,
        [
          `Code: ${parsed.data.reference}`,
          `Amount due: ${formatMoney(order.total, order.currency)}`,
          `${order.customerName}, ${order.phone}`,
        ],
        settings,
        `/admin/orders/${order.id}`,
      ).catch((e) => console.error(e)),
    );
    return NextResponse.json({ ok: true, status: order.status });
  } catch (err) {
    if (err instanceof CheckoutError) {
      await recordAttempt(key, false);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[api/orders/reference]", err);
    return NextResponse.json({ error: "The code could not be saved. Try again in a moment." }, { status: 500 });
  }
}

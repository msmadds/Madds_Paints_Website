import { NextResponse, after } from "next/server";
import { checkoutSchema, fieldErrors } from "@/lib/validation";
import { CheckoutError, addCollector, createOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { notifyAdmin, sendCollectorWelcome, sendOrderReceived } from "@/lib/email";
import { formatMoney } from "@/lib/format";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const input = parsed.data;
  const settings = await getSettings();

  try {
    const order = await createOrder(input, settings.holdHours, settings.currency);

    after(async () => {
      try {
        if (order.collectorOptIn && order.email) {
          const token = await addCollector(order.email, order.customerName, "checkout");
          if (token) await sendCollectorWelcome(order.email, token, settings);
        }
        await sendOrderReceived(order, order.items, settings);
        await notifyAdmin(
          `New order ${order.orderNumber}: ${formatMoney(order.total, order.currency)}`,
          [
            `${order.customerName}, ${order.phone}`,
            ...order.items.map((i) => `${i.title} ${i.sizeLabel ? `(${i.sizeLabel}) ` : "(original) "}× ${i.quantity}`),
            `Delivery: ${order.city}`,
          ],
          settings,
          `/admin/orders/${order.id}`,
        );
      } catch (err) {
        console.error("[api/orders] post-order tasks failed", err);
      }
    });

    return NextResponse.json({ orderNumber: order.orderNumber, key: order.accessToken }, { status: 201 });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === "unavailable" ? 409 : 400 });
    }
    console.error("[api/orders]", err);
    return NextResponse.json({ error: "Your order could not be placed. Nothing was charged. Try again in a moment." }, { status: 500 });
  }
}

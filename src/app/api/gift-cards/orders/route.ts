import { NextResponse, after } from "next/server";
import { fieldErrors, giftCardPurchaseSchema } from "@/lib/validation";
import { CheckoutError, addCollector, createGiftCardOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { notifyAdmin, sendCollectorWelcome, sendOrderReceived } from "@/lib/email";
import { formatMoney } from "@/lib/format";

/** Places an order for a gift card. It is paid by M-Pesa like any other order. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = giftCardPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 422 });
  }
  const input = parsed.data;
  const settings = await getSettings();

  try {
    const order = await createGiftCardOrder(input, settings.holdHours, settings.currency);

    after(async () => {
      try {
        if (order.collectorOptIn && order.email) {
          const token = await addCollector(order.email, order.customerName, "checkout");
          if (token) await sendCollectorWelcome(order.email, token, settings);
        }
        await sendOrderReceived(order, order.items, settings);
        await notifyAdmin(
          `New gift card order ${order.orderNumber}: ${formatMoney(order.total, order.currency)}`,
          [
            `${order.customerName}, ${order.phone}`,
            input.sendAsGift ? `For ${input.recipientName} (${input.recipientEmail})` : "For the buyer",
          ],
          settings,
          `/admin/orders/${order.id}`,
        );
      } catch (err) {
        console.error("[api/gift-cards/orders] post-order tasks failed", err);
      }
    });

    return NextResponse.json({ orderNumber: order.orderNumber, key: order.accessToken }, { status: 201 });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[api/gift-cards/orders]", err);
    return NextResponse.json({ error: "Your order could not be placed. Nothing was charged. Try again in a moment." }, { status: 500 });
  }
}

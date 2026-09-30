import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getOrderForCustomer } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { activeProvider } from "@/lib/payments";
import { formatDate, formatMoney, formatPhone, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { CopyButton } from "@/components/site/copy-button";
import { ReferenceForm } from "@/components/shop/reference-form";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ key?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { key } = await searchParams;
  const settings = await getSettings();
  const order = key ? await getOrderForCustomer(decodeURIComponent(number), key) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-16">
        <h1 className="display text-[2.5rem]">Order not found</h1>
        <p className="mt-4 text-stone">
          This link is incomplete or has expired. Find your order with its order number and the phone number you used.
        </p>
        <Link href="/order/lookup" className="btn btn-primary mt-8">
          Find my order
        </Link>
      </div>
    );
  }

  const provider = activeProvider();
  const init = await provider.initiate(
    { id: order.id, orderNumber: order.orderNumber, total: order.total, currency: order.currency, phone: order.phone },
    settings,
  );
  const instructions = init.status === "instructions" ? init.instructions : null;
  const submitted = order.payments.filter((p) => p.status === "submitted");
  const rejected = order.payments.filter((p) => p.status === "rejected");
  const verified = order.payments.find((p) => p.status === "verified");
  const cancelled = order.status === "cancelled";
  const paid = order.paymentStatus === "paid";
  const wa = settings.whatsapp ? whatsappLink(settings.whatsapp, `Hello, about my order ${order.orderNumber}`) : null;

  return (
    <div className="mx-auto max-w-[72rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="max-w-3xl">
        <h1 className="display text-[2.75rem] md:text-[4rem]">
          {cancelled ? "This order was cancelled" : "Thank you for your purchase!"}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-[0.875rem] text-stone">Order number</p>
            <p className="text-[1.75rem] font-semibold tracking-wide tabular-nums">{order.orderNumber}</p>
          </div>
          <CopyButton value={order.orderNumber} label="Copy order number" />
        </div>
        <p className="mt-3 text-[0.9375rem] text-stone">
          Placed on {formatDate(order.createdAt, true)}. Bookmark this page to come back to it
          {order.email ? `; we have also emailed a link to ${order.email}` : ""}.
        </p>
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {/* Payment panel */}
          <section aria-labelledby="payment-heading" className="border border-graphite bg-white p-6 md:p-8">
            <p className="text-[0.875rem] text-stone">Payment status</p>
            <p id="payment-heading" className="mt-1 text-[1.25rem] font-semibold">
              {cancelled ? "Cancelled" : PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </p>

            {cancelled && (
              <div className="mt-4 space-y-3 text-[0.9375rem]">
                <p>
                  This order was cancelled{order.paymentStatus === "paid" ? "" : " because payment was not received in time"}. The
                  items were released.
                </p>
                <p>If you have already paid, contact us with your M-Pesa confirmation code and order number.</p>
              </div>
            )}

            {!cancelled && order.status === "pending_payment" && instructions && (
              <div className="mt-6">
                <h2 className="display text-[2rem]">{instructions.title}</h2>
                {rejected.length > 0 && (
                  <p className="mt-3 border-l-2 border-reddot pl-3 text-[0.9375rem]">
                    We could not match code {rejected.at(-1)!.reference} to a payment. Check the SMS and send the correct code, or
                    contact us.
                  </p>
                )}
                {instructions.payTo ? (
                  <dl className="mt-6 grid gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
                      <div>
                        <dt className="text-[0.875rem] text-stone">{instructions.payToLabel}</dt>
                        <dd className="text-[2rem] font-semibold tracking-wide tabular-nums">{formatPhone(instructions.payTo)}</dd>
                        <dd className="text-[0.9375rem]">Name: {instructions.accountName}</dd>
                      </div>
                      <CopyButton value={instructions.payTo.replace(/\s+/g, "")} label="Copy number" />
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
                      <div>
                        <dt className="text-[0.875rem] text-stone">Amount to send</dt>
                        <dd className="text-[2rem] font-semibold tabular-nums">{formatMoney(instructions.amount, instructions.currency)}</dd>
                        {order.deliveryFeeToBeConfirmed && (
                          <dd className="text-[0.875rem] text-stone">Delivery is not included; we will confirm it by phone.</dd>
                        )}
                      </div>
                      <CopyButton value={String(instructions.amount)} label="Copy amount" />
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-[0.9375rem]">
                    The M-Pesa number is being set up. We will call you on {formatPhone(order.phone)} with payment details.
                  </p>
                )}

                <ol className="mt-6 space-y-3">
                  {instructions.steps.map((s, i) => (
                    <li key={i} className="grid grid-cols-[2rem_1fr] text-[0.9375rem]">
                      <span className="font-semibold tabular-nums">{i + 1}.</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-[0.875rem] text-stone">
                  Never share your M-Pesa PIN with anyone. {settings.businessName} will never ask for it.
                </p>
                {order.holdExpiresAt && (
                  <p className="mt-4 text-[0.9375rem] font-semibold">
                    Your items are held until {formatDate(order.holdExpiresAt, true)}.
                  </p>
                )}

                <div className="mt-8 border-t border-rule pt-6">
                  <ReferenceForm orderNumber={order.orderNumber} accessKey={key!} />
                </div>
              </div>
            )}

            {!cancelled && order.status === "payment_verification" && (
              <div className="mt-4 space-y-4 text-[0.9375rem]">
                <p>
                  We received your M-Pesa code
                  {submitted.length ? (
                    <>
                      {" "}
                      <strong className="tracking-wide">{submitted.map((p) => p.reference).join(", ")}</strong>
                    </>
                  ) : null}{" "}
                  and are checking it against our M-Pesa statement. Your items stay reserved while we check.
                </p>
                <p>
                  We will call you on {formatPhone(order.phone)}
                  {order.email ? " and email you" : ""} as soon as the payment is confirmed. This page will also update.
                </p>
                <details className="border-t border-rule pt-4">
                  <summary className="cursor-pointer font-semibold">Entered the wrong code?</summary>
                  <div className="mt-4">
                    <ReferenceForm orderNumber={order.orderNumber} accessKey={key!} again />
                  </div>
                </details>
              </div>
            )}

            {!cancelled && paid && (
              <div className="mt-4 space-y-3 text-[0.9375rem]">
                <p>
                  Payment confirmed{order.paidAt ? ` on ${formatDate(order.paidAt)}` : ""}
                  {verified ? ` (M-Pesa code ${verified.reference})` : ""}.
                </p>
                <p>
                  Order status: <strong>{ORDER_STATUS_LABELS[order.status]}</strong>. We will call you to arrange delivery.
                </p>
                {order.trackingNumber && (
                  <p>
                    Tracking: {order.trackingCarrier} {order.trackingNumber}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-[1.0625rem] font-semibold">Customer</h2>
              <p className="mt-2 text-[0.9375rem]">{order.customerName}</p>
              <p className="text-[0.9375rem]">{formatPhone(order.phone)}</p>
              {order.email && <p className="text-[0.9375rem]">{order.email}</p>}
            </div>
            <div>
              <h2 className="text-[1.0625rem] font-semibold">Delivery</h2>
              <p className="mt-2 text-[0.9375rem]">{order.deliveryZoneName}</p>
              <p className="text-[0.9375rem] whitespace-pre-line">{order.address}</p>
              <p className="text-[0.9375rem]">{order.city}</p>
              {order.deliveryNotes && <p className="mt-2 text-[0.875rem] text-stone">Notes: {order.deliveryNotes}</p>}
            </div>
          </section>

          <p className="mt-10 text-[0.9375rem] text-stone">
            Questions? <Link href="/contact" className="link">Contact us</Link>
            {wa && (
              <>
                {" "}or{" "}
                <a href={wa} className="link" target="_blank" rel="noopener noreferrer">
                  message us on WhatsApp
                </a>
              </>
            )}{" "}
            with your order number.
          </p>
        </div>

        <aside className="lg:col-span-5">
          <div className="bg-white p-6">
            <h2 className="text-[1.0625rem] font-semibold">Items purchased</h2>
            <ul className="mt-4 divide-y divide-rule">
              {order.items.map((i) => (
                <li key={i.id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 py-4">
                  <div className="flex aspect-square items-center justify-center bg-plinth p-1.5">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" width={120} height={120} sizes="72px" className="h-auto max-h-full w-auto max-w-full" />}
                  </div>
                  <div className="min-w-0">
                    <p className="work-title truncate text-[1.0625rem]">{i.title}</p>
                    <p className="text-[0.8125rem] text-stone">
                      {i.itemType === "original" ? "Original painting" : `Print, ${i.sizeLabel}`} × {i.quantity}
                    </p>
                    {i.itemType === "original" && i.coaNumber && (
                      <p className="text-[0.8125rem] text-stone">Certificate of Authenticity included</p>
                    )}
                  </div>
                  <p className="text-[0.9375rem] tabular-nums">{formatMoney(i.lineTotal, order.currency)}</p>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-y-2 border-t border-rule pt-4 text-[0.9375rem]">
              <dt>Subtotal</dt>
              <dd className="text-right tabular-nums">{formatMoney(order.subtotal, order.currency)}</dd>
              <dt>Delivery</dt>
              <dd className="text-right tabular-nums">
                {order.deliveryFeeToBeConfirmed ? "To be confirmed" : formatMoney(order.deliveryFee, order.currency)}
              </dd>
              {order.discountTotal > 0 && (
                <>
                  <dt>Discount</dt>
                  <dd className="text-right tabular-nums">−{formatMoney(order.discountTotal, order.currency)}</dd>
                </>
              )}
              <dt className="border-t border-rule pt-3 font-semibold">Total</dt>
              <dd className="border-t border-rule pt-3 text-right font-semibold tabular-nums">{formatMoney(order.total, order.currency)}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

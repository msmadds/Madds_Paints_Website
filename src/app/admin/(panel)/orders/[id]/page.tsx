import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, formatMoney, formatPhone, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";
import { whatsappLink } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/buttons";
import { Flash, Input, PageTitle, Panel, Pill, Select, Textarea } from "@/components/admin/ui";
import {
  cancelOrderAction,
  recordPaymentAction,
  rejectPaymentAction,
  setStatusAction,
  updateOrderDetails,
  verifyPaymentAction,
} from "../../../actions";

export const metadata = { title: "Order" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const NEXT_STATUSES = ["paid", "processing", "ready_for_delivery", "shipped_delivered", "completed"] as const;

export default async function OrderAdmin({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const o = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: {
      items: { orderBy: [asc(schema.orderItems.createdAt)] },
      payments: { orderBy: [asc(schema.payments.createdAt)] },
      events: { orderBy: [desc(schema.orderEvents.createdAt)] },
    },
  });
  if (!o) notFound();

  const wa = whatsappLink(o.phone, `Hello ${o.customerName}, this is MedePaints about your order ${o.orderNumber}.`);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const customerLink = `${site}/order/${o.orderNumber}?key=${o.accessToken}`;
  const cancelled = o.status === "cancelled";
  const paid = o.paymentStatus === "paid";

  return (
    <div className="max-w-6xl">
      <Link href="/admin/orders" className="text-[0.875rem] text-stone hover:text-graphite">Orders</Link>
      <PageTitle actions={<Pill value={o.status}>{ORDER_STATUS_LABELS[o.status]}</Pill>}>
        <span className="tabular-nums">{o.orderNumber}</span>
      </PageTitle>
      <Flash {...sp} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel title="Payment" description={`${PAYMENT_STATUS_LABELS[o.paymentStatus]}. Amount due ${formatMoney(o.total, o.currency)}.`}>
            {o.payments.length === 0 ? (
              <p className="text-[0.9375rem] text-stone">No M-Pesa code submitted yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {o.payments.map((p) => (
                  <li key={p.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[1.25rem] font-semibold tracking-wider tabular-nums">{p.reference}</p>
                        <p className="text-[0.8125rem] text-stone">
                          {formatMoney(p.amount, p.currency)} expected, submitted {formatDate(p.createdAt, true)}
                          {p.payerPhone ? `, paid from ${formatPhone(p.payerPhone)}` : ""}
                        </p>
                        {p.reviewNote && <p className="text-[0.8125rem] text-stone">Note: {p.reviewNote}</p>}
                        {p.verifiedBy && <p className="text-[0.8125rem] text-stone">Reviewed by {p.verifiedBy}</p>}
                      </div>
                      <Pill value={p.status === "verified" ? "paid" : p.status === "rejected" ? "cancelled" : "payment_verification"}>
                        {p.status === "submitted" ? "Needs checking" : p.status === "verified" ? "Verified" : "Rejected"}
                      </Pill>
                    </div>
                    {p.status === "submitted" && !cancelled && (
                      <div className="mt-4 flex flex-wrap items-end gap-3">
                        <form action={verifyPaymentAction}>
                          <input type="hidden" name="orderId" value={o.id} />
                          <input type="hidden" name="paymentId" value={p.id} />
                          <SubmitButton
                            pendingText="Verifying…"
                            confirm={`Confirm that ${p.reference} for ${formatMoney(o.total, o.currency)} appears on your M-Pesa statement?`}
                          >
                            Verify payment
                          </SubmitButton>
                        </form>
                        <form action={rejectPaymentAction} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="orderId" value={o.id} />
                          <input type="hidden" name="paymentId" value={p.id} />
                          <input name="note" placeholder="Reason (optional)" aria-label="Reason" className="field min-h-12 w-56" />
                          <SubmitButton variant="danger" pendingText="…">Reject</SubmitButton>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!paid && !cancelled && (
              <form action={recordPaymentAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4">
                <input type="hidden" name="orderId" value={o.id} />
                <Input label="Record a payment you received" name="reference" placeholder="M-Pesa code" hint="Use when the customer paid but sent the code by phone or WhatsApp." className="flex-1" />
                <SubmitButton variant="secondary" confirm="Mark this order as paid with this code?">Record and mark paid</SubmitButton>
              </form>
            )}
          </Panel>

          <Panel title="Items">
            <ul className="divide-y divide-rule">
              {o.items.map((i) => (
                <li key={i.id} className="grid grid-cols-[4rem_1fr_auto] items-center gap-4 py-3">
                  <div className="flex size-16 items-center justify-center bg-plinth">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" width={64} height={64} className="max-h-16 w-auto" />}
                  </div>
                  <div>
                    <p className="work-title text-[1.0625rem]">{i.title}</p>
                    <p className="text-[0.8125rem] text-stone">
                      {i.itemType === "original" ? "Original painting" : `Print, ${i.sizeLabel}`} × {i.quantity}, {formatMoney(i.unitPrice, o.currency)} each
                    </p>
                    {i.coaNumber && <p className="text-[0.8125rem] text-stone">Certificate {i.coaNumber}</p>}
                    {i.artworkId && <Link href={`/admin/artworks/${i.artworkId}`} className="text-[0.8125rem] underline">Artwork record</Link>}
                  </div>
                  <p className="tabular-nums">{formatMoney(i.lineTotal, o.currency)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-2 grid grid-cols-2 gap-y-1 border-t border-rule pt-3 text-[0.9375rem]">
              <dt>Subtotal</dt><dd className="text-right tabular-nums">{formatMoney(o.subtotal, o.currency)}</dd>
              <dt>Delivery ({o.deliveryZoneName})</dt>
              <dd className="text-right tabular-nums">{o.deliveryFeeToBeConfirmed ? "To be confirmed" : formatMoney(o.deliveryFee, o.currency)}</dd>
              <dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{formatMoney(o.total, o.currency)}</dd>
            </dl>
          </Panel>

          <Panel title="History">
            <ol className="space-y-3 text-[0.875rem]">
              {o.events.map((e) => (
                <li key={e.id} className="grid gap-1 sm:grid-cols-[11rem_1fr]">
                  <span className="text-stone">{formatDate(e.createdAt, true)}</span>
                  <span>{e.message} <span className="text-stone">({e.actor})</span></span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel title="Customer">
            <p className="font-semibold">{o.customerName}</p>
            <p><a href={`tel:${o.phone}`} className="link">{formatPhone(o.phone)}</a>{wa && <>, <a href={wa} target="_blank" rel="noopener noreferrer" className="link">WhatsApp</a></>}</p>
            <p>{o.email ? <a href={`mailto:${o.email}`} className="link">{o.email}</a> : <span className="text-stone">No email given</span>}</p>
            <p className="mt-1 text-[0.8125rem] text-stone">{o.collectorOptIn ? "Joined the Collector List at checkout" : "Did not join the Collector List"}</p>
            <h3 className="mt-4 text-[0.875rem] font-semibold">Delivery address</h3>
            <p className="whitespace-pre-line">{o.address}</p>
            <p>{o.city}</p>
            {o.deliveryNotes && <p className="mt-2 text-[0.875rem] text-stone">Notes: {o.deliveryNotes}</p>}
            <p className="mt-4 text-[0.8125rem] text-stone">Placed {formatDate(o.createdAt, true)}{o.paidAt ? `, paid ${formatDate(o.paidAt, true)}` : ""}{o.holdExpiresAt ? `, hold until ${formatDate(o.holdExpiresAt, true)}` : ""}</p>
            <p className="mt-2 text-[0.8125rem] break-all text-stone">Customer link: {customerLink}</p>
          </Panel>

          {!cancelled && (
            <Panel title="Order status" description="Fulfilment statuses are available once payment is verified.">
              <form action={setStatusAction} className="flex items-end gap-3">
                <input type="hidden" name="orderId" value={o.id} />
                <Select label="Move to" name="status" defaultValue={paid ? o.status : "paid"} className="flex-1">
                  {NEXT_STATUSES.map((s) => (
                    <option key={s} value={s} disabled={!paid && s !== "paid"}>{ORDER_STATUS_LABELS[s]}</option>
                  ))}
                </Select>
                <SubmitButton variant="secondary" confirm={!paid ? "Mark as Paid without a verified M-Pesa code?" : undefined}>Update</SubmitButton>
              </form>
            </Panel>
          )}

          <Panel title="Delivery, tracking and notes">
            <form action={updateOrderDetails} className="grid gap-4">
              <input type="hidden" name="orderId" value={o.id} />
              {!paid && (
                <Input label="Delivery fee (TZS)" name="deliveryFee" inputMode="numeric" defaultValue={o.deliveryFee} hint="Change before payment if you agreed a different fee. The total updates." />
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Courier" name="trackingCarrier" defaultValue={o.trackingCarrier ?? ""} />
                <Input label="Tracking number" name="trackingNumber" defaultValue={o.trackingNumber ?? ""} />
              </div>
              <Textarea label="Private notes" name="adminNotes" defaultValue={o.adminNotes ?? ""} rows={3} />
              <div><SubmitButton variant="secondary">Save details</SubmitButton></div>
            </form>
          </Panel>

          {!cancelled && (
            <Panel title="Cancel order" description="Returns reserved originals and print stock to the shop. Refund any payment yourself through M-Pesa.">
              <form action={cancelOrderAction} className="grid gap-3">
                <input type="hidden" name="orderId" value={o.id} />
                <Input label="Reason (optional)" name="reason" />
                <div><SubmitButton variant="danger" confirm="Cancel this order and release its items?" pendingText="Cancelling…">Cancel order</SubmitButton></div>
              </form>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

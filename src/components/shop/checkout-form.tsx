"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-context";
import { useResolvedCart } from "./use-resolved-cart";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PROMOTION } from "@/lib/promotion";

type Zone = { id: string; name: string; fee: number; currency: string; feeToBeConfirmed: boolean; estimate: string };

export function CheckoutForm({ zones, holdHours }: { zones: Zone[]; holdHours: number }) {
  const router = useRouter();
  const { items, clear, ready } = useCart();
  const { lines, subtotal, discount, currency, loading, hasUnavailable } = useResolvedCart();
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [join, setJoin] = useState(false);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const zone = zones.find((z) => z.id === zoneId);
  const deliveryFee = zone && !zone.feeToBeConfirmed ? zone.fee : 0;
  const total = subtotal + deliveryFee - discount;

  if (!ready || loading) return <p className="py-20 text-stone">Loading your order…</p>;
  if (!lines?.length) {
    return (
      <div className="py-20">
        <p className="text-[1.125rem]">Your cart is empty.</p>
        <Link href="/shop/originals" className="btn btn-primary mt-6">
          Shop Originals
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customerName: fd.get("customerName"),
          phone: fd.get("phone"),
          email: fd.get("email") || undefined,
          address: fd.get("address"),
          city: fd.get("city"),
          deliveryZoneId: zoneId,
          deliveryNotes: fd.get("deliveryNotes") || undefined,
          joinCollectorList: join,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        clear();
        router.replace(`/order/${encodeURIComponent(data.orderNumber)}?key=${encodeURIComponent(data.key)}`);
        return;
      }
      setErrors(data.fields ?? {});
      setFormError(data.error ?? "Your order could not be placed. Try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("No connection. Check your internet and try again. Nothing was charged.");
    }
    setSubmitting(false);
  }

  const err = (k: string) => errors[k];
  const available = lines.filter((l) => l.available);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-12 pt-8 lg:grid-cols-12">
      <div className="space-y-12 lg:col-span-7">
        {formError && (
          <div role="alert" className="border border-reddot bg-white px-5 py-4 text-[0.9375rem] text-reddot">
            {formError}
            {hasUnavailable && (
              <Link href="/cart" className="ml-2 underline">
                Review your cart
              </Link>
            )}
          </div>
        )}

        <fieldset className="space-y-5">
          <legend className="display mb-4 text-[1.75rem]">Your details</legend>
          <p className="-mt-2 text-[0.9375rem] text-stone">No account or password needed.</p>
          <Field label="Full name" name="customerName" autoComplete="name" required error={err("customerName")} />
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712 345 678"
            hint="We call this number to arrange delivery."
            required
            error={err("phone")}
          />
          <Field
            label="Email address (optional)"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            hint="For your receipt and order updates. Leave empty if you prefer."
            value={email}
            onChange={(v) => setEmail(v)}
            error={err("email")}
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="display mb-4 text-[1.75rem]">Delivery</legend>
          <div>
            <span className="field-label">Delivery option</span>
            <div className="grid gap-2">
              {zones.map((z) => (
                <label
                  key={z.id}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center justify-between gap-4 border px-4 py-3",
                    zoneId === z.id ? "border-graphite bg-white" : "border-rule",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="zone"
                      value={z.id}
                      checked={zoneId === z.id}
                      onChange={() => setZoneId(z.id)}
                      className="size-4 accent-graphite"
                    />
                    <span>
                      <span className="block">{z.name}</span>
                      {z.estimate && <span className="block text-[0.8125rem] text-stone">{z.estimate}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.9375rem] tabular-nums">
                    {z.feeToBeConfirmed ? "Confirmed by phone" : z.fee === 0 ? "Free" : formatMoney(z.fee, z.currency)}
                  </span>
                </label>
              ))}
            </div>
            {err("deliveryZoneId") && <p className="field-error">{err("deliveryZoneId")}</p>}
          </div>
          <Field label="City or town" name="city" autoComplete="address-level2" defaultValue="Dar es Salaam" required error={err("city")} />
          <Field
            label="Delivery address"
            name="address"
            autoComplete="street-address"
            multiline
            hint="Area, street, building and any landmark."
            required
            error={err("address")}
          />
          <Field label="Delivery notes (optional)" name="deliveryNotes" multiline hint="Best time to deliver, gate code, directions." error={err("deliveryNotes")} />
        </fieldset>

        <fieldset className="border border-rule bg-white p-5">
          <legend className="sr-only">Collector List</legend>
          <label className="flex cursor-pointer gap-4">
            <input
              type="checkbox"
              checked={join}
              onChange={(e) => setJoin(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-graphite"
              aria-describedby="collector-help"
            />
            <span>
              <span className="block font-semibold">Join the MedePaints Collector List</span>
              <span id="collector-help" className="mt-1 block text-[0.9375rem] text-stone">
                Be the first to hear about new original artworks, limited prints and exclusive collector releases.
              </span>
              <span className="mt-2 block text-[0.8125rem] text-stone">
                Optional. Needs an email address above. Every email includes an unsubscribe link.
              </span>
            </span>
          </label>
          {join && !email && <p className="field-error mt-3">Add your email above to join, or untick the box.</p>}
        </fieldset>

        <section className="border-t border-graphite pt-6">
          <h2 className="display text-[1.75rem]">Pay via M-Pesa</h2>
          <p className="mt-3 max-w-xl text-[0.9375rem]">
            After you place your order you will see the M-Pesa number, the exact amount and your order number. Send the
            payment from your phone, then enter the M-Pesa confirmation code. Your items are held for {holdHours} hours.
          </p>
          <p className="mt-2 text-[0.875rem] text-stone">We never ask for your M-Pesa PIN.</p>
        </section>
      </div>

      <aside className="lg:col-span-5">
        <div className="bg-white p-6 lg:sticky lg:top-28">
          <h2 className="text-[1.0625rem] font-semibold">Order summary</h2>
          <ul className="mt-4 divide-y divide-rule text-[0.9375rem]">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="work-title block truncate text-[1.0625rem]">{l.title}</span>
                  <span className="text-[0.8125rem] text-stone">
                    {l.kind === "original" ? "Original" : `Print, ${l.sizeLabel}`} × {l.quantity}
                  </span>
                  {!l.available && <span className="block text-[0.8125rem] font-semibold text-reddot">{l.reason}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(l.unitPrice * l.quantity, l.currency)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid grid-cols-2 gap-y-2 border-t border-rule pt-4 text-[0.9375rem]">
            <dt>Subtotal</dt>
            <dd className="text-right tabular-nums">{formatMoney(subtotal, currency)}</dd>
            {discount > 0 && (
              <>
                <dt>{PROMOTION.name}: {PROMOTION.percent}% off originals</dt>
                <dd className="text-right tabular-nums">−{formatMoney(discount, currency)}</dd>
              </>
            )}
            <dt>Delivery</dt>
            <dd className="text-right tabular-nums">
              {zone?.feeToBeConfirmed ? "Confirmed by phone" : formatMoney(deliveryFee, currency)}
            </dd>
            <dt className="border-t border-rule pt-3 text-[1.0625rem] font-semibold">Total</dt>
            <dd className="border-t border-rule pt-3 text-right text-[1.0625rem] font-semibold tabular-nums">{formatMoney(total, currency)}</dd>
          </dl>
          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={submitting || hasUnavailable || !available.length || !zoneId}>
            {submitting ? "Placing order…" : "Place order"}
          </button>
          {hasUnavailable && (
            <p className="mt-3 text-[0.875rem] text-reddot">
              Some items are no longer available. <Link href="/cart" className="underline">Update your cart</Link>.
            </p>
          )}
          <p className="mt-3 text-[0.8125rem] text-stone">You will pay via M-Pesa on the next page.</p>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  hint,
  error,
  multiline,
  value,
  onChange,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  defaultValue?: string;
}) {
  const id = `f-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: "field",
    ...(value !== undefined ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange?.(e.target.value) } : {}),
    ...rest,
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {multiline ? <textarea rows={3} {...common} /> : <input type={type} {...common} />}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-[0.8125rem] text-stone">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

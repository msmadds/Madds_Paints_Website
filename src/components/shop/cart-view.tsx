"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-context";
import { useResolvedCart } from "./use-resolved-cart";
import { QuantityStepper } from "./quantity";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PROMOTION } from "@/lib/promotion";

export function CartView() {
  const { remove, setPrintQuantity, ready } = useCart();
  const { lines, error, subtotal, discount, currency, loading, hasUnavailable } = useResolvedCart();

  if (!ready || loading) return <p className="py-20 text-stone">Loading your cart…</p>;
  if (error) return <p className="py-20 text-reddot">{error}</p>;
  if (!lines?.length) {
    return (
      <div className="py-20">
        <p className="text-[1.125rem]">Your cart is empty.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/shop/originals" className="btn btn-primary">
            Shop Originals
          </Link>
          <Link href="/shop/prints" className="btn btn-secondary">
            Shop Prints
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-12 pt-8 lg:grid-cols-12">
      <ul className="divide-y divide-rule border-y border-rule lg:col-span-8">
        {lines.map((l) => (
          <li key={l.key} className={cn("grid grid-cols-[6rem_1fr] gap-5 py-6 sm:grid-cols-[8rem_1fr]", !l.available && "opacity-70")}>
            <Link href={l.kind === "original" ? `/artwork/${l.slug}` : `/prints/${l.slug}`} className="flex aspect-square items-center justify-center bg-plinth p-2">
              {l.image ? (
                <Image src={l.image.url} alt={l.image.alt} width={l.image.width ?? 400} height={l.image.height ?? 400} sizes="128px" className="h-auto max-h-full w-auto max-w-full" />
              ) : null}
            </Link>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="min-w-0">
                <p className="work-title text-[1.25rem] leading-tight">{l.title}</p>
                <p className="mt-1 text-[0.875rem] font-semibold">
                  {l.kind === "original" ? "Original painting" : `Print, ${l.sizeLabel}`}
                </p>
                <p className="text-[0.875rem] text-stone">{l.detail}</p>
                <p className="mt-1 text-[0.875rem] text-stone tabular-nums">{formatMoney(l.unitPrice, l.currency)} each</p>
                {!l.available && <p className="mt-2 text-[0.875rem] font-semibold text-reddot">{l.reason}. Remove it to continue.</p>}
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                {l.kind === "print" && l.available ? (
                  <QuantityStepper
                    value={l.quantity}
                    max={l.maxQuantity ?? 20}
                    label={l.title}
                    onChange={(v) => l.variantId && setPrintQuantity(l.variantId, v)}
                  />
                ) : (
                  <span className="text-[0.875rem] text-stone">Qty 1</span>
                )}
                <p className="font-medium tabular-nums">{formatMoney(l.unitPrice * l.quantity, l.currency)}</p>
                <button type="button" onClick={() => remove(l.key)} className="h-10 text-[0.875rem] text-stone underline underline-offset-4 hover:text-graphite">
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:col-span-4">
        <div className="bg-white p-6 lg:sticky lg:top-28">
          <dl className="grid grid-cols-2 gap-y-3 text-[0.9375rem]">
            <dt>Subtotal</dt>
            <dd className="text-right tabular-nums">{formatMoney(subtotal, currency)}</dd>
            {discount > 0 && (
              <>
                <dt>{PROMOTION.name}: {PROMOTION.percent}% off originals</dt>
                <dd className="text-right tabular-nums">−{formatMoney(discount, currency)}</dd>
              </>
            )}
            <dt className="text-stone">Delivery</dt>
            <dd className="text-right text-stone">Chosen at checkout</dd>
            <dt className="border-t border-rule pt-3 font-semibold">Total</dt>
            <dd className="border-t border-rule pt-3 text-right font-semibold tabular-nums">{formatMoney(subtotal - discount, currency)}</dd>
          </dl>
          <p className="mt-2 text-[0.8125rem] text-stone">Before delivery. Pay via M-Pesa. No account needed.</p>
          {hasUnavailable && <p className="mt-4 text-[0.875rem] text-reddot">Remove unavailable items before checking out.</p>}
          <Link
            href="/checkout"
            aria-disabled={hasUnavailable || subtotal === 0}
            className="btn btn-primary mt-6 w-full"
          >
            Proceed to Checkout
          </Link>
          <Link href="/shop/originals" className="btn mt-2 w-full underline underline-offset-4">
            Continue Shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}

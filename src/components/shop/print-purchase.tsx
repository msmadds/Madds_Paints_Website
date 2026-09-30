"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "./cart-context";
import { formatDimensions, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  sizeLabel: string;
  widthCm: string | null;
  heightCm: string | null;
  price: number;
  currency: string;
  stock: number | null;
};

export function PrintPurchase({ variants, title }: { variants: Variant[]; title: string }) {
  const { addPrint } = useCart();
  const firstInStock = variants.find((v) => v.stock === null || v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<string | null>(null);

  const selected = useMemo(() => variants.find((v) => v.id === selectedId), [variants, selectedId]);
  const max = selected?.stock === null || selected?.stock === undefined ? 20 : Math.min(20, selected.stock);
  const soldOut = !selected || (selected.stock !== null && selected.stock <= 0);

  if (!variants.length) return <p className="text-stone">No sizes are available right now.</p>;

  return (
    <div>
      <fieldset>
        <legend className="field-label">Print size</legend>
        <div className="mt-2 grid gap-2">
          {variants.map((v) => {
            const out = v.stock !== null && v.stock <= 0;
            const dims = formatDimensions(v.widthCm, v.heightCm);
            return (
              <label
                key={v.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center justify-between gap-4 border px-4 py-3 transition-colors",
                  selectedId === v.id ? "border-graphite bg-white" : "border-rule hover:border-stone",
                  out && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="size"
                    value={v.id}
                    checked={selectedId === v.id}
                    disabled={out}
                    onChange={() => {
                      setSelectedId(v.id);
                      setQty(1);
                      setAdded(null);
                    }}
                    className="size-4 accent-graphite"
                  />
                  <span>
                    <span className="font-semibold">{v.sizeLabel}</span>
                    {dims && <span className="ml-2 text-[0.875rem] text-stone">{dims}</span>}
                  </span>
                </span>
                <span className="text-right text-[0.9375rem]">
                  {out ? (
                    <span className="text-reddot">Sold out</span>
                  ) : (
                    <>
                      {formatMoney(v.price, v.currency)}
                      {v.stock !== null && v.stock <= 5 && <span className="block text-[0.75rem] text-stone">{v.stock} left</span>}
                    </>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-end gap-6">
        <div>
          <span className="field-label" id="qty-label">
            Quantity
          </span>
          <div className="flex h-12 items-center border border-rule bg-white" role="group" aria-labelledby="qty-label">
            <button
              type="button"
              className="h-full w-12 text-xl disabled:opacity-30"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-10 text-center tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              className="h-full w-12 text-xl disabled:opacity-30"
              onClick={() => setQty((q) => Math.min(max, q + 1))}
              disabled={qty >= max}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <span className="field-label">Price</span>
          <p className="text-[1.5rem] leading-[3rem] tabular-nums" aria-live="polite">
            {selected ? formatMoney(selected.price * qty, selected.currency) : ""}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary mt-6 w-full"
        disabled={soldOut}
        onClick={() => {
          if (!selected) return;
          addPrint(selected.id, qty);
          setAdded(`${qty} × ${title}, ${selected.sizeLabel}`);
        }}
      >
        {soldOut ? "Sold out" : "Add to Cart"}
      </button>

      {added && (
        <div className="fade-in mt-4 flex flex-wrap items-center justify-between gap-3 border border-graphite bg-white px-4 py-3" role="status">
          <p className="text-[0.9375rem]">Added to your cart: {added}</p>
          <Link href="/cart" className="btn btn-secondary min-h-10 px-4">
            View cart
          </Link>
        </div>
      )}
    </div>
  );
}

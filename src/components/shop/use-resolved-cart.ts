"use client";

import { useEffect, useState } from "react";
import { useCart } from "./cart-context";
import type { ResolvedLine } from "@/lib/cart-resolve";

/** Fetches current prices and availability for the cart from the server. */
export function useResolvedCart() {
  const { items, ready } = useCart();
  const [lines, setLines] = useState<ResolvedLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const signature = JSON.stringify(items);

  useEffect(() => {
    if (!ready) return;
    if (!items.length) {
      setLines([]);
      return;
    }
    const ctrl = new AbortController();
    setError(null);
    fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load your cart.");
        setLines(data.lines);
        setDiscount(data.discount ?? 0);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready]);

  const available = (lines ?? []).filter((l) => l.available);
  const subtotal = available.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const currency = lines?.[0]?.currency ?? "TZS";
  return { lines, error, subtotal, discount: lines?.length ? discount : 0, currency, loading: ready && lines === null, hasUnavailable: (lines ?? []).some((l) => !l.available) };
}

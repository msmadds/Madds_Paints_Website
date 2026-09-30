"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * The cart lives in the browser (localStorage) because customers have no
 * accounts. It only stores ids and quantities — prices and availability are
 * always re-read from the server.
 */
export type CartItem =
  | { kind: "original"; artworkId: string }
  | { kind: "print"; variantId: string; quantity: number };

type CartState = {
  items: CartItem[];
  count: number;
  ready: boolean;
  addOriginal: (artworkId: string) => void;
  addPrint: (variantId: string, quantity: number) => void;
  setPrintQuantity: (variantId: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "medepaints.cart.v1";
const CartContext = createContext<CartState | null>(null);

export const itemKey = (i: CartItem) => (i.kind === "original" ? `o:${i.artworkId}` : `p:${i.variantId}`);

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && (i.kind === "original" || i.kind === "print")) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setItems(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode: cart still works for this visit */
    }
  }, [items, ready]);

  const addOriginal = useCallback((artworkId: string) => {
    setItems((prev) => (prev.some((i) => i.kind === "original" && i.artworkId === artworkId) ? prev : [...prev, { kind: "original", artworkId }]));
  }, []);

  const addPrint = useCallback((variantId: string, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.kind === "print" && i.variantId === variantId);
      if (existing && existing.kind === "print") {
        return prev.map((i) => (i === existing ? { ...existing, quantity: Math.min(20, existing.quantity + quantity) } : i));
      }
      return [...prev, { kind: "print", variantId, quantity: Math.min(20, Math.max(1, quantity)) }];
    });
  }, []);

  const setPrintQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.kind === "print" && i.variantId === variantId ? { ...i, quantity: Math.min(20, Math.max(1, quantity)) } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => itemKey(i) !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((n, i) => n + (i.kind === "print" ? i.quantity : 1), 0),
      ready,
      addOriginal,
      addPrint,
      setPrintQuantity,
      remove,
      clear,
    }),
    [items, ready, addOriginal, addPrint, setPrintQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

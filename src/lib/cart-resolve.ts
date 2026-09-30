import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CartItemInput } from "./validation";
import { normaliseCart } from "./orders";

export type ResolvedLine = {
  key: string;
  kind: "original" | "print";
  artworkId: string;
  variantId: string | null;
  slug: string;
  title: string;
  image: { url: string; width: number | null; height: number | null; alt: string } | null;
  sizeLabel: string | null;
  detail: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  maxQuantity: number | null;
  available: boolean;
  reason: string | null;
};

/** Re-reads every cart line from the database. Client prices are never trusted. */
export async function resolveCart(items: CartItemInput[]): Promise<ResolvedLine[]> {
  const { originals, prints } = normaliseCart(items);
  const lines: ResolvedLine[] = [];

  if (originals.length) {
    const rows = await db.query.artworks.findMany({
      where: inArray(schema.artworks.id, originals),
      with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 } },
    });
    for (const a of rows) {
      const img = a.images[0];
      const purchasable = a.published && a.price !== null && a.status === "available";
      lines.push({
        key: `o:${a.id}`,
        kind: "original",
        artworkId: a.id,
        variantId: null,
        slug: a.slug,
        title: a.title,
        image: img ? { url: img.url, width: img.width, height: img.height, alt: img.alt || a.title } : null,
        sizeLabel: null,
        detail: a.medium,
        unitPrice: a.price ?? 0,
        currency: a.currency,
        quantity: 1,
        maxQuantity: 1,
        available: purchasable,
        reason: purchasable ? null : a.status === "sold" ? "Sold" : a.status === "reserved" ? "Reserved by another collector" : "No longer available",
      });
    }
  }

  if (prints.length) {
    const ids = prints.map(([id]) => id);
    const rows = await db.query.printVariants.findMany({
      where: inArray(schema.printVariants.id, ids),
      with: {
        printProduct: {
          with: { artwork: { with: { images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 } } } },
        },
      },
    });
    for (const [id, qty] of prints) {
      const v = rows.find((r) => r.id === id);
      if (!v) continue;
      const p = v.printProduct;
      const a = p.artwork;
      const img = a.images[0];
      const open = v.active && p.published && a.published;
      const soldOut = v.stock !== null && v.stock <= 0;
      const available = open && !soldOut;
      lines.push({
        key: `p:${v.id}`,
        kind: "print",
        artworkId: a.id,
        variantId: v.id,
        slug: a.slug,
        title: a.title,
        image: img ? { url: img.url, width: img.width, height: img.height, alt: img.alt || a.title } : null,
        sizeLabel: v.sizeLabel,
        detail: `${p.paperWeightGsm} GSM ${p.paperType.toLowerCase()}`,
        unitPrice: v.price,
        currency: v.currency,
        quantity: v.stock !== null ? Math.max(1, Math.min(qty, v.stock)) : qty,
        maxQuantity: v.stock !== null ? Math.min(20, v.stock) : 20,
        available,
        reason: !open ? "No longer available" : soldOut ? "Sold out" : null,
      });
    }
  }
  return lines;
}

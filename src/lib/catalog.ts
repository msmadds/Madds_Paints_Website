import "server-only";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { releaseExpiredHoldsThrottled } from "./orders";
import type { Artwork, ArtworkImage, PrintProduct, PrintVariant } from "@/db/schema";

export type PrintWithVariants = PrintProduct & { variants: PrintVariant[] };
export type ArtworkFull = Artwork & { images: ArtworkImage[]; printProduct: PrintWithVariants | null };

const withRelations = () => ({
  images: { orderBy: [asc(schema.artworkImages.sortOrder), asc(schema.artworkImages.createdAt)] },
  printProduct: {
    with: {
      variants: {
        where: eq(schema.printVariants.active, true),
        orderBy: [asc(schema.printVariants.sortOrder), asc(schema.printVariants.price)],
      },
    },
  },
});

const order = [asc(schema.artworks.sortOrder), desc(schema.artworks.year), desc(schema.artworks.createdAt)];

/** Originals offered for sale (sold ones stay listed, marked SOLD). */
export async function listOriginals(): Promise<ArtworkFull[]> {
  await releaseExpiredHoldsThrottled();
  return (await db.query.artworks.findMany({
    where: and(eq(schema.artworks.published, true), isNotNull(schema.artworks.price)),
    with: withRelations(),
    orderBy: order,
  })) as ArtworkFull[];
}

export async function listFeatured(limit = 6): Promise<ArtworkFull[]> {
  await releaseExpiredHoldsThrottled();
  const featured = (await db.query.artworks.findMany({
    where: and(eq(schema.artworks.published, true), eq(schema.artworks.featured, true)),
    with: withRelations(),
    orderBy: order,
    limit,
  })) as ArtworkFull[];
  if (featured.length) return featured;
  return (await db.query.artworks.findMany({
    where: eq(schema.artworks.published, true),
    with: withRelations(),
    orderBy: order,
    limit,
  })) as ArtworkFull[];
}

/** Every published work, for the gallery. */
export async function listGallery(): Promise<ArtworkFull[]> {
  await connection();
  return (await db.query.artworks.findMany({
    where: eq(schema.artworks.published, true),
    with: withRelations(),
    orderBy: order,
  })) as ArtworkFull[];
}

/** Artworks that have a published print product with at least one size. */
export async function listPrints(): Promise<ArtworkFull[]> {
  await connection();
  const all = (await db.query.artworks.findMany({
    where: eq(schema.artworks.published, true),
    with: withRelations(),
    orderBy: order,
  })) as ArtworkFull[];
  return all.filter((a) => a.printProduct?.published && a.printProduct.variants.length > 0);
}

export async function getArtworkBySlug(slug: string): Promise<ArtworkFull | null> {
  await releaseExpiredHoldsThrottled();
  const a = await db.query.artworks.findFirst({
    where: and(eq(schema.artworks.slug, slug), eq(schema.artworks.published, true)),
    with: withRelations(),
  });
  return (a as ArtworkFull | undefined) ?? null;
}

export async function listDeliveryZones() {
  await connection();
  return db.query.deliveryZones.findMany({
    where: eq(schema.deliveryZones.active, true),
    orderBy: [asc(schema.deliveryZones.sortOrder), asc(schema.deliveryZones.name)],
  });
}

export function primaryImage(a: { images: ArtworkImage[] }): ArtworkImage | null {
  return a.images[0] ?? null;
}

/** Can the original be bought right now? */
export function isOriginalPurchasable(a: Artwork): boolean {
  return a.published && a.price !== null && a.status === "available";
}

export function printFromPrice(a: ArtworkFull): number | null {
  const v = a.printProduct?.variants ?? [];
  const inStock = v.filter((x) => x.stock === null || x.stock > 0);
  const pool = inStock.length ? inStock : v;
  return pool.length ? Math.min(...pool.map((x) => x.price)) : null;
}

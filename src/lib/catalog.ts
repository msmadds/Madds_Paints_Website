import "server-only";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { connection } from "next/server";
import { db, schema } from "@/db";
import { releaseExpiredHoldsThrottled } from "./orders";
import type { Artwork, ArtworkImage, Collection, PrintProduct, PrintVariant } from "@/db/schema";

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

/**
 * Past commissions chosen in admin, in the chosen order. Unpublished works are
 * included on purpose: a commission can be shown here without being in the gallery.
 */
export async function listCommissionWorks(ids: string[]): Promise<ArtworkFull[]> {
  await connection();
  if (!ids.length) return [];
  const rows = (await db.query.artworks.findMany({
    where: inArray(schema.artworks.id, ids),
    with: withRelations(),
  })) as ArtworkFull[];
  return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is ArtworkFull => Boolean(r));
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

export type CollectionCard = Collection & { cover: ArtworkImage | null; count: number };

/** Published collections that hold at least one published work. */
export async function listCollections(): Promise<CollectionCard[]> {
  await connection();
  const rows = await db.query.collections.findMany({
    where: eq(schema.collections.published, true),
    orderBy: [asc(schema.collections.sortOrder), asc(schema.collections.title)],
    with: {
      artworks: {
        orderBy: [asc(schema.artworkCollections.sortOrder), asc(schema.artworkCollections.createdAt)],
        with: { artwork: { with: { images: { orderBy: [asc(schema.artworkImages.sortOrder)], limit: 1 } } } },
      },
    },
  });
  return rows
    .map(({ artworks, ...c }) => {
      const works = artworks.map((l) => l.artwork).filter((a) => a.published);
      const coverWork = works.find((a) => a.id === c.coverArtworkId && a.images.length) ?? works.find((a) => a.images.length);
      return { ...c, cover: coverWork?.images[0] ?? null, count: works.length };
    })
    .filter((c) => c.count > 0);
}

/** A published collection and its published works, in the collection's order. */
export async function getCollectionBySlug(slug: string): Promise<(Collection & { works: ArtworkFull[] }) | null> {
  await releaseExpiredHoldsThrottled();
  const c = await db.query.collections.findFirst({
    where: and(eq(schema.collections.slug, slug), eq(schema.collections.published, true)),
    with: {
      artworks: {
        orderBy: [asc(schema.artworkCollections.sortOrder), asc(schema.artworkCollections.createdAt)],
        with: { artwork: { with: withRelations() } },
      },
    },
  });
  if (!c) return null;
  const { artworks, ...rest } = c;
  const works = (artworks.map((l) => l.artwork) as ArtworkFull[]).filter((a) => a.published);
  return { ...rest, works };
}

/** Published collections an artwork belongs to (for "Part of …" links). */
export async function collectionsForArtwork(artworkId: string): Promise<Pick<Collection, "slug" | "title">[]> {
  const rows = await db
    .select({ slug: schema.collections.slug, title: schema.collections.title })
    .from(schema.artworkCollections)
    .innerJoin(schema.collections, eq(schema.collections.id, schema.artworkCollections.collectionId))
    .where(and(eq(schema.artworkCollections.artworkId, artworkId), eq(schema.collections.published, true)))
    .orderBy(asc(schema.collections.sortOrder), asc(schema.collections.title));
  return rows;
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

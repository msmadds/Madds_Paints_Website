import type { MetadataRoute } from "next";
import { listCollections, listGallery, listPrints } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const [works, prints, collections] = await Promise.all([listGallery(), listPrints(), listCollections()]);

  const pages = ["", "/gallery", "/shop", "/shop/originals", "/shop/prints", "/collections", "/commissions", "/about", "/contact", "/gift-cards", "/collector-list"];

  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    // Image URLs help the paintings show up in Google Images.
    ...works.map((a) => ({
      url: `${base}/artwork/${a.slug}`,
      lastModified: a.updatedAt,
      images: a.images.map((i) => i.url),
      priority: 0.8,
    })),
    ...prints.map((a) => ({ url: `${base}/prints/${a.slug}`, lastModified: a.updatedAt, priority: 0.6 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, lastModified: c.updatedAt, priority: 0.7 })),
  ];
}

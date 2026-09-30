import type { Metadata } from "next";
import Link from "next/link";
import { listOriginals, primaryImage } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";
import { WallLabel } from "@/components/site/wall-label";
import { SoldDot } from "@/components/site/status-mark";
import { FilterLinks, ShopTabs } from "@/components/shop/shop-tabs";

export const metadata: Metadata = { title: "Original paintings" };

export default async function OriginalsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const all = await listOriginals();
  const counts = {
    all: all.length,
    available: all.filter((a) => a.status === "available").length,
    sold: all.filter((a) => a.status === "sold").length,
  };
  const works = show === "available" ? all.filter((a) => a.status === "available") : show === "sold" ? all.filter((a) => a.status === "sold") : all;

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <ShopTabs active="originals" />
      <div className="mt-6 flex flex-col gap-6 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <p className="max-w-xl text-stone">
          Each painting is one of one, signed, and comes with a numbered Certificate of Authenticity. Sold works remain here,
          marked with a red dot.
        </p>
        <FilterLinks
          base="/shop/originals"
          current={show}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "available", label: "Available", count: counts.available },
            { value: "sold", label: "Sold", count: counts.sold },
          ]}
        />
      </div>

      {works.length === 0 ? (
        <p className="py-24 text-stone">
          No works match this filter. <Link href="/shop/originals" className="link">Show all originals</Link>
        </p>
      ) : (
        <ul className="grid gap-x-10 gap-y-16 pt-12 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w, i) => (
            <li key={w.id}>
              <Link href={`/artwork/${w.slug}`} className="group block">
                <div className="relative">
                  <ArtImage
                    image={primaryImage(w)}
                    title={w.title}
                    box="aspect-[4/5]"
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    priority={i < 3}
                    className="transition-opacity duration-300 group-hover:opacity-90"
                  />
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <WallLabel artwork={w} size="sm" />
                  {w.status === "sold" && <span className="relative mt-2 block size-4"><SoldDot /></span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

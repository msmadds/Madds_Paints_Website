import type { Metadata } from "next";
import Link from "next/link";
import { listGallery, primaryImage } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";
import { StatusMark } from "@/components/site/status-mark";
import { FilterLinks } from "@/components/shop/shop-tabs";

export const metadata: Metadata = {
  title: "Gallery",
  description: "The MedePaints body of work: available, reserved and sold paintings.",
};

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = "all" } = await searchParams;
  const all = await listGallery();
  const works =
    show === "available" ? all.filter((w) => w.status === "available" && w.price !== null)
    : show === "sold" ? all.filter((w) => w.status === "sold")
    : all;

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="flex flex-col gap-6 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="display text-[3rem] md:text-[5rem]">Gallery</h1>
          <p className="mt-3 max-w-xl text-stone">
            The body of work, hung together. A red dot marks a painting that has found its home.
          </p>
        </div>
        <FilterLinks
          base="/gallery"
          current={show}
          options={[
            { value: "all", label: "All works", count: all.length },
            { value: "available", label: "Available", count: all.filter((w) => w.status === "available" && w.price !== null).length },
            { value: "sold", label: "Sold", count: all.filter((w) => w.status === "sold").length },
          ]}
        />
      </div>

      {/* Salon hang: columns let each painting keep its own proportions. */}
      <ul className="columns-1 gap-10 pt-12 sm:columns-2 lg:columns-3">
        {works.map((w, i) => (
          <li key={w.id} className="mb-16 break-inside-avoid">
            <Link href={w.price !== null ? `/artwork/${w.slug}` : w.printProduct ? `/prints/${w.slug}` : "#"} className="group block">
              <div className="relative">
                <ArtImage image={primaryImage(w)} title={w.title} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" priority={i < 3} />
                {w.status === "sold" && (
                  <span aria-hidden className="absolute -right-1.5 -bottom-1.5 size-4 rounded-full bg-reddot ring-4 ring-wall" />
                )}
              </div>
              <div className="mt-4 text-[0.875rem] leading-snug">
                <p className="work-title text-[1.125rem]">
                  {w.title}
                  {w.year && <span className="not-italic text-stone">, {w.year}</span>}
                </p>
                <p className="text-stone">{w.medium}</p>
                <div className="mt-1">
                  <StatusMark status={w.status} forSale={w.price !== null} showAvailable />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {works.length === 0 && <p className="py-20 text-stone">No works to show yet.</p>}
    </div>
  );
}

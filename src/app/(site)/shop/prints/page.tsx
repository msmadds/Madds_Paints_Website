import type { Metadata } from "next";
import Link from "next/link";
import { listPrints, primaryImage, printFromPrice } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";
import { WallLabel } from "@/components/site/wall-label";
import { ShopTabs } from "@/components/shop/shop-tabs";

export const metadata: Metadata = { title: "Fine art prints" };

export default async function PrintsPage() {
  const works = await listPrints();

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <ShopTabs active="prints" />
      <div className="mt-6 border-b border-rule pb-8">
        <p className="max-w-xl text-stone">
          Reproductions of original MedePaints paintings on 300 GSM fine art paper, printed with archival pigment inks. Prints
          stay available after an original is sold.
        </p>
      </div>

      {works.length === 0 ? (
        <p className="py-24 text-stone">Prints will be released soon. Join the Collector List at checkout, or follow along on Instagram.</p>
      ) : (
        <ul className="grid gap-x-10 gap-y-16 pt-12 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w, i) => {
            const p = w.printProduct!;
            const soldOut = p.variants.every((v) => v.stock !== null && v.stock <= 0);
            return (
              <li key={w.id}>
                <Link href={`/prints/${w.slug}`} className="group block">
                  <ArtImage
                    image={primaryImage(w)}
                    title={w.title}
                    box="aspect-[4/5]"
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    priority={i < 3}
                    className="transition-opacity duration-300 group-hover:opacity-90"
                  />
                  <div className="mt-5">
                    <WallLabel artwork={w} mode="print" printFrom={printFromPrice(w)} size="sm" />
                    <p className="mt-1 text-[0.875rem] text-stone">
                      {p.editionType === "limited" ? `Limited edition${p.editionSize ? ` of ${p.editionSize}` : ""}` : "Open edition"}
                      {", "}
                      {p.variants.map((v) => v.sizeLabel).join(", ")}
                      {soldOut && <span className="ml-2 font-semibold text-reddot">Sold out</span>}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

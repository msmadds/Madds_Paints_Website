import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtworkBySlug, primaryImage } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { ArtworkGallery } from "@/components/shop/artwork-gallery";
import { PrintPurchase } from "@/components/shop/print-purchase";
import { StatusMark } from "@/components/site/status-mark";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArtworkBySlug(slug);
  if (!a?.printProduct) return { title: "Print not found" };
  const img = primaryImage(a);
  return {
    title: `${a.title}, fine art print`,
    description: `Fine art print of ${a.title} on 300 GSM paper. ${a.printProduct.variants.map((v) => v.sizeLabel).join(", ")}.`,
    openGraph: img ? { images: [{ url: img.url }] } : undefined,
  };
}

export default async function PrintPage({ params }: Props) {
  const { slug } = await params;
  const [a, settings] = await Promise.all([getArtworkBySlug(slug), getSettings()]);
  const p = a?.printProduct;
  if (!a || !p || !p.published) notFound();

  const edition =
    p.editionType === "limited" ? `Limited edition${p.editionSize ? ` of ${p.editionSize}` : ""}` : "Open edition";

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-6 md:px-10 md:pt-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-[0.875rem] text-stone">
        <Link href="/shop/prints" className="hover:text-graphite">
          Prints
        </Link>
        <span aria-hidden> / </span>
        <span className="text-graphite">{a.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <ArtworkGallery images={a.images.slice(0, 1)} title={a.title} />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <h1 className="work-title text-[2.5rem] leading-[1.05] md:text-[3.25rem]">{a.title}</h1>
            <p className="mt-2 text-stone">Fine art print, {a.artistName}</p>

            <dl className="mt-8 grid grid-cols-[7rem_1fr] gap-y-2 border-t border-rule pt-6 text-[0.9375rem]">
              <dt className="text-stone">Paper</dt>
              <dd>{p.paperType}</dd>
              <dt className="text-stone">Weight</dt>
              <dd>{p.paperWeightGsm} GSM</dd>
              <dt className="text-stone">Edition</dt>
              <dd>{edition}</dd>
              <dt className="text-stone">Inks</dt>
              <dd>Archival pigment</dd>
            </dl>

            <div className="mt-8">
              <PrintPurchase
                title={a.title}
                variants={p.variants.map((v) => ({
                  id: v.id,
                  sizeLabel: v.sizeLabel,
                  widthCm: v.widthCm,
                  heightCm: v.heightCm,
                  price: v.price,
                  currency: v.currency,
                  stock: v.stock,
                }))}
              />
            </div>

            {(p.description || a.description) && (
              <div className="prose-gallery mt-10 border-t border-rule pt-8">
                {(p.description || a.description).split(/\n+/).map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-24 grid gap-8 border-t border-graphite pt-10 md:grid-cols-12">
        <h2 className="display text-[2rem] md:col-span-4 md:text-[2.5rem]">About MedePaints prints</h2>
        <div className="md:col-span-7 md:col-start-6">
          <div className="prose-gallery">
            <p>
              Every print is a reproduction of an original MedePaints painting, photographed from the canvas and printed on{" "}
              {p.paperWeightGsm} GSM {p.paperType.toLowerCase()}. It is not a hand-painted work.
            </p>
            {settings.printsInfo.split(/\n+/).map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4 text-[0.9375rem]">
            {a.price !== null ? (
              <Link href={`/artwork/${a.slug}`} className="link">
                See the original painting
              </Link>
            ) : (
              <span className="text-stone">The original painting is in the artist&apos;s private collection.</span>
            )}
            {a.price !== null && <StatusMark status={a.status} />}
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionBySlug, primaryImage } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";
import { StatusMark } from "@/components/site/status-mark";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) return { title: "Collection not found" };
  const cover = c.works.find((w) => w.id === c.coverArtworkId) ?? c.works[0];
  const img = cover ? primaryImage(cover) : null;
  return {
    title: `${c.title}, a collection`,
    description: c.description.slice(0, 160) || `${c.works.length} paintings by MedePaints in the ${c.title} collection.`,
    openGraph: img ? { images: [{ url: img.url }] } : undefined,
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCollectionBySlug(slug);
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="border-b border-rule pb-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-[0.875rem] text-stone">
          <Link href="/collections" className="hover:text-graphite">Collections</Link>
          <span aria-hidden> / </span>
          <span className="text-graphite">{c.title}</span>
        </nav>
        <h1 className="display text-[3rem] md:text-[5rem]">{c.title}</h1>
        {c.description && (
          <div className="prose-gallery mt-3 max-w-2xl text-stone">
            {c.description.split(/\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        <p className="mt-3 text-[0.875rem] text-stone">
          {c.works.length} painting{c.works.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Same salon hang as the gallery. */}
      <ul className="columns-1 gap-10 pt-12 sm:columns-2 lg:columns-3">
        {c.works.map((w, i) => (
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
      {c.works.length === 0 && <p className="py-20 text-stone">No paintings in this collection yet.</p>}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { listCollections } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";

export const metadata: Metadata = {
  title: "Collections",
  description: "MedePaints paintings grouped into collections and series.",
};

export default async function CollectionsPage() {
  const collections = await listCollections();
  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="border-b border-rule pb-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-[0.875rem] text-stone">
          <Link href="/gallery" className="hover:text-graphite">Gallery</Link>
          <span aria-hidden> / </span>
          <span className="text-graphite">Collections</span>
        </nav>
        <h1 className="display text-[3rem] md:text-[5rem]">Collections</h1>
        <p className="mt-3 max-w-xl text-stone">Paintings grouped by series and theme.</p>
      </div>

      <ul className="grid gap-x-10 gap-y-16 pt-12 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c, i) => (
          <li key={c.id}>
            <Link href={`/collections/${c.slug}`} className="group block">
              <ArtImage
                image={c.cover}
                title={c.title}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                priority={i < 3}
                box="aspect-[4/5]"
              />
              <div className="mt-4">
                <p className="display text-[1.75rem] leading-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{c.title}</p>
                <p className="text-[0.875rem] text-stone">
                  {c.count} painting{c.count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {collections.length === 0 && <p className="py-20 text-stone">No collections to show yet.</p>}
    </div>
  );
}

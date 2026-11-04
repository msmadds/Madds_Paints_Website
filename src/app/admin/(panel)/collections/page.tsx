import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { SubmitButton } from "@/components/admin/buttons";
import { Checkbox, Flash, Input, PageTitle, Panel, Textarea } from "@/components/admin/ui";
import { createCollection } from "../../actions";

export const metadata = { title: "Collections" };

export default async function CollectionsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = await db.query.collections.findMany({
    orderBy: [asc(schema.collections.sortOrder), asc(schema.collections.title)],
    with: {
      artworks: {
        orderBy: [asc(schema.artworkCollections.sortOrder)],
        with: { artwork: { with: { images: { orderBy: [asc(schema.artworkImages.sortOrder)], limit: 1 } } } },
      },
    },
  });
  return (
    <div className="max-w-5xl">
      <PageTitle
        actions={
          <Link href="/collections" target="_blank" className="link text-[0.9375rem]">
            View the Collections page
          </Link>
        }
      >
        Collections
      </PageTitle>
      <Flash {...sp} />
      <p className="mb-6 max-w-2xl text-[0.9375rem] text-stone">
        Group several paintings into a named collection, such as a series. Each collection gets its own page on the website. A
        painting can belong to more than one collection.
      </p>

      {rows.length > 0 && (
        <ul className="mb-8 divide-y divide-rule border border-rule bg-white">
          {rows.map((c) => {
            const works = c.artworks.map((l) => l.artwork);
            const cover = (works.find((a) => a.id === c.coverArtworkId) ?? works[0])?.images[0];
            return (
              <li key={c.id}>
                <Link href={`/admin/collections/${c.id}`} className="flex items-center gap-4 p-3 hover:bg-wall">
                  <span className="flex size-14 shrink-0 items-center justify-center bg-plinth">
                    {cover && <Image src={cover.url} alt="" width={56} height={56} className="max-h-14 w-auto" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.0625rem] font-medium">{c.title}</span>
                    <span className="text-[0.8125rem] text-stone">
                      {works.length} painting{works.length === 1 ? "" : "s"}
                      {!c.published && ", hidden"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <form action={createCollection}>
        <Panel title="New collection" description="After creating it you can tick the paintings that belong to it.">
          <div className="grid gap-5 md:grid-cols-6">
            <Input label="Name" name="title" required placeholder="Zanzibar Series" className="md:col-span-4" />
            <Input label="Sort order" name="sortOrder" inputMode="numeric" defaultValue={rows.length} hint="Lower shows first." className="md:col-span-2" />
            <Textarea label="Description (optional)" name="description" rows={3} className="md:col-span-6" />
            <div className="md:col-span-6">
              <Checkbox label="Published" name="published" defaultChecked hint="Untick to prepare a collection before showing it." />
            </div>
          </div>
          <div className="mt-6"><SubmitButton>Create collection</SubmitButton></div>
        </Panel>
      </form>
    </div>
  );
}

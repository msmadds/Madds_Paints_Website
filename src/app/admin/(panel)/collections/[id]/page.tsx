import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SubmitButton } from "@/components/admin/buttons";
import { Checkbox, Flash, Input, PageTitle, Panel, Select, Textarea } from "@/components/admin/ui";
import { deleteCollection, updateCollection } from "../../../actions";

export const metadata = { title: "Edit collection" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditCollection({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [c, all] = await Promise.all([
    db.query.collections.findFirst({
      where: eq(schema.collections.id, id),
      with: { artworks: { orderBy: [asc(schema.artworkCollections.sortOrder), asc(schema.artworkCollections.createdAt)] } },
    }),
    db.query.artworks.findMany({
      orderBy: [asc(schema.artworks.sortOrder), desc(schema.artworks.createdAt)],
      with: { images: { orderBy: [asc(schema.artworkImages.sortOrder)], limit: 1 } },
    }),
  ]);
  if (!c) notFound();

  // Works already in the collection first, in their current order; then everything else.
  const inIds = c.artworks.map((l) => l.artworkId);
  const chosen = new Set(inIds);
  const rows = [
    ...inIds.map((aid) => all.find((a) => a.id === aid)).filter((a): a is (typeof all)[number] => Boolean(a)),
    ...all.filter((a) => !chosen.has(a.id)),
  ];
  const members = rows.filter((a) => chosen.has(a.id));

  return (
    <div className="max-w-5xl">
      <Link href="/admin/collections" className="text-[0.875rem] text-stone hover:text-graphite">Collections</Link>
      <PageTitle
        actions={
          c.published ? (
            <Link href={`/collections/${c.slug}`} target="_blank" className="link text-[0.875rem]">View collection page</Link>
          ) : undefined
        }
      >
        {c.title}
      </PageTitle>
      <Flash {...sp} />

      <div className="grid gap-8">
        <form action={updateCollection} className="grid gap-8">
          <input type="hidden" name="id" value={c.id} />
          <Panel title="Details">
            <div className="grid gap-5 md:grid-cols-6">
              <Input label="Name" name="title" defaultValue={c.title} required className="md:col-span-4" />
              <Input label="Sort order" name="sortOrder" inputMode="numeric" defaultValue={c.sortOrder} hint="Lower shows first." className="md:col-span-2" />
              <Textarea label="Description (optional)" name="description" defaultValue={c.description} rows={4} className="md:col-span-6" hint="Separate paragraphs with a blank line." />
              <Select label="Cover painting" name="coverArtworkId" defaultValue={c.coverArtworkId ?? ""} className="md:col-span-3"
                hint="Its main image represents the collection.">
                <option value="">First painting in the collection</option>
                {members.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </Select>
              <Input label="URL slug" name="slug" defaultValue={c.slug} hint="Leave empty to use the name." className="md:col-span-3" />
              <div className="md:col-span-6">
                <Checkbox label="Published" name="published" defaultChecked={c.published} hint="Untick to hide the collection without deleting it." />
              </div>
            </div>
          </Panel>

          <Panel
            title="Paintings in this collection"
            description={`Tick every painting that belongs here (${chosen.size} selected). Ticked works show on the collection page in the order listed; newly ticked works go to the end.`}
          >
            {rows.length === 0 ? (
              <p className="text-stone">No artworks yet. Add them under Artworks &amp; prints.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((a) => (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center gap-3 border border-rule p-2 has-[:checked]:border-graphite has-[:checked]:bg-plinth">
                      <input type="checkbox" name="artworkIds" value={a.id} defaultChecked={chosen.has(a.id)} className="size-5 shrink-0 accent-graphite" />
                      {a.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/_next/image?url=${encodeURIComponent(a.images[0].url)}&w=128&q=60`} alt="" className="size-14 shrink-0 bg-plinth object-cover" />
                      ) : (
                        <span className="size-14 shrink-0 bg-plinth" />
                      )}
                      <span className="min-w-0 text-[0.875rem] leading-snug">
                        <span className="work-title block truncate text-[1rem]">{a.title}</span>
                        <span className="text-stone">
                          {a.year ?? ""}
                          {!a.published && " · Hidden"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <div><SubmitButton>Save collection</SubmitButton></div>
        </form>

        <Panel title="Delete collection" description="Removes the collection and its page. The paintings stay on the website.">
          <form action={deleteCollection}>
            <input type="hidden" name="id" value={c.id} />
            <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete the collection “${c.title}”?`}>Delete collection</SubmitButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}

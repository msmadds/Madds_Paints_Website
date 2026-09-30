import Image from "next/image";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ARTWORK_STATUS_LABELS, formatMoney } from "@/lib/format";
import { Flash, PageTitle, Pill } from "@/components/admin/ui";

export const metadata = { title: "Artworks" };

export default async function ArtworksAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = await db.query.artworks.findMany({
    orderBy: [asc(schema.artworks.sortOrder), asc(schema.artworks.createdAt)],
    with: {
      images: { orderBy: (i, { asc }) => [asc(i.sortOrder)], limit: 1 },
      printProduct: { with: { variants: true } },
    },
  });
  return (
    <div className="max-w-6xl">
      <PageTitle actions={<Link href="/admin/artworks/new" className="btn btn-primary">Add artwork</Link>}>Artworks & prints</PageTitle>
      <Flash {...sp} />
      {rows.length === 0 ? (
        <p className="text-stone">No artworks yet. Add your first painting.</p>
      ) : (
        <div className="overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-[44rem] text-left text-[0.9375rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-stone">
              <tr>
                <th className="p-3 font-medium">Artwork</th>
                <th className="p-3 font-medium">Original</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Prints</th>
                <th className="p-3 font-medium">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-wall">
                  <td className="p-3">
                    <Link href={`/admin/artworks/${a.id}`} className="flex items-center gap-3">
                      <span className="flex size-14 shrink-0 items-center justify-center bg-plinth">
                        {a.images[0] && <Image src={a.images[0].url} alt="" width={56} height={56} className="max-h-14 w-auto" />}
                      </span>
                      <span>
                        <span className="work-title block text-[1.0625rem]">{a.title}</span>
                        <span className="text-[0.8125rem] text-stone">{[a.year, a.coaNumber].filter(Boolean).join(", ")}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 tabular-nums">{a.price === null ? <span className="text-stone">Not for sale</span> : formatMoney(a.price, a.currency)}</td>
                  <td className="p-3"><Pill value={a.status}>{ARTWORK_STATUS_LABELS[a.status]}</Pill></td>
                  <td className="p-3 text-[0.875rem]">
                    {a.printProduct ? `${a.printProduct.variants.length} size${a.printProduct.variants.length === 1 ? "" : "s"}${a.printProduct.published ? "" : " (hidden)"}` : <span className="text-stone">None</span>}
                  </td>
                  <td className="p-3 text-[0.875rem]">{a.published ? "Published" : <span className="text-stone">Hidden</span>}{a.featured && ", featured"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

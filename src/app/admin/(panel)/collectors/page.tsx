import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { SubmitButton } from "@/components/admin/buttons";
import { Flash, PageTitle } from "@/components/admin/ui";
import { removeCollector } from "../../actions";

export const metadata = { title: "Collector List" };

export default async function CollectorsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = await db.query.collectors.findMany({ orderBy: [desc(schema.collectors.consentedAt)] });
  const active = rows.filter((r) => !r.unsubscribedAt).length;
  return (
    <div className="max-w-5xl">
      <PageTitle
        actions={
          <div className="flex gap-2">
            <a href="/api/admin/collectors/export" className="btn btn-primary">Export CSV</a>
            <a href="/api/admin/collectors/export?all=1" className="btn btn-secondary">Export incl. unsubscribed</a>
          </div>
        }
      >
        Collector List
      </PageTitle>
      <Flash {...sp} />
      <p className="mb-6 text-[0.9375rem] text-stone">
        {active} subscribed, {rows.length - active} unsubscribed. Only email people who are subscribed, and include the unsubscribe link from
        the export in every marketing email.
      </p>
      {rows.length === 0 ? (
        <p className="text-stone">No collectors yet. Customers can join by ticking the box at checkout.</p>
      ) : (
        <div className="overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-[40rem] text-left text-[0.875rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-stone">
              <tr>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Joined</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3">{r.name ?? ""}</td>
                  <td className="p-3">{formatDate(r.consentedAt)}</td>
                  <td className="p-3">{r.unsubscribedAt ? <span className="text-stone">Unsubscribed {formatDate(r.unsubscribedAt)}</span> : "Subscribed"}</td>
                  <td className="p-3 text-right">
                    <form action={removeCollector}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="quiet" pendingText="…" confirm={`Permanently remove ${r.email}?`}>Remove</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

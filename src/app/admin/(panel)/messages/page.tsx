import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { whatsappLink } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/buttons";
import { Flash, PageTitle } from "@/components/admin/ui";
import { toggleMessageHandled } from "../../actions";

export const metadata = { title: "Messages" };

export default async function MessagesAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = await db.query.contactMessages.findMany({ orderBy: [desc(schema.contactMessages.createdAt)], limit: 200 });
  return (
    <div className="max-w-4xl">
      <PageTitle>Messages</PageTitle>
      <Flash {...sp} />
      {rows.length === 0 && <p className="text-stone">No messages yet.</p>}
      <ul className="space-y-4">
        {rows.map((m) => {
          const wa = m.phone ? whatsappLink(m.phone) : null;
          return (
            <li key={m.id} className={m.handled ? "border border-rule bg-wall p-5" : "border border-graphite bg-white p-5"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.name}{m.subject ? `: ${m.subject}` : ""}</p>
                  <p className="text-[0.8125rem] text-stone">{formatDate(m.createdAt, true)}</p>
                </div>
                <form action={toggleMessageHandled}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="handled" value={m.handled ? "false" : "true"} />
                  <SubmitButton variant="quiet" pendingText="…">{m.handled ? "Mark as unread" : "Mark as handled"}</SubmitButton>
                </form>
              </div>
              <p className="mt-3 whitespace-pre-line text-[0.9375rem]">{m.message}</p>
              <p className="mt-3 flex flex-wrap gap-4 text-[0.875rem]">
                {m.phone && <a href={`tel:${m.phone}`} className="link">{m.phone}</a>}
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="link">WhatsApp</a>}
                {m.email && <a href={`mailto:${m.email}`} className="link">{m.email}</a>}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

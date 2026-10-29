import Link from "next/link";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/components/admin/buttons";
import { Checkbox, Flash, Input, PageTitle, Panel, Textarea } from "@/components/admin/ui";
import { saveCommissionsAction } from "../../actions";
import { bookedThisMonth, currentMonthName } from "@/lib/commissions";

export const metadata = { title: "Commissions" };

export default async function CommissionsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [s, rows] = await Promise.all([
    getSettings(),
    db.query.artworks.findMany({
      orderBy: [asc(schema.artworks.sortOrder), desc(schema.artworks.createdAt)],
      with: { images: { orderBy: [asc(schema.artworkImages.sortOrder)], limit: 1 } },
    }),
  ]);
  const chosen = new Set(s.commissionArtworkIds);
  return (
    <div className="max-w-5xl">
      <PageTitle
        actions={
          <Link href="/commissions" target="_blank" className="link text-[0.9375rem]">
            View the Commissions page
          </Link>
        }
      >
        Commissions
      </PageTitle>
      <Flash {...sp} />
      <form action={saveCommissionsAction} className="space-y-6">
        <Panel
          title="Status"
          description={s.commissionsOpen ? "You are currently open for commissions." : "Commissions are currently closed."}
        >
          <div className="grid gap-5">
            <Checkbox
              label="Open for commissions"
              name="commissionsOpen"
              defaultChecked={s.commissionsOpen}
              hint="When on, the Commissions page shows an enquiry form. When off, it says commissions are closed and invites visitors to join the Collector List instead."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Commission places per month"
                name="commissionsCapacity"
                type="number"
                min={0}
                max={20}
                defaultValue={s.commissionsCapacity}
                hint="Shown as a bar on the Commissions page. 0 hides the bar."
              />
              <Input
                label={`Booked for ${currentMonthName()}`}
                name="commissionsBooked"
                type="number"
                min={0}
                max={20}
                defaultValue={bookedThisMonth(s)}
                hint="Each one fills a segment. Resets to 0 automatically on the 1st of next month."
              />
            </div>
            <Input
              label="Note while closed (optional)"
              name="commissionsClosedNote"
              defaultValue={s.commissionsClosedNote}
              maxLength={400}
              placeholder="e.g. Commissions reopen in January."
            />
          </div>
        </Panel>

        <Panel title="Page text">
          <div className="grid gap-5">
            <Textarea label="Introduction" name="commissionsIntro" defaultValue={s.commissionsIntro} rows={5} hint="Separate paragraphs with a blank line." />
            <Textarea
              label="How it works"
              name="commissionsProcess"
              defaultValue={s.commissionsProcess}
              rows={6}
              hint="One step per line, written as: Title — description"
            />
          </div>
        </Panel>

        <Panel
          title="Past commissions"
          description={`Tick the works to show under “Past commissions” (${chosen.size} selected). Works hidden from the gallery can still be shown here.`}
        >
          {rows.length === 0 ? (
            <p className="text-stone">No artworks yet. Add them under Artworks &amp; prints.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-center gap-3 border border-rule p-2 has-[:checked]:border-graphite has-[:checked]:bg-plinth">
                    <input type="checkbox" name="commissionArtworkIds" value={a.id} defaultChecked={chosen.has(a.id)} className="size-5 shrink-0 accent-graphite" />
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
                        {!a.published && " · Not in gallery"}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex justify-end">
          <SubmitButton>Save commissions</SubmitButton>
        </div>
      </form>
    </div>
  );
}

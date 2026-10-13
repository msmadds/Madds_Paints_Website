import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emailConfigured } from "@/lib/email";
import { subscribedCollectors } from "@/lib/collector-mail";
import { PageTitle } from "@/components/admin/ui";
import { CampaignComposer, type PickerArtwork } from "@/components/admin/campaign-composer";

export const metadata = { title: "Email collectors" };

export default async function EmailCollectorsPage() {
  await requireAdmin();
  const [settings, people, rows] = await Promise.all([
    getSettings(),
    subscribedCollectors(),
    db.query.artworks.findMany({
      where: (a, { eq }) => eq(a.published, true),
      orderBy: [desc(schema.artworks.createdAt)],
      with: {
        images: { orderBy: [asc(schema.artworkImages.sortOrder)], limit: 1 },
        printProduct: { columns: { published: true } },
      },
    }),
  ]);
  const artworks: PickerArtwork[] = rows.map((a) => ({
    id: a.id,
    title: a.title,
    year: a.year,
    status: a.status,
    thumb: a.images[0] ? `/_next/image?url=${encodeURIComponent(a.images[0].url)}&w=128&q=60` : null,
    hasPrints: Boolean(a.printProduct?.published),
  }));
  return (
    <div className="max-w-5xl">
      <PageTitle>Email collectors</PageTitle>
      <p className="mb-6 text-[0.9375rem] text-stone">
        Write to everyone on the Collector List: {people.length} subscribed. Every email includes their own unsubscribe link.
      </p>
      <CampaignComposer artworks={artworks} recipients={people.length} emailReady={emailConfigured(settings)} />
    </div>
  );
}

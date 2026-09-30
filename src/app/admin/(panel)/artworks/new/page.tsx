import Link from "next/link";
import { ArtworkFields } from "@/components/admin/artwork-fields";
import { SubmitButton } from "@/components/admin/buttons";
import { Flash, PageTitle, Panel } from "@/components/admin/ui";
import { createArtwork } from "../../../actions";

export const metadata = { title: "Add artwork" };

export default async function NewArtwork({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="max-w-4xl">
      <Link href="/admin/artworks" className="text-[0.875rem] text-stone hover:text-graphite">Artworks</Link>
      <PageTitle>Add artwork</PageTitle>
      <Flash {...sp} />
      <form action={createArtwork}>
        <Panel description="You can upload images and add print sizes after saving.">
          <ArtworkFields />
        </Panel>
        <div className="mt-6"><SubmitButton>Create artwork</SubmitButton></div>
      </form>
    </div>
  );
}

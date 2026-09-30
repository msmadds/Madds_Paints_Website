import type { Artwork } from "@/db/schema";
import { Checkbox, Input, Select, Textarea } from "./ui";

export function ArtworkFields({ a }: { a?: Artwork }) {
  return (
    <div className="grid gap-5 md:grid-cols-6">
      <Input label="Title" name="title" defaultValue={a?.title} required className="md:col-span-4" />
      <Input label="Year" name="year" inputMode="numeric" defaultValue={a?.year ?? new Date().getFullYear()} className="md:col-span-2" />
      <Input label="Medium" name="medium" defaultValue={a?.medium} placeholder="Acrylic on canvas" className="md:col-span-4" />
      <Input label="Artist" name="artistName" defaultValue={a?.artistName ?? "MedePaints"} className="md:col-span-2" />
      <Input label="Height (cm)" name="heightCm" inputMode="decimal" defaultValue={a?.heightCm ?? ""} className="md:col-span-2" />
      <Input label="Width (cm)" name="widthCm" inputMode="decimal" defaultValue={a?.widthCm ?? ""} className="md:col-span-2" />
      <Input label="Depth (cm, optional)" name="depthCm" inputMode="decimal" defaultValue={a?.depthCm ?? ""} className="md:col-span-2" />
      <Input
        label="Price of the original (TZS)"
        name="price"
        inputMode="numeric"
        defaultValue={a?.price ?? ""}
        hint="Whole shillings, e.g. 2400000. Leave empty if the original is not for sale."
        className="md:col-span-3"
      />
      <Select label="Availability" name="status" defaultValue={a?.status ?? "available"} className="md:col-span-3"
        hint="Originals are always a single piece. Orders reserve and sell them automatically.">
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
        <option value="sold">Sold</option>
      </Select>
      <Textarea label="Description" name="description" defaultValue={a?.description} rows={6} className="md:col-span-6" />
      <div className="grid gap-4 md:col-span-3">
        <Checkbox label="Certificate of Authenticity included" name="coaIncluded" defaultChecked={a?.coaIncluded ?? true} />
        <Checkbox label="Featured on the homepage" name="featured" defaultChecked={a?.featured ?? false} />
        <Checkbox label="Published" hint="Untick to hide from the website without deleting." name="published" defaultChecked={a?.published ?? true} />
      </div>
      <div className="grid gap-5 md:col-span-3">
        <Input label="Certificate number" name="coaNumber" defaultValue={a?.coaNumber ?? ""} placeholder="MP-COA-2026-001" hint="Kept on the record and on the order. Not shown publicly." />
        <div className="grid grid-cols-2 gap-4">
          <Input label="URL slug" name="slug" defaultValue={a?.slug ?? ""} hint="Leave empty to use the title." />
          <Input label="Sort order" name="sortOrder" inputMode="numeric" defaultValue={a?.sortOrder ?? 0} hint="Lower shows first." />
        </div>
      </div>
    </div>
  );
}

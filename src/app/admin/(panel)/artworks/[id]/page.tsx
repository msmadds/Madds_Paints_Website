import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, formatMoney } from "@/lib/format";
import { ArtworkFields } from "@/components/admin/artwork-fields";
import { SubmitButton } from "@/components/admin/buttons";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Checkbox, Flash, Input, PageTitle, Panel, Select, Textarea } from "@/components/admin/ui";
import {
  addPrintVariant,
  addStandardSizes,
  deleteArtwork,
  deleteArtworkImage,
  deletePrintVariant,
  makeMainImage,
  savePrintProduct,
  updateArtwork,
  updateImageAlt,
  updatePrintVariant,
} from "../../../actions";

export const metadata = { title: "Edit artwork" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditArtwork({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await db.query.artworks.findFirst({
    where: eq(schema.artworks.id, id),
    with: {
      images: { orderBy: [asc(schema.artworkImages.sortOrder)] },
      printProduct: { with: { variants: { orderBy: [asc(schema.printVariants.sortOrder), asc(schema.printVariants.price)] } } },
    },
  });
  if (!a) notFound();
  const holdOrder = a.holdOrderId ? await db.query.orders.findFirst({ where: eq(schema.orders.id, a.holdOrderId) }) : null;
  const soldOrder = a.soldOrderId ? await db.query.orders.findFirst({ where: eq(schema.orders.id, a.soldOrderId) }) : null;
  const p = a.printProduct;
  const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/artworks" className="text-[0.875rem] text-stone hover:text-graphite">Artworks</Link>
      <PageTitle
        actions={
          <div className="flex gap-3 text-[0.875rem]">
            <Link href={`/artwork/${a.slug}`} target="_blank" className="link">View original page</Link>
            {p && <Link href={`/prints/${a.slug}`} target="_blank" className="link">View print page</Link>}
          </div>
        }
      >
        <span className="work-title">{a.title}</span>
      </PageTitle>
      <Flash {...sp} />

      {holdOrder && (
        <div className="mb-6 border border-rule bg-white px-4 py-3 text-[0.9375rem]">
          Held by order <Link className="link font-semibold" href={`/admin/orders/${holdOrder.id}`}>{holdOrder.orderNumber}</Link>
          {holdOrder.holdExpiresAt ? `, until ${formatDate(holdOrder.holdExpiresAt, true)}` : ", awaiting payment verification"}.
        </div>
      )}
      {soldOrder && (
        <div className="mb-6 border border-rule bg-white px-4 py-3 text-[0.9375rem]">
          Sold through order <Link className="link font-semibold" href={`/admin/orders/${soldOrder.id}`}>{soldOrder.orderNumber}</Link> to{" "}
          {soldOrder.customerName} on {formatDate(a.soldAt)}. Certificate {a.coaNumber ?? "number not set"}.
        </div>
      )}

      <div className="grid gap-8">
        <form action={updateArtwork}>
          <input type="hidden" name="id" value={a.id} />
          <Panel title="Original painting">
            <ArtworkFields a={a} />
            <div className="mt-6"><SubmitButton>Save artwork</SubmitButton></div>
          </Panel>
        </form>

        <Panel title="Images" description="The first image is the main image in the shop and gallery.">
          {a.images.length > 0 && (
            <ul className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {a.images.map((img, i) => (
                <li key={img.id} className="border border-rule p-3">
                  <div className="flex aspect-square items-center justify-center bg-plinth">
                    <Image src={img.url} alt={img.alt} width={img.width ?? 600} height={img.height ?? 600} sizes="300px" className="max-h-full w-auto" />
                  </div>
                  <p className="mt-2 text-[0.8125rem] text-stone">{i === 0 ? "Main image" : `Image ${i + 1}`}{img.width ? `, ${img.width} × ${img.height}px` : ""}</p>
                  <form action={updateImageAlt} className="mt-2 flex gap-2">
                    <input type="hidden" name="artworkId" value={a.id} />
                    <input type="hidden" name="imageId" value={img.id} />
                    <input name="alt" defaultValue={img.alt} aria-label="Image description" className="field min-h-10 py-1.5 text-[0.875rem]" />
                    <SubmitButton variant="quiet" pendingText="…">Save</SubmitButton>
                  </form>
                  <div className="mt-1 flex gap-2">
                    {i > 0 && (
                      <form action={makeMainImage}>
                        <input type="hidden" name="artworkId" value={a.id} />
                        <input type="hidden" name="imageId" value={img.id} />
                        <SubmitButton variant="quiet" pendingText="…">Make main</SubmitButton>
                      </form>
                    )}
                    <form action={deleteArtworkImage}>
                      <input type="hidden" name="artworkId" value={a.id} />
                      <input type="hidden" name="imageId" value={img.id} />
                      <SubmitButton variant="quiet" pendingText="…" confirm="Remove this image?">Remove</SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ImageUploader artworkId={a.id} title={a.title} blobEnabled={blobEnabled} />
        </Panel>

        <Panel title="Prints" description="Prints stay on sale even after the original is sold.">
          <form action={savePrintProduct} className="grid gap-5 md:grid-cols-6">
            <input type="hidden" name="artworkId" value={a.id} />
            <Input label="Paper type" name="paperType" defaultValue={p?.paperType ?? "Matte fine art paper"} className="md:col-span-3" />
            <Input label="Paper weight (GSM)" name="paperWeightGsm" inputMode="numeric" defaultValue={p?.paperWeightGsm ?? 300} className="md:col-span-1" />
            <Select label="Edition" name="editionType" defaultValue={p?.editionType ?? "open"} className="md:col-span-1">
              <option value="open">Open edition</option>
              <option value="limited">Limited edition</option>
            </Select>
            <Input label="Edition size" name="editionSize" inputMode="numeric" defaultValue={p?.editionSize ?? ""} hint="Limited only" className="md:col-span-1" />
            <Textarea label="Print description (optional)" id="print-description" name="description" defaultValue={p?.description ?? ""} rows={3} className="md:col-span-6" hint="Leave empty to use the painting's description." />
            <div className="md:col-span-6">
              <Checkbox label="Prints published" name="published" defaultChecked={p?.published ?? true} />
            </div>
            <div className="md:col-span-6"><SubmitButton>{p ? "Save print details" : "Create prints for this painting"}</SubmitButton></div>
          </form>

          {p && (
            <div className="mt-8 border-t border-rule pt-6">
              <h3 className="font-semibold">Sizes and prices</h3>
              <p className="text-[0.8125rem] text-stone">Leave stock empty for unlimited (printed on demand). For limited editions, enter how many are left.</p>
              {p.variants.length === 0 ? (
                <form action={addStandardSizes} className="mt-4 grid items-end gap-4 border border-rule p-4 sm:grid-cols-4">
                  <input type="hidden" name="artworkId" value={a.id} />
                  <Input label="A4 price (TZS)" name="a4" inputMode="numeric" placeholder="45000" />
                  <Input label="A3 price (TZS)" name="a3" inputMode="numeric" placeholder="75000" />
                  <Input label="A2 price (TZS)" name="a2" inputMode="numeric" placeholder="120000" />
                  <SubmitButton variant="secondary">Add A4, A3, A2</SubmitButton>
                </form>
              ) : (
                <ul className="mt-4 space-y-3">
                  {p.variants.map((v) => (
                    <li key={v.id} className="border border-rule p-4">
                      <form action={updatePrintVariant} className="grid items-end gap-3 sm:grid-cols-8">
                        <input type="hidden" name="artworkId" value={a.id} />
                        <input type="hidden" name="variantId" value={v.id} />
                        <Input label="Size" name="sizeLabel" id={`sz-${v.id}`} defaultValue={v.sizeLabel} />
                        <Input label="H (cm)" name="heightCm" id={`h-${v.id}`} defaultValue={v.heightCm ?? ""} inputMode="decimal" />
                        <Input label="W (cm)" name="widthCm" id={`w-${v.id}`} defaultValue={v.widthCm ?? ""} inputMode="decimal" />
                        <Input label="Price (TZS)" name="price" id={`p-${v.id}`} defaultValue={v.price} inputMode="numeric" className="sm:col-span-2" />
                        <Input label="Stock" name="stock" id={`st-${v.id}`} defaultValue={v.stock ?? ""} inputMode="numeric" placeholder="∞" />
                        <Input label="Order" name="sortOrder" id={`so-${v.id}`} defaultValue={v.sortOrder} inputMode="numeric" />
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-[0.875rem]"><input type="checkbox" name="active" defaultChecked={v.active} className="size-4 accent-graphite" /> On sale</label>
                          <SubmitButton variant="secondary" className="min-h-10 px-3" pendingText="…">Save</SubmitButton>
                        </div>
                      </form>
                      <div className="mt-2 flex items-center justify-between text-[0.8125rem] text-stone">
                        <span>{formatMoney(v.price, v.currency)}, {v.stock === null ? "unlimited" : `${v.stock} in stock`}</span>
                        <form action={deletePrintVariant}>
                          <input type="hidden" name="artworkId" value={a.id} />
                          <input type="hidden" name="variantId" value={v.id} />
                          <SubmitButton variant="quiet" pendingText="…" confirm={`Remove size ${v.sizeLabel}?`}>Remove size</SubmitButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form action={addPrintVariant} className="mt-4 grid items-end gap-3 border border-dashed border-stone p-4 sm:grid-cols-8">
                <input type="hidden" name="artworkId" value={a.id} />
                <Input label="New size" name="sizeLabel" id="new-size" placeholder="A1" />
                <Input label="H (cm)" name="heightCm" id="new-h" inputMode="decimal" />
                <Input label="W (cm)" name="widthCm" id="new-w" inputMode="decimal" />
                <Input label="Price (TZS)" name="price" id="new-p" inputMode="numeric" className="sm:col-span-2" />
                <Input label="Stock" name="stock" id="new-st" inputMode="numeric" placeholder="∞" />
                <Input label="Order" name="sortOrder" id="new-so" inputMode="numeric" defaultValue={p.variants.length} />
                <div className="flex flex-col gap-2">
                  <input type="hidden" name="active" value="on" />
                  <SubmitButton variant="secondary" className="min-h-10 px-3" pendingText="…">Add size</SubmitButton>
                </div>
              </form>
            </div>
          )}
        </Panel>

        <Panel title="Delete artwork" description="Deleting removes the artwork and its prints from the website. Past orders keep their details. Sold originals cannot be deleted; hide them instead.">
          <form action={deleteArtwork} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={a.id} />
            <Input label={`Type “${a.title}” to confirm`} name="confirm" autoComplete="off" className="min-w-64 flex-1" />
            <SubmitButton variant="danger" pendingText="Deleting…">Delete artwork</SubmitButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}

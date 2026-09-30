import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtworkBySlug, isOriginalPurchasable, primaryImage, printFromPrice } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatDimensions, formatMoney } from "@/lib/format";
import { ArtworkGallery } from "@/components/shop/artwork-gallery";
import { PurchaseOriginal } from "@/components/shop/purchase-original";
import { StatusMark } from "@/components/site/status-mark";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArtworkBySlug(slug);
  if (!a) return { title: "Artwork not found" };
  const img = primaryImage(a);
  return {
    title: `${a.title}, original painting`,
    description: `${a.title} (${a.year ?? ""}), ${a.medium}. ${a.description.slice(0, 140)}`,
    openGraph: img ? { images: [{ url: img.url }] } : undefined,
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { slug } = await params;
  const [a, settings] = await Promise.all([getArtworkBySlug(slug), getSettings()]);
  if (!a) notFound();

  const purchasable = isOriginalPurchasable(a);
  const dims = formatDimensions(a.widthCm, a.heightCm, a.depthCm);
  const hasPrints = Boolean(a.printProduct?.published && a.printProduct.variants.length);
  const fromPrice = hasPrints ? printFromPrice(a) : null;
  const forSale = a.price !== null;

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-6 pb-28 md:px-10 md:pt-12 lg:pb-0">
      <nav aria-label="Breadcrumb" className="mb-6 text-[0.875rem] text-stone">
        <Link href="/shop/originals" className="hover:text-graphite">
          Originals
        </Link>
        <span aria-hidden> / </span>
        <span className="text-graphite">{a.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <ArtworkGallery images={a.images} title={a.title} sold={a.status === "sold"} />
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <h1 className="work-title text-[2.5rem] leading-[1.05] md:text-[3.25rem]">{a.title}</h1>
            <p className="mt-2 text-stone">{a.artistName}</p>

            <dl className="mt-8 grid grid-cols-[7rem_1fr] gap-y-2 border-t border-rule pt-6 text-[0.9375rem]">
              <dt className="text-stone">Medium</dt>
              <dd>{a.medium}</dd>
              {dims && (
                <>
                  <dt className="text-stone">Dimensions</dt>
                  <dd>{dims} (height × width)</dd>
                </>
              )}
              {a.year && (
                <>
                  <dt className="text-stone">Year</dt>
                  <dd>{a.year}</dd>
                </>
              )}
              <dt className="text-stone">Availability</dt>
              <dd>
                <StatusMark status={a.status} forSale={forSale} showAvailable />
              </dd>
            </dl>

            {forSale && a.status !== "sold" && (
              <p className="mt-6 text-[1.75rem] tabular-nums">{formatMoney(a.price, a.currency)}</p>
            )}

            {a.coaIncluded && (
              <p className="mt-4 flex items-center gap-3 text-[0.9375rem]">
                <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <rect x="3" y="2.5" width="14" height="15" />
                  <path d="M6.5 7h7M6.5 10h7M6.5 13h4" />
                </svg>
                Certificate of Authenticity included
              </p>
            )}

            <div className="mt-8 hidden lg:block">
              {purchasable ? (
                <PurchaseOriginal artworkId={a.id} label="Purchase Original" />
              ) : (
                <UnavailableNote status={a.status} forSale={forSale} hasPrints={hasPrints} slug={a.slug} />
              )}
            </div>
            <div className="mt-8 lg:hidden">
              {!purchasable && <UnavailableNote status={a.status} forSale={forSale} hasPrints={hasPrints} slug={a.slug} />}
            </div>

            {a.description && (
              <div className="prose-gallery mt-10 border-t border-rule pt-8">
                {a.description.split(/\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            )}

            <details className="mt-6 border-t border-rule py-5">
              <summary className="cursor-pointer text-[0.9375rem] font-semibold">Delivery and payment</summary>
              <div className="mt-3 space-y-3 text-[0.9375rem] text-stone">
                {settings.deliveryInfo.split(/\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <p>
                  Pay via M-Pesa after placing your order. The painting is held for you for {settings.holdHours} hours while you
                  pay. No account needed.
                </p>
              </div>
            </details>

            {hasPrints && (
              <Link href={`/prints/${a.slug}`} className="mt-2 block border border-rule bg-white px-5 py-5 transition-colors hover:border-graphite">
                <p className="font-semibold">Prints of this painting</p>
                <p className="mt-1 text-[0.9375rem] text-stone">
                  300 GSM fine art paper, {a.printProduct!.variants.map((v) => v.sizeLabel).join(", ")}
                  {fromPrice != null && `, from ${formatMoney(fromPrice, a.currency)}`}
                </p>
              </Link>
            )}
          </div>
        </div>
      </div>

      {purchasable && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-wall/95 px-5 py-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-4">
            <p className="shrink-0 text-[1.0625rem] tabular-nums">{formatMoney(a.price, a.currency)}</p>
            <PurchaseOriginal artworkId={a.id} label="Purchase Original" sticky />
          </div>
        </div>
      )}
    </div>
  );
}

function UnavailableNote({ status, forSale, hasPrints, slug }: { status: string; forSale: boolean; hasPrints: boolean; slug: string }) {
  const message = !forSale
    ? "This painting is in the artist's private collection and is not for sale."
    : status === "sold"
      ? "This original has found its home and is no longer available."
      : "This original is reserved for a collector. If the reservation lapses it will become available again.";
  return (
    <div className="border border-rule bg-white px-5 py-5">
      <p className="text-[0.9375rem]">{message}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {hasPrints && (
          <Link href={`/prints/${slug}`} className="btn btn-primary">
            Shop prints of this work
          </Link>
        )}
        <Link href="/contact" className="btn btn-secondary">
          Ask about similar work
        </Link>
      </div>
    </div>
  );
}

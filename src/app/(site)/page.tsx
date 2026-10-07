import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getArtworkBySlug, listFeatured, primaryImage } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";
import { WallLabel } from "@/components/site/wall-label";
import { SoldDot } from "@/components/site/status-mark";
import { cn } from "@/lib/utils";
import { PROMOTION, promotionActive } from "@/lib/promotion";

export default async function HomePage() {
  const settings = await getSettings();
  const featured = await listFeatured(6);
  const hero = (settings.heroArtworkSlug && (await getArtworkBySlug(settings.heroArtworkSlug))) || featured[0] || null;
  const works = featured.filter((w) => w.id !== hero?.id).slice(0, 4);
  const paragraphs = settings.aboutShort.split(/\n+/).filter(Boolean);

  return (
    <>
      {/* Hero: one work, hung on the wall, with its label */}
      <section className="mx-auto max-w-[88rem] px-5 pt-8 pb-20 md:px-10 md:pt-14 md:pb-28">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:order-2 lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:py-2">
            <div>
              <h1 className="display text-[3.5rem] sm:text-[5rem] lg:text-[4.75rem] xl:text-[5.75rem] 2xl:text-[6.5rem]">{settings.businessName}</h1>
              <p className="mt-5 max-w-md font-[family-name:var(--font-display)] text-[1.5rem] leading-snug md:text-[1.875rem]">
                {settings.heroStatement}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop/originals" className="btn btn-primary">
                  Shop Originals
                </Link>
                <Link href="/shop/prints" className="btn btn-secondary">
                  Shop Prints
                </Link>
              </div>
            </div>
            {hero && (
              <div className="settle mt-12 hidden border-l border-graphite pl-5 lg:block">
                <WallLabel artwork={hero} />
                <Link href={`/artwork/${hero.slug}`} className="link mt-3 inline-block text-[0.9375rem]">
                  View this painting
                </Link>
              </div>
            )}
          </div>

          {hero && (
            <div className="lg:order-1 lg:col-span-7">
              <Link href={`/artwork/${hero.slug}`} className="relative block">
                <div className="unveil">
                  <ArtImage image={primaryImage(hero)} title={hero.title} sizes="(min-width: 1024px) 58vw, 100vw" priority />
                </div>
                {hero.status === "sold" && <SoldDot />}
              </Link>
              <div className="mt-5 lg:hidden">
                <WallLabel artwork={hero} />
              </div>
            </div>
          )}
        </div>
      </section>

      {promotionActive() && (
        <section className="border-t border-rule bg-plinth">
          <div className="mx-auto max-w-[88rem] px-5 py-14 md:px-10 md:py-20">
            <p className="text-[0.875rem] uppercase tracking-[0.12em] text-stone">{PROMOTION.name}</p>
            <h2 className="display mt-3 max-w-3xl text-[2.25rem] md:text-[3rem]">Thank you to everyone who collects, shares and supports this work.</h2>
            <p className="mt-5 max-w-2xl text-[1.0625rem]">
              Every painting that leaves the studio goes to someone who chose it, and every message, visit and share keeps the studio going.
              To say thank you, all original paintings are {PROMOTION.percent}% off until Sunday 11 October. The discount is applied
              automatically at checkout.
            </p>
            <Link href="/shop/originals" className="btn btn-primary mt-8">
              Shop originals
            </Link>
          </div>
        </section>
      )}

      {/* The two ways to collect */}
      <section className="border-y border-rule">
        <div className="mx-auto grid max-w-[88rem] md:grid-cols-2">
          <Link href="/shop/originals" className="group border-b border-rule px-5 py-14 md:border-r md:border-b-0 md:px-10 md:py-20">
            <p className="display text-[2.25rem] md:text-[3rem]">Original paintings for collectors.</p>
            <p className="mt-4 max-w-md text-stone">
              One of one, signed, and accompanied by a Certificate of Authenticity.
            </p>
            <span className="mt-6 inline-block text-[0.9375rem] underline decoration-1 underline-offset-4 group-hover:decoration-2">
              Browse originals
            </span>
          </Link>
          <Link href="/shop/prints" className="group px-5 py-14 md:px-10 md:py-20">
            <p className="display text-[2.25rem] md:text-[3rem]">Fine art prints for everyone.</p>
            <p className="mt-4 max-w-md text-stone">
              Archival reproductions of the paintings on 300 GSM art paper, in A4, A3 and A2.
            </p>
            <span className="mt-6 inline-block text-[0.9375rem] underline decoration-1 underline-offset-4 group-hover:decoration-2">
              Browse prints
            </span>
          </Link>
        </div>
      </section>

      {/* Featured works, hung in a loose two-column arrangement */}
      {works.length > 0 && (
        <section className="mx-auto max-w-[88rem] px-5 pt-24 md:px-10 md:pt-32">
          <div className="flex items-end justify-between gap-6">
            <h2 className="display text-[2.5rem] md:text-[3.5rem]">Selected works</h2>
            <Link href="/gallery" className="link hidden text-[0.9375rem] sm:inline">
              See the full gallery
            </Link>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-20 md:grid-cols-12">
            {works.map((w, i) => (
              <article
                key={w.id}
                className={cn(
                  "md:col-span-6",
                  i % 2 === 1 && "md:col-span-5 md:col-start-8 md:mt-32",
                  i === 2 && "md:col-span-5 md:col-start-2",
                )}
              >
                <Link href={`/artwork/${w.slug}`} className="relative block">
                  <ArtImage image={primaryImage(w)} title={w.title} sizes="(min-width: 768px) 45vw, 100vw" />
                  {w.status === "sold" && <SoldDot />}
                </Link>
                <div className="mt-5">
                  <WallLabel artwork={w} mode={w.price === null ? "gallery" : "original"} />
                </div>
              </article>
            ))}
          </div>
          <Link href="/gallery" className="link mt-16 inline-block text-[0.9375rem] sm:hidden">
            See the full gallery
          </Link>
        </section>
      )}

      {/* About the artist */}
      <section className="mx-auto mt-32 grid max-w-[88rem] gap-8 px-5 md:grid-cols-12 md:px-10">
        <h2 className="display text-[2.5rem] md:col-span-4 md:text-[3.5rem]">The studio</h2>
        <div className="md:col-span-7 md:col-start-6">
          <div className="prose-gallery">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Link href="/about" className="link text-[0.9375rem]">
            About {settings.artistName}
          </Link>
        </div>
      </section>

      {/* Collector list */}
      <section className="mx-auto mt-32 max-w-[88rem] px-5 md:px-10">
        <div className="grid gap-8 bg-plinth px-6 py-14 md:grid-cols-12 md:px-12 md:py-20">
          <h2 className="display text-[2.25rem] md:col-span-5 md:text-[3rem]">The Collector List</h2>
          <div className="md:col-span-6 md:col-start-7">
            <p className="text-body max-w-xl">
              Collectors hear first when a new original is finished, when a limited print is released, and when there is a
              collector-only preview.
            </p>
            <p className="mt-4 max-w-xl text-stone">
              Joining is optional. When you check out, tick “Join the MedePaints Collector List” and add your email. You never
              need an account to buy, and you can unsubscribe from any email in one click.
            </p>
          </div>
        </div>
      </section>

      {/* Instagram */}
      {settings.instagramUrl && (
        <section className="mx-auto mt-32 max-w-[88rem] px-5 md:px-10">
          <div className="flex flex-col gap-4 border-t border-graphite pt-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[1.0625rem] font-semibold">Work in progress, every week</h2>
              <p className="mt-2 max-w-md text-stone">Studio process, new paintings before they are released, and where the work is shown.</p>
            </div>
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="display text-[2.5rem] underline decoration-1 underline-offset-8 hover:decoration-2 md:text-[4rem]"
            >
              {settings.instagramHandle}
            </a>
          </div>
        </section>
      )}
    </>
  );
}

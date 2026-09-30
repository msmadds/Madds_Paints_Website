import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { listFeatured, primaryImage } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";

export const metadata: Metadata = { title: "About", description: "About MedePaints and the artist." };

function Paras({ text }: { text: string }) {
  return (
    <div className="prose-gallery">
      {text.split(/\n+/).filter(Boolean).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export default async function AboutPage() {
  const [s, featured] = await Promise.all([getSettings(), listFeatured(2)]);
  const sections = [
    { title: "Artistic approach", text: s.artisticApproach },
    { title: "Original works", text: s.originalsInfo },
    { title: "Prints", text: s.printsInfo },
    { title: "On collecting", text: s.collectorPhilosophy },
  ];
  const detail = featured[1] ?? featured[0];

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h1 className="display text-[3rem] md:text-[5rem]">About {s.businessName}</h1>
          <div className="mt-10">
            <Paras text={s.aboutBio} />
          </div>
        </div>
        {detail && (
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-24">
            <ArtImage image={primaryImage(detail)} title={detail.title} sizes="(min-width: 1024px) 40vw, 100vw" />
            <p className="mt-4 text-[0.875rem] text-stone">
              <span className="work-title text-graphite">{detail.title}</span>, {detail.year}. {detail.medium}.
            </p>
          </div>
        )}
      </div>

      <div className="mt-24 divide-y divide-rule border-t border-graphite">
        {sections.map((sec) => (
          <section key={sec.title} className="grid gap-6 py-12 md:grid-cols-12">
            <h2 className="display text-[2rem] md:col-span-4 md:text-[2.5rem]">{sec.title}</h2>
            <div className="md:col-span-7 md:col-start-6">
              <Paras text={sec.text} />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/shop/originals" className="btn btn-primary">Shop Originals</Link>
        <Link href="/shop/prints" className="btn btn-secondary">Shop Prints</Link>
      </div>
    </div>
  );
}

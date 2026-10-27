import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { listCommissionWorks, primaryImage } from "@/lib/catalog";
import { ArtImage } from "@/components/site/art-image";
import { CollectorSignup } from "@/components/site/collector-signup";
import { ContactForm } from "../contact/contact-form";

export const metadata: Metadata = {
  title: "Commissions",
  description: "Commission an original painting from MedePaints, made for your space.",
};

export default async function CommissionsPage() {
  const s = await getSettings();
  const works = await listCommissionWorks(s.commissionArtworkIds);
  const intro = s.commissionsIntro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const steps = s.commissionsProcess
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split(/\s+[—–-]\s+/);
      return { title, body: rest.join(" — ") };
    });

  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="grid gap-10 border-b border-rule pb-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="display text-[3rem] md:text-[5rem]">Commissions</h1>
          <p className="mt-6 inline-flex items-center gap-2 text-[0.9375rem]">
            {s.commissionsOpen ? (
              <>
                <span aria-hidden className="inline-block size-2.5 rounded-full bg-verdigris" />
                <span className="font-semibold text-verdigris">Open for commissions</span>
              </>
            ) : (
              <>
                <span aria-hidden className="inline-block size-2.5 rounded-full border border-stone" />
                <span className="font-semibold text-stone">Commissions are closed</span>
              </>
            )}
          </p>
          {!s.commissionsOpen && s.commissionsClosedNote && <p className="mt-2 text-stone">{s.commissionsClosedNote}</p>}
        </div>
        <div className="prose-gallery lg:col-span-6 lg:col-start-7">
          {intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {s.commissionsOpen && (
            <a href="#enquire" className="btn btn-primary mt-4">
              Start a commission
            </a>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <section className="border-b border-rule py-14">
          <h2 className="display text-[2.25rem] md:text-[3rem]">How it works</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={i}>
                <p className="display text-[2rem] text-stone">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-3 font-semibold">{step.title}</p>
                {step.body && <p className="mt-2 text-stone">{step.body}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {works.length > 0 && (
        <section className="border-b border-rule py-14">
          <h2 className="display text-[2.25rem] md:text-[3rem]">Past commissions</h2>
          <ul className="mt-12 columns-1 gap-10 sm:columns-2 lg:columns-3">
            {works.map((w) => {
              const label = (
                <>
                  <ArtImage image={primaryImage(w)} title={w.title} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
                  <div className="mt-4 text-[0.875rem] leading-snug">
                    <p className="work-title text-[1.125rem]">
                      {w.title}
                      {w.year && <span className="not-italic text-stone">, {w.year}</span>}
                    </p>
                    <p className="text-stone">{w.medium}</p>
                  </div>
                </>
              );
              return (
                <li key={w.id} className="mb-16 break-inside-avoid">
                  {w.published && w.price !== null ? (
                    <Link href={`/artwork/${w.slug}`} className="block">
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section id="enquire" className="scroll-mt-24 py-14">
        {s.commissionsOpen ? (
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="display text-[2.25rem] md:text-[3rem]">Start a commission</h2>
              <p className="mt-4 max-w-md text-stone">
                Tell me about the painting you have in mind. Every enquiry gets a personal reply, usually within two working days.
              </p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <ContactForm
                subject="Commission enquiry"
                messageLabel="Your idea"
                messagePlaceholder="The space, the size you have in mind, colours you love, and any deadline."
                submitLabel="Send enquiry"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-10 bg-plinth px-6 py-12 md:px-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="display text-[2.25rem] md:text-[3rem]">Hear when commissions reopen</h2>
              <p className="mt-4 max-w-md text-stone">
                Join the Collector List and you will be among the first to know when new commission places open.
              </p>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <CollectorSignup id="cl-commissions" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { whatsappLink } from "@/lib/utils";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const s = await getSettings();
  const wa = s.whatsapp ? whatsappLink(s.whatsapp, "Hello MedePaints") : null;
  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="display text-[3rem] md:text-[5rem]">Contact</h1>
          <p className="mt-4 max-w-md text-stone">
            Ask about a painting, arrange a studio visit, or talk about a commission.
          </p>
          <dl className="mt-10 space-y-6 text-[1rem]">
            {s.phone && (
              <div>
                <dt className="text-[0.875rem] text-stone">Phone</dt>
                <dd><a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="link">{s.phone}</a></dd>
              </div>
            )}
            {wa && (
              <div>
                <dt className="text-[0.875rem] text-stone">WhatsApp</dt>
                <dd><a href={wa} target="_blank" rel="noopener noreferrer" className="link">{s.whatsapp}</a></dd>
              </div>
            )}
            {s.contactEmail && (
              <div>
                <dt className="text-[0.875rem] text-stone">Email</dt>
                <dd><a href={`mailto:${s.contactEmail}`} className="link">{s.contactEmail}</a></dd>
              </div>
            )}
            {s.instagramUrl && (
              <div>
                <dt className="text-[0.875rem] text-stone">Instagram</dt>
                <dd><a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="link">{s.instagramHandle}</a></dd>
              </div>
            )}
            <div>
              <dt className="text-[0.875rem] text-stone">Studio</dt>
              <dd>{s.location}</dd>
            </div>
          </dl>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 lg:pt-6">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

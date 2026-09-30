import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { whatsappLink } from "@/lib/utils";

export function Footer({ settings }: { settings: Settings }) {
  const wa = settings.whatsapp ? whatsappLink(settings.whatsapp) : null;
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-rule">
      <div className="mx-auto grid max-w-[88rem] gap-12 px-5 py-16 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="display text-[2.5rem]">{settings.businessName}</p>
          <p className="mt-3 max-w-sm text-stone">{settings.homeIntro}</p>
        </div>
        <nav aria-label="Shop" className="grid gap-2 text-[0.9375rem] md:col-span-2">
          <Link href="/shop/originals">Originals</Link>
          <Link href="/shop/prints">Prints</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/about">About</Link>
        </nav>
        <div className="grid content-start gap-2 text-[0.9375rem] md:col-span-3">
          <Link href="/contact">Contact</Link>
          {settings.instagramUrl && (
            <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
              Instagram {settings.instagramHandle}
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          )}
          <Link href="/order/lookup">Find my order</Link>
        </div>
        <div className="text-[0.875rem] text-stone md:col-span-2">
          <p>{settings.location}</p>
          <p className="mt-2">Prices in {settings.currency}. Pay via M-Pesa.</p>
        </div>
      </div>
      <div className="mx-auto max-w-[88rem] px-5 pb-10 text-[0.8125rem] text-stone md:px-10">
        © {year} {settings.businessName}. All artworks and images are the property of the artist.
      </div>
    </footer>
  );
}

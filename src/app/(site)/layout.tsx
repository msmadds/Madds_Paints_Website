import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import { CartProvider } from "@/components/shop/cart-context";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSettings } from "@/lib/settings";
import { PROMOTION, promotionActive } from "@/lib/promotion";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-wall focus:p-3">
        Skip to content
      </a>
      {promotionActive() && (
        <Link href="/shop/originals" className="block bg-graphite px-5 py-2.5 text-center text-[0.875rem] text-wall hover:underline">
          {PROMOTION.name}: {PROMOTION.percent}% off all original paintings until Sunday 11 October. Thank you for collecting with us.
        </Link>
      )}
      <Header name={settings.businessName} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <Analytics />
    </CartProvider>
  );
}

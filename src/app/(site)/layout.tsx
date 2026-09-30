import { CartProvider } from "@/components/shop/cart-context";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-wall focus:p-3">
        Skip to content
      </a>
      <Header name={settings.businessName} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
    </CartProvider>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "MedePaints — Original paintings for sale in Dar es Salaam, Tanzania", template: "%s — MedePaints" },
  description: "Original paintings and fine art prints by a painter in Dar es Salaam, Tanzania. Buy art for your home online, pay with M-Pesa, or commission a painting.",
  openGraph: { type: "website", siteName: "MedePaints" },
  // Proves ownership of medepaints.com in Google Search Console.
  verification: { google: "GyVMIdKGhF8ZrBHtYJg7w96oqND_n8n4xSfwUM_iAZc" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

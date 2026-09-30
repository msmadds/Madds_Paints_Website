import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s — MedePaints admin" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-wall">{children}</div>;
}

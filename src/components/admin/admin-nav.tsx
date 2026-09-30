"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/artworks", label: "Artworks & prints" },
  { href: "/admin/collectors", label: "Collector List" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/delivery", label: "Delivery fees" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ email, logout }: { email: string; logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));
  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-rule bg-white px-4 lg:hidden">
        <Link href="/admin" className="display text-[1.375rem]">MedePaints admin</Link>
        <button type="button" className="h-11 px-3" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <aside className={cn("border-r border-rule bg-white lg:block lg:min-h-dvh lg:w-64", open ? "block" : "hidden")}>
        <div className="hidden px-6 pt-7 pb-6 lg:block">
          <Link href="/admin" className="display text-[1.5rem]">MedePaints</Link>
          <p className="text-[0.8125rem] text-stone">Admin</p>
        </div>
        <nav className="flex flex-col px-3 pb-4" onClick={() => setOpen(false)}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("rounded-sm px-3 py-2.5 text-[0.9375rem]", isActive(l.href) ? "bg-plinth font-semibold" : "hover:bg-wall")}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="mt-4 px-3 py-2 text-[0.875rem] text-stone hover:text-graphite">
            View website
          </Link>
        </nav>
        <div className="border-t border-rule px-6 py-4 text-[0.8125rem] text-stone">
          <p className="truncate">{email}</p>
          <form action={logout}>
            <button type="submit" className="mt-1 underline underline-offset-4 hover:text-graphite">Sign out</button>
          </form>
        </div>
      </aside>
    </>
  );
}

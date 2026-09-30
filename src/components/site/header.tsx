"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/shop/cart-context";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop/originals", label: "Originals" },
  { href: "/shop/prints", label: "Prints" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({ name }: { name: string }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-rule/70 bg-wall/92 backdrop-blur supports-[backdrop-filter]:bg-wall/80">
      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between px-5 md:h-20 md:px-10">
        <Link href="/" className="display text-[1.625rem] leading-none md:text-[1.875rem]" aria-label={`${name} home`}>
          {name}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "text-[0.9375rem] transition-colors hover:text-graphite",
                active(n.href) ? "text-graphite underline decoration-1 underline-offset-[6px]" : "text-stone",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/cart"
            className="flex h-11 items-center gap-2 px-3 text-[0.9375rem]"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          >
            Cart
            <span
              className={cn(
                "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[0.75rem] font-semibold leading-6 tabular-nums",
                ready && count > 0 ? "bg-graphite text-wall" : "bg-plinth text-stone",
              )}
            >
              {ready ? count : 0}
            </span>
          </Link>
          <button
            type="button"
            className="flex h-11 items-center px-3 text-[0.9375rem] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="fade-in fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-wall px-5 pb-10 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col pt-6">
            <Link href="/" className="display border-b border-rule py-4 text-[2.25rem]">
              Home
            </Link>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="display border-b border-rule py-4 text-[2.25rem]">
                {n.label}
              </Link>
            ))}
            <Link href="/order/lookup" className="mt-8 text-stone underline underline-offset-4">
              Find my order
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

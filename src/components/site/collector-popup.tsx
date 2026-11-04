"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CollectorSignup } from "./collector-signup";

type Img = { url: string; width: number | null; height: number | null; alt: string } | null;

const KEY = "mp-collector-popup";
/** After closing the pop-up, wait this long before showing it again. */
const SNOOZE_DAYS = 14;
const DELAY_MS = 1500;
/** Pages where a pop-up would get in the way of buying or of the sign-up itself. */
const SKIP = ["/cart", "/checkout", "/order", "/collector-list", "/unsubscribe", "/gift-cards/card"];

function shouldShow(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "joined") return false;
    if (v && Date.now() - Number(v) < SNOOZE_DAYS * 864e5) return false;
    return true;
  } catch {
    return false; // storage blocked: don't risk showing it on every page
  }
}

function remember(value: string) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}

/** Collector List invitation shown once to new visitors, a moment after the page opens. */
export function CollectorPopup({ image, title }: { image: Img; title?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (SKIP.some((p) => path === p || path.startsWith(p + "/"))) return;
    if (!shouldShow()) return;
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [path]);

  const close = useCallback(() => {
    setOpen(false);
    if (!joined) remember(String(Date.now()));
  }, [joined]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLInputElement>("input[name=email]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && dialog.current) {
        const items = dialog.current.querySelectorAll<HTMLElement>("button, input:not([tabindex='-1']), a[href]");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-graphite/60 p-4 print:hidden" onClick={close}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collector-popup-title"
        className="relative grid max-h-[92dvh] w-full max-w-3xl overflow-y-auto bg-wall shadow-2xl md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-wall/90 text-graphite hover:bg-plinth"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        {image && (
          <div className="relative hidden bg-plinth md:block">
            <Image src={image.url} alt={image.alt || title || ""} fill sizes="384px" className="object-cover" />
          </div>
        )}

        <div className={image ? "p-7 md:p-10" : "p-7 md:col-span-2 md:p-10"}>
          {joined ? (
            <div className="pt-6">
              <h2 id="collector-popup-title" className="display text-[2.25rem] leading-tight">Welcome to the Collector List</h2>
              <p className="mt-3 text-stone">Thank you. Look out for a welcome email from us.</p>
              <button type="button" onClick={close} className="btn btn-primary mt-6 w-full">Continue to the website</button>
            </div>
          ) : (
            <>
              <h2 id="collector-popup-title" className="display pr-8 text-[2.25rem] leading-tight md:text-[2.5rem]">
                Join the Collector List
              </h2>
              <p className="mt-3 mb-6 text-stone">
                Be first to see new original paintings, limited prints and collector previews, before they are shared anywhere
                else.
              </p>
              <CollectorSignup
                id="popup"
                stacked
                onJoined={() => {
                  remember("joined");
                  setJoined(true);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Img = { id: string; url: string; width: number | null; height: number | null; alt: string };

/** Main image + thumbnails, with a full-screen viewer for close looking. */
export function ArtworkGallery({ images, title, sold }: { images: Img[]; title: string; sold?: boolean }) {
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState(false);
  const current = images[index];

  const go = useCallback((d: number) => setIndex((i) => (i + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [viewer, go]);

  if (!current) {
    return <div className="flex aspect-[4/5] items-center justify-center bg-plinth text-stone">Image coming soon</div>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setViewer(true)}
        className="relative block w-full cursor-zoom-in"
        aria-label={`View ${title} full screen`}
      >
        <Image
          src={current.url}
          alt={current.alt || title}
          width={current.width ?? 1600}
          height={current.height ?? 1200}
          sizes="(min-width: 1024px) 58vw, 100vw"
          quality={90}
          priority
          className="hung mx-auto h-auto max-h-[78vh] w-auto max-w-full bg-plinth"
        />
        {sold && (
          <span aria-hidden className="absolute right-3 bottom-3 size-4 rounded-full bg-reddot ring-4 ring-wall md:right-4 md:bottom-4" />
        )}
      </button>
      <p className="mt-3 text-center text-[0.8125rem] text-stone">Select the image to view it full screen</p>

      {images.length > 1 && (
        <div className="mt-5 flex justify-center gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Image ${i + 1} of ${images.length}`}
              aria-current={i === index}
              className={cn("shrink-0 border p-1 transition-colors", i === index ? "border-graphite" : "border-transparent hover:border-rule")}
            >
              <Image src={img.url} alt="" width={120} height={120} sizes="72px" className="size-16 object-cover md:size-[4.5rem]" />
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fade-in fixed inset-0 z-50 flex flex-col bg-[#1d1c1a]"
        >
          <div className="flex items-center justify-between px-4 py-3 text-wall">
            <p className="work-title truncate text-[1.125rem]">{title}</p>
            <button type="button" onClick={() => setViewer(false)} className="h-11 px-3 text-[0.9375rem]" autoFocus>
              Close
            </button>
          </div>
          <div className="relative flex-1 overflow-auto" onClick={() => setViewer(false)}>
            <Image
              src={current.url}
              alt={current.alt || title}
              width={current.width ?? 1600}
              height={current.height ?? 1200}
              sizes="100vw"
              quality={90}
              className="h-full w-full object-contain p-2 md:p-6"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-between px-4 py-3 text-wall">
              <button type="button" className="h-11 px-3" onClick={() => go(-1)}>
                Previous
              </button>
              <span className="self-center text-[0.875rem] text-wall/70">
                {index + 1} of {images.length}
              </span>
              <button type="button" className="h-11 px-3" onClick={() => go(1)}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

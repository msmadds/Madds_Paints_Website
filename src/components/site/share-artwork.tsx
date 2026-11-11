"use client";

import { useEffect, useState } from "react";

type Props = { title: string; artist: string; pageUrl: string; imageUrl: string | null; slug: string };

export function ShareArtwork({ title, artist, pageUrl, imageUrl, slug }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = `${title} by ${artist}`;

  // Fetch the picture ahead of time: phones only open the share sheet if
  // share() runs straight from the tap, with no download in between.
  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    fetch(`/_next/image?url=${encodeURIComponent(imageUrl)}&w=1080&q=90`)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        if (cancelled) return;
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        const f = new File([blob], `${slug}.${ext}`, { type: blob.type || "image/jpeg" });
        setFile(f);
        setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [f] }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [imageUrl, slug]);

  async function shareImage() {
    if (!file) return;
    try {
      // Status and Story uploads ignore the text, so the link goes in the caption for chats.
      await navigator.share({ files: [file], title: text, text: `${text}\n${pageUrl}` });
    } catch {
      // Closed the share sheet; nothing to do.
    }
  }

  function saveImage() {
    if (!file) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
    } catch {
      const t = document.createElement("textarea");
      t.value = pageUrl;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl}`)}`;
  const small = "inline-flex h-10 items-center gap-2 border border-graphite px-3 text-[0.875rem] font-semibold transition-colors hover:bg-graphite hover:text-wall";

  return (
    <div className="mt-6 border-t border-rule pt-6">
      <p className="text-[0.9375rem] font-semibold">Share this painting</p>
      <p className="mt-1 text-[0.875rem] text-stone">
        {canShareFiles
          ? "Post it to your WhatsApp Status or Instagram Story, or send it to a friend."
          : "Send it on WhatsApp, or save the image to post on Instagram from your phone."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canShareFiles && (
          <button type="button" className={small} onClick={shareImage}>
            <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 13V3M6 7l4-4 4 4M4 11v6h12v-6" />
            </svg>
            Share image
          </button>
        )}
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={small}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5 0a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" />
          </svg>
          WhatsApp
        </a>
        {!canShareFiles && file && (
          <button type="button" className={small} onClick={saveImage}>
            Save image
          </button>
        )}
        <button type="button" className={small} onClick={copyLink} aria-live="polite">
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

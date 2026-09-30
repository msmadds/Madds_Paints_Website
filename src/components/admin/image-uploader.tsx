"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addArtworkImage } from "@/app/admin/actions";

async function dimensions(file: File): Promise<{ width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const d = { width: bmp.width, height: bmp.height };
    bmp.close();
    return d;
  } catch {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1600, height: 1200 });
      img.src = URL.createObjectURL(file);
    });
  }
}

export function ImageUploader({ artworkId, title, blobEnabled }: { artworkId: string; title: string; blobEnabled: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const [i, file] of [...files].entries()) {
        if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error(`${file.name}: use JPG, PNG, WebP or AVIF.`);
        setStatus(`Uploading ${i + 1} of ${files.length}…`);
        const { width, height } = await dimensions(file);
        let url: string;
        if (blobEnabled) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const blob = await upload(`artworks/${artworkId}.${ext}`, file, {
            access: "public",
            handleUploadUrl: "/api/admin/blob",
            contentType: file.type,
            multipart: file.size > 8 * 1024 * 1024,
          });
          url = blob.url;
        } else {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/admin/local-upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Upload failed.");
          url = data.url;
        }
        await addArtworkImage({ artworkId, url, width, height, alt: `${title} by MedePaints` });
      }
      setStatus("Uploaded.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setStatus(null);
    }
    setBusy(false);
  }

  return (
    <div>
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-stone bg-wall px-4 py-6 text-center hover:border-graphite">
        <span className="font-semibold">{busy ? status : "Choose artwork photos"}</span>
        <span className="mt-1 text-[0.8125rem] text-stone">JPG, PNG, WebP or AVIF. Use the largest, sharpest photo you have (up to 25 MB).</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
      {!busy && status && <p className="mt-2 text-[0.875rem] text-verdigris">{status}</p>}
      {error && <p className="field-error">{error}</p>}
      {!blobEnabled && (
        <p className="mt-2 text-[0.8125rem] text-stone">
          Local development mode: images are saved to /public/uploads. Set BLOB_READ_WRITE_TOKEN for production.
        </p>
      )}
    </div>
  );
}

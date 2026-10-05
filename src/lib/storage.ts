import "server-only";
import { put, del } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./crypto";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB

/**
 * True when a Vercel Blob store is connected: either a read-write token, or a
 * store id (newer stores authenticate with Vercel OIDC instead of a token).
 */
export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/**
 * Artwork images are stored in Vercel Blob (connect a Blob store in Vercel →
 * Storage). In local development without one, files are written to
 * /public/uploads instead.
 */
export async function uploadImage(file: File, prefix = "artworks"): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new Error("Use a JPG, PNG, WebP or AVIF image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 12 MB or smaller.");
  const name = `${prefix}/${Date.now()}-${randomToken(6)}.${ext}`;

  if (blobConfigured()) {
    const blob = await put(name, file, { access: "public", contentType: file.type, addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error("Image storage is not configured. Connect a Vercel Blob store to the project.");
  }
  const dir = path.join(process.cwd(), "public", "uploads", prefix);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(process.cwd(), "public", "uploads", name);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function deleteImage(url: string): Promise<void> {
  if (blobConfigured() && url.includes(".blob.vercel-storage.com")) {
    await del(url).catch((e) => console.warn("[storage] delete failed", e));
  }
}

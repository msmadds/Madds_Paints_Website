import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { uploadImage } from "@/lib/storage";

/** Local fallback (not on Vercel) when BLOB_READ_WRITE_TOKEN is not set. */
export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) {
    return NextResponse.json({ error: "On Vercel, images are stored in Vercel Blob. Set BLOB_READ_WRITE_TOKEN." }, { status: 400 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  try {
    const url = await uploadImage(file);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

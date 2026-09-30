import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 pt-24 pb-24">
      <p className="display text-[3rem]">MedePaints</p>
      <h1 className="mt-8 text-[1.25rem] font-semibold">This page does not exist.</h1>
      <p className="mt-2 text-stone">The work may have been moved or unpublished.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/gallery" className="btn btn-primary">Visit the gallery</Link>
        <Link href="/" className="btn btn-secondary">Home</Link>
      </div>
    </div>
  );
}

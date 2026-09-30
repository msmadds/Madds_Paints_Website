"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LookupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/order-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: fd.get("orderNumber"), phone: fd.get("phone") }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      router.push(`/order/${encodeURIComponent(data.orderNumber)}?key=${encodeURIComponent(data.key)}`);
      return;
    }
    setError(data.fields?.phone ?? data.fields?.orderNumber ?? data.error ?? "No connection. Try again.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="orderNumber" className="field-label">Order number</label>
        <input id="orderNumber" name="orderNumber" className="field uppercase" placeholder="MP-260930-ABCDE" autoCapitalize="characters" required />
      </div>
      <div>
        <label htmlFor="phone" className="field-label">Phone number used for the order</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" className="field" placeholder="0712 345 678" required />
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Finding…" : "Find my order"}
      </button>
    </form>
  );
}

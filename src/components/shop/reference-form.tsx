"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReferenceForm({ orderNumber, accessKey, again }: { orderNumber: string; accessKey: string; again?: boolean }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, key: accessKey, reference, payerPhone: payerPhone || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.fields?.reference ?? data.error ?? "The code could not be saved.");
      } else {
        setReference("");
        router.refresh();
      }
    } catch {
      setError("No connection. Check your internet and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="mpesa-ref" className="field-label">
          {again ? "Send a different M-Pesa confirmation code" : "M-Pesa confirmation code"}
        </label>
        <input
          id="mpesa-ref"
          className="field font-mono tracking-widest uppercase"
          value={reference}
          onChange={(e) => setReference(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. 9KL3ABCD12"
          aria-invalid={error ? true : undefined}
          aria-describedby="mpesa-ref-help"
          required
        />
        <p id="mpesa-ref-help" className="mt-1 text-[0.8125rem] text-stone">
          It is at the start of the M-Pesa SMS you receive after paying.
        </p>
      </div>
      <div>
        <label htmlFor="payer-phone" className="field-label">
          Phone number you paid from (optional)
        </label>
        <input id="payer-phone" className="field" type="tel" inputMode="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="If different from your order phone" />
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy || reference.trim().length < 6}>
        {busy ? "Sending…" : "Submit M-Pesa code"}
      </button>
    </form>
  );
}

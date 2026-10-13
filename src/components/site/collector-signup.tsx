"use client";

import { useState } from "react";

export function CollectorSignup({ id = "collector" }: { id?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("busy");
    setErrors({});
    setError(null);
    const res = await fetch("/api/collectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      form.reset();
      setState("sent");
      return;
    }
    setErrors(data.fields ?? {});
    setError(data.error ?? "No connection. Try again.");
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div role="status" className="border border-graphite bg-wall p-6">
        <p className="font-semibold">You’re on the Collector List.</p>
        <p className="mt-2 text-stone">Thank you. You’ll hear first about new originals, limited prints and collector previews.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-email`} className="field-label">Email</label>
          <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" required className="field" aria-invalid={errors.email ? true : undefined} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor={`${id}-name`} className="field-label">Name (optional)</label>
          <input id={`${id}-name`} name="name" autoComplete="name" className="field" />
        </div>
      </div>
      <div className="hidden" aria-hidden>
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {error && !Object.keys(errors).length && <p role="alert" className="field-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={state === "busy"}>
        {state === "busy" ? "Joining…" : "Join the Collector List"}
      </button>
      <p className="text-[0.8125rem] text-stone">
        Be the first to hear about new original artworks, limited prints and exclusive collector releases. You can unsubscribe at
        any time.
      </p>
    </form>
  );
}

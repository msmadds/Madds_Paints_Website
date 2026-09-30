"use client";

import { useState } from "react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState("busy");
    setErrors({});
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
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
      <div role="status" className="border border-graphite bg-white p-6">
        <p className="font-semibold">Message sent.</p>
        <p className="mt-2 text-stone">We reply within two working days, usually sooner.</p>
        <button type="button" className="link mt-4 text-[0.9375rem]" onClick={() => setState("idle")}>
          Send another message
        </button>
      </div>
    );
  }

  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`c-${name}`} className="field-label">{label}</label>
      <input id={`c-${name}`} name={name} className="field" aria-invalid={errors[name] ? true : undefined} {...props} />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {f("name", "Your name", { autoComplete: "name", required: true })}
      <div className="grid gap-5 sm:grid-cols-2">
        {f("phone", "Phone or WhatsApp", { type: "tel", inputMode: "tel", autoComplete: "tel" })}
        {f("email", "Email", { type: "email", inputMode: "email", autoComplete: "email" })}
      </div>
      <p className="-mt-3 text-[0.8125rem] text-stone">Give at least one so we can reply.</p>
      {f("subject", "Subject (optional)", { placeholder: "A painting, a commission, an order…" })}
      <div>
        <label htmlFor="c-message" className="field-label">Message</label>
        <textarea id="c-message" name="message" rows={6} className="field" aria-invalid={errors.message ? true : undefined} required />
        {errors.message && <p className="field-error">{errors.message}</p>}
      </div>
      <div className="hidden" aria-hidden>
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {error && !Object.keys(errors).length && <p role="alert" className="field-error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={state === "busy"}>
        {state === "busy" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { GIFT_CARD_AMOUNTS } from "@/lib/gift-card-rules";

export function GiftCardForm({ initialAmount }: { initialAmount?: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(
    initialAmount && (GIFT_CARD_AMOUNTS as readonly number[]).includes(initialAmount) ? initialAmount : GIFT_CARD_AMOUNTS[1],
  );
  const [asGift, setAsGift] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/gift-cards/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          customerName: fd.get("customerName"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          sendAsGift: asGift,
          senderName: fd.get("senderName") || undefined,
          recipientName: fd.get("recipientName") || undefined,
          recipientEmail: fd.get("recipientEmail") || undefined,
          message: fd.get("message") || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        router.push(`/order/${encodeURIComponent(data.orderNumber)}?key=${encodeURIComponent(data.key)}`);
        return;
      }
      setErrors(data.fields ?? {});
      setFormError(data.error ?? "Your order could not be placed. Try again.");
    } catch {
      setFormError("No connection. Check your internet and try again. Nothing was charged.");
    }
    setBusy(false);
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={`g-${name}`} className="field-label">{label}</label>
      <input id={`g-${name}`} name={name} className="field" aria-invalid={errors[name] ? true : undefined} {...props} />
      {hint && <p className="mt-1 text-[0.8125rem] text-stone">{hint}</p>}
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {formError && (
        <p role="alert" className="border border-reddot bg-white px-5 py-4 text-[0.9375rem] text-reddot">
          {formError}
        </p>
      )}

      <fieldset>
        <legend className="field-label">Amount</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GIFT_CARD_AMOUNTS.map((a) => (
            <label
              key={a}
              className="flex min-h-14 cursor-pointer items-center justify-center border border-rule px-3 text-center tabular-nums has-[:checked]:border-graphite has-[:checked]:bg-white has-[:checked]:font-semibold"
            >
              <input type="radio" name="amount" value={a} checked={amount === a} onChange={() => setAmount(a)} className="sr-only" />
              {formatMoney(a)}
            </label>
          ))}
        </div>
        {errors.amount && <p className="field-error">{errors.amount}</p>}
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={asGift} onChange={(e) => setAsGift(e.target.checked)} className="size-5 accent-graphite" />
        <span>I want to send this as a gift</span>
      </label>

      {asGift && (
        <fieldset className="space-y-5 border border-rule bg-white p-5">
          <legend className="sr-only">Gift details</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("recipientName", "Recipient's name", { autoComplete: "off", required: true })}
            {field("recipientEmail", "Recipient's email", { type: "email", inputMode: "email", autoComplete: "off", required: true })}
          </div>
          {field("senderName", "From (optional)", { placeholder: "Your name as it should appear" })}
          <div>
            <label htmlFor="g-message" className="field-label">Message (optional)</label>
            <textarea id="g-message" name="message" rows={3} maxLength={300} className="field" placeholder="Happy birthday! Choose something you love." />
            {errors.message && <p className="field-error">{errors.message}</p>}
          </div>
          <p className="text-[0.8125rem] text-stone">
            We email the gift card to the recipient as soon as your payment is confirmed. You will also be able to open a printable card.
          </p>
        </fieldset>
      )}

      <fieldset className="space-y-5">
        <legend className="display mb-2 text-[1.5rem]">Your details</legend>
        {field("customerName", "Full name", { autoComplete: "name", required: true })}
        <div className="grid gap-5 sm:grid-cols-2">
          {field("phone", "Phone number", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "0712 345 678", required: true })}
          {field(
            "email",
            "Email address",
            { type: "email", inputMode: "email", autoComplete: "email", required: true },
            asGift ? "For your receipt." : "We email the gift card here.",
          )}
        </div>
      </fieldset>

      <div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}>
          {busy ? "Placing order…" : `Buy a ${formatMoney(amount)} gift card`}
        </button>
        <p className="mt-3 text-[0.8125rem] text-stone">You will pay via M-Pesa on the next page. We never ask for your M-Pesa PIN.</p>
      </div>
    </form>
  );
}

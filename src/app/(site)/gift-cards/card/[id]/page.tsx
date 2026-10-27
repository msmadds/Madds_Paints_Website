import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { safeEqual } from "@/lib/crypto";
import { formatDate, formatMoney } from "@/lib/format";
import { formatGiftCode } from "@/lib/gift-card-rules";
import { giftCardProblem } from "@/lib/gift-cards";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/site/print-button";

export const metadata: Metadata = { title: "Gift card", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> };

/** Printable gift card. Needs the secret from the email link; also shows the balance. */
export default async function GiftCardPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { k } = await searchParams;
  const card =
    k && /^[0-9a-f-]{36}$/i.test(id) ? await db.query.giftCards.findFirst({ where: eq(schema.giftCards.id, id) }) : undefined;
  if (!card || !k || !safeEqual(card.accessToken, k)) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-16">
        <h1 className="display text-[2.5rem]">Gift card not found</h1>
        <p className="mt-4 text-stone">This link is incomplete. Use the link in your gift card email, or contact us with your code.</p>
      </div>
    );
  }
  const s = await getSettings();
  const problem = giftCardProblem(card);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-10 md:pt-16 print:max-w-none print:p-0">
      <article className="border border-graphite bg-white p-8 text-center md:p-14 print:border-2">
        <p className="display text-[2.25rem] md:text-[3rem]">{s.businessName}</p>
        <p className="mt-2 text-[0.8125rem] tracking-[0.18em] text-stone uppercase">Gift card</p>
        {card.recipientName && <p className="mt-10 work-title text-[1.75rem]">For {card.recipientName}</p>}
        {card.message && <p className="mx-auto mt-4 max-w-md text-[1.0625rem] italic">“{card.message}”</p>}
        {card.senderName && <p className="mt-3 text-stone">From {card.senderName}</p>}
        <p className="mt-10 display text-[3rem] tabular-nums md:text-[4rem]">{formatMoney(card.initialValue, card.currency)}</p>
        <p className="mt-8 text-[0.8125rem] text-stone">Your code</p>
        <p className="mt-1 text-[1.75rem] font-semibold tracking-[0.14em] tabular-nums md:text-[2.25rem]">{formatGiftCode(card.code)}</p>
        <p className="mt-6 text-[0.9375rem]">Valid until {formatDate(card.expiresAt)}</p>
        <p className="mx-auto mt-6 max-w-md text-[0.875rem] text-stone">
          Choose an original painting or a fine art print at {(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/^https?:\/\//, "")} and
          enter the code at checkout.
        </p>
      </article>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <p className="text-[0.9375rem]">
          {problem ? problem : <>Remaining balance: <strong className="tabular-nums">{formatMoney(card.balance, card.currency)}</strong></>}
        </p>
        <div className="flex flex-wrap gap-3">
          <PrintButton />
          <Link href="/shop/originals" className="btn btn-primary">
            Start shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

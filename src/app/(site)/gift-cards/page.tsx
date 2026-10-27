import type { Metadata } from "next";
import { GiftCardForm } from "@/components/shop/gift-card-form";
import { GIFT_CARD_VALID_MONTHS } from "@/lib/gift-card-rules";

export const metadata: Metadata = {
  title: "Gift cards",
  description: "Not sure which print or painting to give? A MedePaints gift card lets them choose.",
};

export default async function GiftCardsPage({ searchParams }: { searchParams: Promise<{ amount?: string }> }) {
  const { amount } = await searchParams;
  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="display text-[2.75rem] md:text-[4rem]">
            Not sure what print or painting to gift your loved one? Consider a gift card.
          </h1>
          <dl className="mt-10 space-y-6 text-[0.9375rem]">
            <div>
              <dt className="font-semibold">They choose</dt>
              <dd className="mt-1 text-stone">The card can be spent on any original painting or fine art print, and on delivery.</dd>
            </div>
            <div>
              <dt className="font-semibold">Use it more than once</dt>
              <dd className="mt-1 text-stone">If an order costs less than the card, the rest stays on the card for next time.</dd>
            </div>
            <div>
              <dt className="font-semibold">Valid for {GIFT_CARD_VALID_MONTHS} months</dt>
              <dd className="mt-1 text-stone">The expiry date is shown on the card and in the email.</dd>
            </div>
            <div>
              <dt className="font-semibold">Pay by M-Pesa, delivered by email</dt>
              <dd className="mt-1 text-stone">
                As soon as your payment is confirmed, the card is emailed to you or straight to the person you are gifting, with your
                message and a printable card.
              </dd>
            </div>
          </dl>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <GiftCardForm initialAmount={Number(amount) || undefined} />
        </div>
      </div>
    </div>
  );
}

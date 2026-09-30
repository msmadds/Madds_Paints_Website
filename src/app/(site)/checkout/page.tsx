import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { listDeliveryZones } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [zones, settings] = await Promise.all([listDeliveryZones(), getSettings()]);
  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <h1 className="display text-[2.75rem] md:text-[4rem]">Checkout</h1>
      {zones.length === 0 ? (
        <p className="py-16 text-stone">Delivery options are not set up yet. Contact us to place your order.</p>
      ) : (
        <CheckoutForm
          holdHours={settings.holdHours}
          zones={zones.map((z) => ({
            id: z.id,
            name: z.name,
            fee: z.fee,
            currency: z.currency,
            feeToBeConfirmed: z.feeToBeConfirmed,
            estimate: z.estimate,
          }))}
        />
      )}
    </div>
  );
}

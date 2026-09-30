import { mpesaManual } from "./mpesa-manual";
import { mpesaApi } from "./mpesa-api";
import type { PaymentProvider } from "./types";

export const providers: Record<string, PaymentProvider> = {
  [mpesaManual.id]: mpesaManual,
  [mpesaApi.id]: mpesaApi,
};

/** The provider used for new orders. Defaults to manual M-Pesa. */
export function activeProvider(): PaymentProvider {
  const id = process.env.PAYMENT_PROVIDER || mpesaManual.id;
  return providers[id] ?? mpesaManual;
}

export function getProvider(id: string): PaymentProvider | undefined {
  return providers[id];
}

export type { PaymentProvider, PaymentInstructions } from "./types";

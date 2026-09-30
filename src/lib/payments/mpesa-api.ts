import type { PaymentProvider } from "./types";

/**
 * Placeholder for automatic M-Pesa confirmation through the Vodacom Tanzania
 * M-Pesa Open API (C2B / customer-to-business). It is NOT registered by default.
 *
 * To enable later:
 *   1. Obtain API credentials from Vodacom (openapiportal.m-pesa.com).
 *   2. Set MPESA_API_KEY, MPESA_PUBLIC_KEY, MPESA_SERVICE_PROVIDER_CODE,
 *      MPESA_ENVIRONMENT and MPESA_WEBHOOK_SECRET in Vercel.
 *   3. Implement `initiate` (session key + C2B single-stage request) and
 *      `handleWebhook` (authenticate the callback, map it to WebhookResult).
 *   4. Register the provider in ./index.ts and set PAYMENT_PROVIDER=mpesa_api.
 *
 * The webhook route (/api/payments/webhook/[provider]) and order service
 * (`confirmAutomaticPayment`) are already in place.
 */
export const mpesaApi: PaymentProvider = {
  id: "mpesa_api",
  label: "M-Pesa (automatic)",
  kind: "automatic",
  isConfigured: () =>
    Boolean(process.env.MPESA_API_KEY && process.env.MPESA_PUBLIC_KEY && process.env.MPESA_SERVICE_PROVIDER_CODE),
  async initiate() {
    return { status: "error", message: "Automatic M-Pesa is not enabled yet." };
  },
  async handleWebhook() {
    throw new Error("Automatic M-Pesa webhook is not implemented yet.");
  },
};

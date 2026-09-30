import type { Settings } from "@/lib/settings";

/** Minimal order view that payment providers need. */
export type PayableOrder = {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  phone: string;
};

export type PaymentInstructions = {
  title: string;
  /** Number or till the customer pays to. */
  payTo: string;
  payToLabel: string;
  accountName: string;
  amount: number;
  currency: string;
  /** Reference the customer should type, if the flow supports one. */
  reference: string;
  steps: string[];
};

export type InitiateResult =
  | { status: "instructions"; instructions: PaymentInstructions }
  /** For API providers that push a payment prompt (e.g. USSD push / STK). */
  | { status: "pushed"; providerRequestId: string; message: string }
  | { status: "error"; message: string };

export type WebhookResult = {
  /** Our order number or id the provider echoed back. */
  orderRef: string;
  reference: string;
  amount: number;
  currency: string;
  success: boolean;
  payerPhone?: string;
  raw: unknown;
};

/**
 * Every payment method implements this interface. Adding Airtel Money,
 * Mixx by Yas (Tigo Pesa), card payments or automatic M-Pesa confirmation means
 * adding a new provider file and registering it in `./index.ts`.
 */
export interface PaymentProvider {
  id: string;
  label: string;
  /** manual = customer submits a reference and an admin verifies it. */
  kind: "manual" | "automatic";
  isConfigured(settings: Settings): boolean;
  initiate(order: PayableOrder, settings: Settings): Promise<InitiateResult>;
  /** Automatic providers parse and authenticate callbacks here. */
  handleWebhook?(request: Request): Promise<WebhookResult>;
}

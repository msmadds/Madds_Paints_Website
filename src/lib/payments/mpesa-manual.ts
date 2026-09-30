import { formatMoney } from "@/lib/format";
import type { PaymentProvider } from "./types";

/**
 * Manual M-Pesa (Vodacom Tanzania): the customer sends money to the number
 * configured in Admin → Settings, then submits the M-Pesa confirmation code.
 * An admin checks the M-Pesa statement and verifies the payment.
 *
 * No PINs or credentials are ever collected or stored.
 */
export const mpesaManual: PaymentProvider = {
  id: "mpesa_manual",
  label: "M-Pesa",
  kind: "manual",
  isConfigured: (s) => s.mpesaNumber.trim().length > 0,
  async initiate(order, s) {
    const amount = formatMoney(order.total, order.currency);
    const isLipa = s.mpesaPaymentType === "lipa_namba";
    const custom = s.mpesaInstructions
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) =>
        l
          .replaceAll("{number}", s.mpesaNumber)
          .replaceAll("{amount}", amount)
          .replaceAll("{order}", order.orderNumber)
          .replaceAll("{name}", s.mpesaAccountName),
      );

    const steps = custom.length
      ? custom
      : isLipa
        ? [
            "Dial *150*00# on your Vodacom line, or open the M-Pesa app.",
            "Choose Lipa kwa M-Pesa (Pay by M-Pesa).",
            `Enter the Lipa Namba ${s.mpesaNumber}.`,
            `Enter the amount ${amount}.`,
            `Confirm the name shown is ${s.mpesaAccountName}, then enter your PIN on your own phone.`,
            "Copy the confirmation code from the M-Pesa SMS and enter it below.",
          ]
        : [
            "Dial *150*00# on your Vodacom line, or open the M-Pesa app.",
            "Choose Send Money (Tuma Pesa).",
            `Enter the number ${s.mpesaNumber}.`,
            `Enter the amount ${amount}.`,
            `Confirm the name shown is ${s.mpesaAccountName}, then enter your PIN on your own phone.`,
            "Copy the confirmation code from the M-Pesa SMS and enter it below.",
          ];

    return {
      status: "instructions",
      instructions: {
        title: "Pay via M-Pesa",
        payTo: s.mpesaNumber,
        payToLabel: isLipa ? "Lipa Namba" : "M-Pesa Number",
        accountName: s.mpesaAccountName,
        amount: order.total,
        currency: order.currency,
        reference: order.orderNumber,
        steps,
      },
    };
  },
};

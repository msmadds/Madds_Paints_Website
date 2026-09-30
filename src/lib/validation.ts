import { z } from "zod";
import { normalizePhone } from "./utils";

export const COLLECTOR_CONSENT_TEXT =
  "Join the MedePaints Collector List. Be the first to hear about new original artworks, limited prints and exclusive collector releases. You can unsubscribe at any time.";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0712 345 678." });
      return z.NEVER;
    }
    return n;
  });

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || z.email().safeParse(v).success, "Enter a valid email address, or leave it empty.");

export const cartItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("original"), artworkId: z.uuid() }),
  z.object({ kind: z.literal("print"), variantId: z.uuid(), quantity: z.coerce.number().int().min(1).max(20) }),
]);
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const cartSchema = z.array(cartItemSchema).max(40);

export const checkoutSchema = z
  .object({
    items: cartSchema.min(1, "Your cart is empty."),
    customerName: z.string().trim().min(2, "Enter your full name.").max(160),
    phone: phoneSchema,
    email: optionalEmail,
    address: z.string().trim().min(5, "Enter a delivery address.").max(500),
    city: z.string().trim().min(2, "Enter your city or town.").max(120),
    deliveryZoneId: z.uuid("Choose a delivery option."),
    deliveryNotes: optionalText(1000),
    joinCollectorList: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.joinCollectorList && !v.email) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Add your email to join the Collector List, or untick the box.",
      });
    }
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const referenceSchema = z.object({
  orderNumber: z.string().trim().min(4).max(32),
  key: z.string().trim().min(10).max(64),
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^[A-Z0-9]{6,20}$/, "Enter the confirmation code from your M-Pesa SMS (letters and numbers only).")),
  payerPhone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizePhone(v) ?? undefined : undefined)),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(160),
  phone: z.string().trim().max(32).optional().transform((v) => (v ? v : undefined)),
  email: optionalEmail,
  subject: optionalText(200),
  message: z.string().trim().min(5, "Write a short message.").max(4000),
  // Honeypot: real people leave this empty.
  website: z.string().max(0).optional(),
}).refine((v) => v.phone || v.email, { message: "Add a phone number or email so we can reply.", path: ["phone"] });

export const lookupSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().min(4).max(32),
  phone: phoneSchema,
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

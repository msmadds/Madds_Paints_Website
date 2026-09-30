import "server-only";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db, schema } from "@/db";

/**
 * Admin-editable settings. Stored as one JSON document (settings.id = 1) and
 * always parsed through this schema, so new fields can be added with a default
 * and no database migration.
 *
 * Secrets (API keys, passwords) never live here — only in environment variables.
 */
export const settingsSchema = z.object({
  // Business & contact
  businessName: z.string().max(120).default("MedePaints"),
  artistName: z.string().max(120).default("Mede"),
  contactEmail: z.string().max(254).default(""),
  phone: z.string().max(40).default(""),
  whatsapp: z.string().max(40).default(""),
  location: z.string().max(200).default("Dar es Salaam, Tanzania"),
  instagramUrl: z.string().max(300).default("https://www.instagram.com/medepaints"),
  instagramHandle: z.string().max(80).default("@medepaints"),

  // M-Pesa
  mpesaNumber: z.string().max(40).default(""),
  mpesaAccountName: z.string().max(120).default("MedePaints"),
  mpesaPaymentType: z.enum(["send_money", "lipa_namba"]).default("send_money"),
  /** Optional custom instructions. One step per line. Replaces the default steps. */
  mpesaInstructions: z.string().max(2000).default(""),

  // Orders & delivery
  currency: z.string().length(3).default("TZS"),
  holdHours: z.coerce.number().int().min(1).max(168).default(24),
  deliveryInfo: z
    .string()
    .max(3000)
    .default(
      "Originals are wrapped, boxed and delivered by hand within Dar es Salaam. Prints are shipped flat or rolled in a rigid tube. We call you before every delivery to agree a time.",
    ),

  // Email (credentials live in env vars; these are presentation settings)
  emailEnabled: z.boolean().default(true),
  emailFromName: z.string().max(120).default("MedePaints"),
  emailReplyTo: z.string().max(254).default(""),
  orderNotificationEmail: z.string().max(254).default(""),

  // Homepage & about
  heroStatement: z.string().max(160).default("Original Art. Made to Live With."),
  heroArtworkSlug: z.string().max(160).default(""),
  homeIntro: z
    .string()
    .max(600)
    .default("Original paintings for collectors. Fine art prints for everyone."),
  aboutShort: z
    .string()
    .max(1200)
    .default(
      "MedePaints is the studio of a Dar es Salaam painter working in acrylic and oil. The paintings begin with colour remembered from a place — a wall at dusk, a harbour at noon — and are built slowly in layers until the surface holds that light.",
    ),
  aboutBio: z
    .string()
    .max(8000)
    .default(
      "Mede is a painter based in Dar es Salaam, Tanzania.\n\nThe work began as small studies of the city — the colour of painted walls, the movement of the harbour, the particular light of late afternoon on the coast — and has grown into a practice of larger, quieter canvases.\n\nEvery painting is made by hand in the studio, one at a time.",
    ),
  artisticApproach: z
    .string()
    .max(8000)
    .default(
      "Each painting is built in thin layers over several weeks. Colour is mixed by eye, not from a formula, and each layer is allowed to dry before the next is laid over it, so the earlier colours glow through.\n\nThe subject is usually a feeling of place rather than a view of it: the warmth that stays in a wall after sunset, the pale blue of the sea before rain.",
    ),
  originalsInfo: z
    .string()
    .max(4000)
    .default(
      "Every original is one of one. It is signed on the front and back, comes ready to hang, and is accompanied by a numbered Certificate of Authenticity. Once an original is sold it stays in the gallery, marked with a red dot, as part of the record of the work.",
    ),
  printsInfo: z
    .string()
    .max(4000)
    .default(
      "Prints are high-resolution reproductions of original MedePaints paintings, printed with archival pigment inks on 300 GSM matte fine art paper. Colours are checked against the original painting before an edition is released.",
    ),
  collectorPhilosophy: z
    .string()
    .max(4000)
    .default(
      "You do not need to be an expert to collect art. You need a work that you want to see every day. Whether it is a first print for a new home or a large original for a long wall, every piece is packed with the same care and followed by the same attention.",
    ),
});

export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = settingsSchema.parse({});

export async function getSettings(): Promise<Settings> {
  await connection();
  try {
    const row = await db.query.settings.findFirst({ where: eq(schema.settings.id, 1) });
    const parsed = settingsSchema.safeParse(row?.data ?? {});
    if (parsed.success) return parsed.data;
    // Keep valid keys even if one stored value is bad.
    const merged: Record<string, unknown> = { ...defaultSettings };
    for (const [k, v] of Object.entries((row?.data as Record<string, unknown>) ?? {})) {
      const single = (settingsSchema.shape as Record<string, z.ZodTypeAny>)[k]?.safeParse(v);
      if (single?.success) merged[k] = single.data;
    }
    return merged as Settings;
  } catch (err) {
    console.error("[settings] falling back to defaults:", err);
    return defaultSettings;
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = settingsSchema.parse({ ...current, ...patch });
  await db
    .insert(schema.settings)
    .values({ id: 1, data: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.id, set: { data: next, updatedAt: new Date() } });
  return next;
}

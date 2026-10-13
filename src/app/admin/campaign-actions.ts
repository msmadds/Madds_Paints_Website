"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emailConfigured } from "@/lib/email";
import { loadCampaignArtworks, renderCampaign, sendCampaignTest, sendCampaignToCollectors, subscribedCollectors } from "@/lib/collector-mail";
import { unfilledPlaceholders } from "@/lib/collector-templates";

const draftSchema = z.object({
  subject: z.string().trim().min(3, "Add a subject.").max(200),
  heading: z.string().trim().min(1, "Add a heading.").max(200),
  intro: z.string().trim().min(1, "Add an introduction.").max(4000),
  closing: z.string().trim().max(4000),
  buttonLabel: z.string().trim().min(1).max(60),
  cardMode: z.enum(["original", "print"]),
  artworkIds: z.array(z.uuid()).max(12, "Choose up to 12 artworks."),
});
export type CampaignInput = z.input<typeof draftSchema>;
type Result = { ok: boolean; message: string; html?: string };

async function prepare(input: CampaignInput) {
  await requireAdmin();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the email." } as const;
  const { artworkIds, ...draft } = parsed.data;
  const [settings, artworks] = await Promise.all([getSettings(), loadCampaignArtworks(artworkIds)]);
  return { draft, artworks, settings } as const;
}

export async function previewCampaign(input: CampaignInput): Promise<Result> {
  const p = await prepare(input);
  if ("error" in p) return { ok: false, message: p.error! };
  const { html } = renderCampaign(p.draft, p.artworks, p.settings, "#");
  return { ok: true, message: "", html };
}

export async function sendTestCampaign(input: CampaignInput): Promise<Result> {
  const p = await prepare(input);
  if ("error" in p) return { ok: false, message: p.error! };
  if (!emailConfigured(p.settings)) return { ok: false, message: "Email is not set up yet. Add RESEND_API_KEY and EMAIL_FROM in Vercel." };
  const to = p.settings.orderNotificationEmail || process.env.ADMIN_EMAIL;
  if (!to) return { ok: false, message: "No admin email to send the test to." };
  const r = await sendCampaignTest(to, p.draft, p.artworks, p.settings);
  return r.sent ? { ok: true, message: `Test sent to ${to}.` } : { ok: false, message: "The test could not be sent. Check the email settings." };
}

export async function sendCampaign(input: CampaignInput, expectedRecipients: number): Promise<Result> {
  const p = await prepare(input);
  if ("error" in p) return { ok: false, message: p.error! };
  const left = unfilledPlaceholders(p.draft);
  if (left.length) return { ok: false, message: `Replace the placeholders first: ${left.join(", ")}` };
  if (!emailConfigured(p.settings)) return { ok: false, message: "Email is not set up yet. Add RESEND_API_KEY and EMAIL_FROM in Vercel." };
  const people = await subscribedCollectors();
  if (!people.length) return { ok: false, message: "Nobody is subscribed yet." };
  if (people.length !== expectedRecipients) {
    return { ok: false, message: `The list changed to ${people.length} people since you opened this page. Reload and try again.` };
  }
  const r = await sendCampaignToCollectors(p.draft, p.artworks, p.settings);
  console.info(`[campaign] "${p.draft.subject}" sent=${r.sent} failed=${r.failed} total=${r.total}`);
  if (!r.sent) return { ok: false, message: "Nothing was sent. Check the email settings and try again." };
  return {
    ok: true,
    message: r.failed ? `Sent to ${r.sent} of ${r.total} collectors. ${r.failed} failed; check Resend for details.` : `Sent to all ${r.sent} collectors.`,
  };
}

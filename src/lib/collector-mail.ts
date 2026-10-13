import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { deliverBatch, esc, layout, siteUrl, type Mail } from "./email";
import { formatDimensions, formatMoney } from "./format";
import type { Settings } from "./settings";
import type { CampaignDraft } from "./collector-templates";

type CardArtwork = {
  slug: string;
  title: string;
  medium: string;
  widthCm: string | null;
  heightCm: string | null;
  depthCm: string | null;
  year: number | null;
  price: number | null;
  currency: string;
  status: "available" | "reserved" | "sold";
  imageUrl: string | null;
  printFrom: number | null;
};

/** Loads the chosen artworks in the order they were picked. */
export async function loadCampaignArtworks(ids: string[]): Promise<CardArtwork[]> {
  if (!ids.length) return [];
  const rows = await db.query.artworks.findMany({
    where: and(inArray(schema.artworks.id, ids), eq(schema.artworks.published, true)),
    with: {
      images: { orderBy: [asc(schema.artworkImages.sortOrder)], limit: 1 },
      printProduct: { with: { variants: { where: eq(schema.printVariants.active, true) } } },
    },
  });
  return ids
    .map((id) => rows.find((r) => r.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => {
      const prices = a.printProduct?.published ? a.printProduct.variants.map((v) => v.price) : [];
      return {
        slug: a.slug,
        title: a.title,
        medium: a.medium,
        widthCm: a.widthCm,
        heightCm: a.heightCm,
        depthCm: a.depthCm,
        year: a.year,
        price: a.price,
        currency: a.currency,
        status: a.status,
        imageUrl: a.images[0]?.url ?? null,
        printFrom: prices.length ? Math.min(...prices) : null,
      };
    });
}

/** A resized JPEG/WebP via the site's image optimiser, so emails stay light. */
function emailImage(url: string): string {
  return `${siteUrl()}/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
}

function cardLink(a: CardArtwork, mode: CampaignDraft["cardMode"]) {
  return `${siteUrl()}${mode === "print" ? `/prints/${a.slug}` : `/artwork/${a.slug}`}`;
}

function cardPrice(a: CardArtwork, mode: CampaignDraft["cardMode"]): string {
  if (mode === "print") return a.printFrom != null ? `Prints from ${formatMoney(a.printFrom, a.currency)}` : "Prints available";
  if (a.status === "sold") return "Sold";
  if (a.status === "reserved") return "Reserved";
  return a.price != null ? formatMoney(a.price, a.currency) : "Private collection";
}

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

export function renderCampaign(
  draft: CampaignDraft,
  artworks: CardArtwork[],
  settings: Settings,
  unsubscribeUrl: string,
): { html: string; text: string } {
  const p = (t: string) => paragraphs(t).map((x) => `<p style="margin:0 0 14px">${esc(x).replace(/\n/g, "<br>")}</p>`).join("");
  const cards = artworks
    .map((a) => {
      const link = cardLink(a, draft.cardMode);
      const details = [a.medium, formatDimensions(a.widthCm, a.heightCm, a.depthCm), a.year ? String(a.year) : ""].filter(Boolean).join(" · ");
      return `<tr><td style="padding:18px 0;border-top:1px solid #E6E3DC">
${a.imageUrl ? `<a href="${link}"><img src="${emailImage(a.imageUrl)}" alt="${esc(a.title)}" width="496" style="display:block;width:100%;max-width:496px;height:auto;border:0"></a>` : ""}
<p style="margin:14px 0 2px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:19px">${esc(a.title)}</p>
<p style="margin:0;color:#77726A;font-size:13px">${esc(details)}</p>
<p style="margin:6px 0 0;font-weight:bold">${esc(cardPrice(a, draft.cardMode))} &nbsp;<a href="${link}" style="color:#2A2926;font-weight:normal">View</a></p>
</td></tr>`;
    })
    .join("");
  const buttonHref = artworks.length === 1 ? cardLink(artworks[0], draft.cardMode) : `${siteUrl()}${draft.cardMode === "print" ? "/shop/prints" : "/shop/originals"}`;
  const body = `<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;line-height:1.2">${esc(draft.heading)}</h1>
${p(draft.intro)}
${cards ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0 18px">${cards}</table>` : ""}
${p(draft.closing)}
<p style="margin:24px 0 0"><a href="${buttonHref}" style="display:inline-block;background:#2A2926;color:#F5F5F2;padding:12px 22px;text-decoration:none">${esc(draft.buttonLabel)}</a></p>`;
  const footer = `<br><br>You are receiving this because you joined the ${esc(settings.businessName)} Collector List. <a href="${unsubscribeUrl}" style="color:#77726A">Unsubscribe</a>`;

  const text = [
    draft.heading,
    "",
    paragraphs(draft.intro).join("\n\n"),
    "",
    artworks.map((a) => `${a.title} — ${cardPrice(a, draft.cardMode)}\n${cardLink(a, draft.cardMode)}`).join("\n\n"),
    "",
    paragraphs(draft.closing).join("\n\n"),
    "",
    `${draft.buttonLabel}: ${buttonHref}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
  return { html: layout(settings, body, footer), text };
}

function unsubscribeLinks(token: string) {
  const page = `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
  const oneClick = `${siteUrl()}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  return { page, headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}

export async function subscribedCollectors() {
  return db.query.collectors.findMany({
    where: isNull(schema.collectors.unsubscribedAt),
    columns: { email: true, unsubscribeToken: true },
  });
}

export async function sendCampaignToCollectors(draft: CampaignDraft, artworks: CardArtwork[], settings: Settings) {
  const people = await subscribedCollectors();
  const mails: Mail[] = people.map((c) => {
    const { page, headers } = unsubscribeLinks(c.unsubscribeToken);
    const { html, text } = renderCampaign(draft, artworks, settings, page);
    return { to: c.email, subject: draft.subject, html, text, headers };
  });
  const result = await deliverBatch(mails, settings);
  return { ...result, total: people.length };
}

export async function sendCampaignTest(to: string, draft: CampaignDraft, artworks: CardArtwork[], settings: Settings) {
  const { html, text } = renderCampaign(draft, artworks, settings, `${siteUrl()}/unsubscribe`);
  return deliverBatch([{ to, subject: `[Test] ${draft.subject}`, html, text }], settings);
}

/**
 * Ready-written Collector List emails. Text in [square brackets] is a
 * placeholder the admin must replace; sending is blocked until none remain.
 * Selected artworks are inserted between the introduction and the closing.
 */
export type CampaignTemplateKey = "new_original" | "new_collection" | "limited_print" | "sale" | "preview";

export type CampaignDraft = {
  subject: string;
  heading: string;
  intro: string;
  closing: string;
  buttonLabel: string;
  /** Which link and price each artwork card shows. */
  cardMode: "original" | "print";
};

export const CAMPAIGN_TEMPLATES: Record<CampaignTemplateKey, { label: string; hint: string; draft: CampaignDraft }> = {
  new_original: {
    label: "New original",
    hint: "One or two newly finished paintings.",
    draft: {
      subject: "Just finished: a new original from the studio",
      heading: "A new original, before anyone else",
      intro:
        "A new painting has just come off the easel, and as a collector you are hearing about it first.\n\nIt is one of one, signed, and comes with a Certificate of Authenticity.",
      closing:
        "If it speaks to you, you can buy it online now. Once an original is sold, it is gone.\n\nReply to this email if you would like more photos, or to see it in person at the studio in Masaki by appointment.",
      buttonLabel: "View the painting",
      cardMode: "original",
    },
  },
  new_collection: {
    label: "New collection",
    hint: "A group of new works released together.",
    draft: {
      subject: "New collection: [collection name]",
      heading: "[Collection name]",
      intro:
        "A new collection of original paintings is now available.\n\n[One or two sentences about the collection: the idea behind it, the colours, what inspired it.]\n\nCollectors see it first, before it is shared anywhere else.",
      closing:
        "Each painting is one of one. When an original is sold, it is gone, so if one stays with you, do not wait too long.\n\nReply to this email with any questions, or to arrange a studio visit in Masaki.",
      buttonLabel: "See the collection",
      cardMode: "original",
    },
  },
  limited_print: {
    label: "Limited print release",
    hint: "A limited edition print of a painting.",
    draft: {
      subject: "Limited edition print: [painting title]",
      heading: "A limited edition, for collectors first",
      intro:
        "A limited edition print is now available, in an edition of only [number] prints, on 300 GSM archival art paper.\n\nOnce the edition is sold out, it will not be printed again.",
      closing:
        "Choose your size on the print page. Delivery within Dar es Salaam, or collect from Masaki by appointment.\n\nReply to this email with any questions.",
      buttonLabel: "View the print",
      cardMode: "print",
    },
  },
  sale: {
    label: "Sale",
    hint: "A time-limited discount. Set the sale up on the site first.",
    draft: {
      subject: "[10]% off original paintings until [day and date]",
      heading: "A thank-you to collectors",
      intro:
        "For a short time, original paintings are [10]% off, until [day and date].\n\nThe discount is applied automatically at checkout. There is no code to enter.",
      closing:
        "Here are a few works that are still available. When the sale ends, prices return to normal.\n\nThank you for collecting, sharing and supporting this work.",
      buttonLabel: "Shop originals",
      cardMode: "original",
    },
  },
  preview: {
    label: "Collector preview",
    hint: "Early access before you announce new work publicly.",
    draft: {
      subject: "Collector preview: [collection or painting name]",
      heading: "An early look, for collectors only",
      intro:
        "Before these works are announced publicly on [date], collectors get the first look and the first chance to buy.\n\n[One sentence about the works.]",
      closing:
        "They are on the website now, but this email is the only place they have been announced. If one stays with you, it is yours to claim before anyone else sees it.",
      buttonLabel: "See the works",
      cardMode: "original",
    },
  },
};

/** Returns the placeholders still left in the draft, e.g. ["[collection name]"]. */
export function unfilledPlaceholders(d: Pick<CampaignDraft, "subject" | "heading" | "intro" | "closing" | "buttonLabel">): string[] {
  const all = [d.subject, d.heading, d.intro, d.closing, d.buttonLabel].join("\n").match(/\[[^\]\n]{1,120}\]/g) ?? [];
  return [...new Set(all)];
}

import "server-only";
import { formatDate, formatMoney, isGiftCardOnly, orderItemLabel, PAYMENT_STATUS_LABELS } from "./format";
import { formatGiftCode } from "./gift-card-rules";
import type { Settings } from "./settings";
import type { GiftCard, Order, OrderItem } from "@/db/schema";

/**
 * Transactional email via Resend's HTTP API (https://resend.com).
 * Set RESEND_API_KEY and EMAIL_FROM to enable. If either is missing, emails are
 * skipped and logged — orders still work, because email is optional.
 *
 * To switch providers, replace `deliver()` only.
 */
export type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> };

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function deliver(mail: Mail, settings: Settings): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!settings.emailEnabled) return false;
  if (!key || !from) {
    console.info(`[email] skipped (RESEND_API_KEY / EMAIL_FROM not set): "${mail.subject}" to ${mail.to}`);
    return false;
  }
  const fromHeader = from.includes("<") ? from : `${settings.emailFromName} <${from}>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromHeader,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo || settings.emailReplyTo || undefined,
        headers: mail.headers,
      }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send error", err);
    return false;
  }
}

export const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function layout(settings: Settings, body: string, footer = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#F5F5F2;font-family:Georgia,'Times New Roman',serif;color:#2A2926">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;padding:36px 32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:26px;letter-spacing:0.02em;padding-bottom:24px">${esc(settings.businessName)}</td></tr>
<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#77726A;padding-top:28px;border-top:1px solid #E6E3DC">
${esc(settings.location)}${settings.phone ? ` &nbsp;|&nbsp; ${esc(settings.phone)}` : ""}${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(order: Order, items: OrderItem[]): string {
  const rows = items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EEE">${esc(i.title)}<br><span style="color:#77726A;font-size:13px">${esc(
        orderItemLabel(i, true),
      )} &times; ${i.quantity}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #EEE">${formatMoney(
        i.lineTotal,
        order.currency,
      )}</td></tr>`,
    )
    .join("");
  const delivery = isGiftCardOnly(items)
    ? ""
    : `<tr><td style="padding:8px 0">Delivery${order.deliveryZoneName ? ` (${esc(order.deliveryZoneName)})` : ""}</td><td align="right">${
        order.deliveryFeeToBeConfirmed ? "To be confirmed" : formatMoney(order.deliveryFee, order.currency)
      }</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${rows}
${delivery}${
    order.discountTotal > 0
      ? `<tr><td style="padding:8px 0">Discount${order.discountCode ? ` (${esc(order.discountCode)})` : ""}</td><td align="right">&minus;${formatMoney(order.discountTotal, order.currency)}</td></tr>`
      : ""
  }${
    order.giftCardTotal > 0
      ? `<tr><td style="padding:8px 0">Paid with gift card</td><td align="right">&minus;${formatMoney(order.giftCardTotal, order.currency)}</td></tr>`
      : ""
  }
<tr><td style="padding:8px 0;font-weight:bold">Total</td><td align="right" style="font-weight:bold">${formatMoney(order.total, order.currency)}</td></tr></table>`;
}

function orderLink(order: Order) {
  return `${siteUrl()}/order/${encodeURIComponent(order.orderNumber)}?key=${encodeURIComponent(order.accessToken)}`;
}

export async function sendOrderReceived(order: Order, items: OrderItem[], settings: Settings) {
  if (!order.email) return false;
  // Fully paid with a gift card: send the confirmation straight away.
  if (order.paymentStatus === "paid") return sendPaymentConfirmed(order, items, settings);
  const link = orderLink(order);
  const giftOnly = isGiftCardOnly(items);
  const html = layout(
    settings,
    `<p>Dear ${esc(order.customerName)},</p>
<p>Thank you for your purchase. Your order <strong>${esc(order.orderNumber)}</strong> has been received on ${formatDate(order.createdAt)}.</p>
${itemsTable(order, items)}
<p><strong>Payment:</strong> ${PAYMENT_STATUS_LABELS[order.paymentStatus]}.<br>
Pay ${formatMoney(order.total, order.currency)} via M-Pesa to <strong>${esc(settings.mpesaNumber)}</strong> (${esc(settings.mpesaAccountName)}), then enter your M-Pesa confirmation code on your order page.</p>
<p><a href="${link}" style="color:#2A2926">View your order and payment instructions</a></p>
<p>${giftOnly ? `The gift card is emailed as soon as the payment is confirmed: ${esc(order.address.replace(/^Gift card, emailed to /, "to "))}.` : `Delivery to: ${esc(order.address)}, ${esc(order.city)}`}</p>`,
  );
  const text = `Thank you for your purchase.\nOrder ${order.orderNumber}\nTotal ${formatMoney(order.total, order.currency)}\nPay via M-Pesa to ${settings.mpesaNumber} (${settings.mpesaAccountName}), then enter your confirmation code: ${link}`;
  return deliver({ to: order.email, subject: `Your MedePaints order ${order.orderNumber}`, html, text }, settings);
}

export async function sendPaymentConfirmed(order: Order, items: OrderItem[], settings: Settings) {
  if (!order.email) return false;
  const giftOnly = isGiftCardOnly(items);
  const how = order.total === 0 && order.giftCardTotal > 0 ? "Your order is paid in full with your gift card" : `We have confirmed your M-Pesa payment for order <strong>${esc(order.orderNumber)}</strong>`;
  const next = giftOnly
    ? "The gift card has been emailed. You can also open it from your order page."
    : `We will call you on ${esc(order.phone)} to arrange delivery.`;
  const html = layout(
    settings,
    `<p>Dear ${esc(order.customerName)},</p>
<p>${how}. ${next}</p>
${itemsTable(order, items)}
<p><a href="${orderLink(order)}" style="color:#2A2926">View your order</a></p>`,
  );
  const text = `Payment confirmed for order ${order.orderNumber}. ${giftOnly ? "The gift card has been emailed." : `We will call you on ${order.phone} to arrange delivery.`}`;
  return deliver({ to: order.email, subject: `Payment confirmed: ${order.orderNumber}`, html, text }, settings);
}

export function giftCardLink(card: Pick<GiftCard, "id" | "accessToken">) {
  return `${siteUrl()}/gift-cards/card/${card.id}?k=${encodeURIComponent(card.accessToken)}`;
}

/** Emails a gift card to the recipient (or the buyer). Returns true when sent. */
export async function sendGiftCard(card: GiftCard, settings: Settings) {
  if (!card.deliverToEmail) return false;
  const amount = formatMoney(card.initialValue, card.currency);
  const forName = card.recipientName ? esc(card.recipientName) : "you";
  const from = card.senderName ? esc(card.senderName) : esc(settings.businessName);
  const html = layout(
    settings,
    `<p style="font-family:Georgia,serif;font-size:22px;margin:0 0 8px">A gift card for ${forName}</p>
<p>${card.recipientName ? `${from} has sent you a ${settings.businessName} gift card.` : `Here is your ${esc(settings.businessName)} gift card.`}</p>
${card.message ? `<p style="border-left:2px solid #2A2926;padding-left:12px;font-style:italic">${esc(card.message)}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#F5F5F2"><tr><td style="padding:24px;text-align:center">
<div style="font-size:13px;color:#77726A;letter-spacing:0.08em;text-transform:uppercase">Gift card value</div>
<div style="font-family:Georgia,serif;font-size:30px;margin:6px 0 14px">${amount}</div>
<div style="font-size:13px;color:#77726A">Your code</div>
<div style="font-size:24px;font-weight:bold;letter-spacing:0.12em;margin-top:4px">${formatGiftCode(card.code)}</div>
<div style="font-size:13px;color:#77726A;margin-top:14px">Valid until ${formatDate(card.expiresAt)}</div>
</td></tr></table>
<p><strong>How to use it:</strong> choose an original painting or a print at <a href="${siteUrl()}" style="color:#2A2926">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a>, then enter the code at checkout. If your order costs less than the card, the rest stays on the card for next time.</p>
<p><a href="${giftCardLink(card)}" style="color:#2A2926">Open your printable gift card</a> (it also shows the remaining balance).</p>`,
  );
  const text = `${card.recipientName ? `${card.senderName ?? settings.businessName} has sent you a ${settings.businessName} gift card.` : `Your ${settings.businessName} gift card.`}
Value: ${amount}
Code: ${formatGiftCode(card.code)}
Valid until ${formatDate(card.expiresAt)}
${card.message ? `Message: ${card.message}\n` : ""}Use it at checkout on ${siteUrl()}. Printable card: ${giftCardLink(card)}`;
  return deliver(
    {
      to: card.deliverToEmail,
      subject: card.recipientName ? `${card.senderName ?? "Someone"} sent you a ${settings.businessName} gift card` : `Your ${settings.businessName} gift card`,
      html,
      text,
    },
    settings,
  );
}

export async function notifyAdmin(subject: string, lines: string[], settings: Settings, adminPath?: string) {
  const to = settings.orderNotificationEmail || process.env.ADMIN_EMAIL;
  if (!to) return false;
  const link = adminPath ? `<p><a href="${siteUrl()}${adminPath}">Open in admin</a></p>` : "";
  const html = layout(settings, lines.map((l) => `<p style="margin:0 0 6px">${esc(l)}</p>`).join("") + link);
  return deliver({ to, subject, html, text: lines.join("\n") }, settings);
}

export async function sendCollectorWelcome(email: string, unsubscribeToken: string, settings: Settings) {
  const unsub = `${siteUrl()}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const html = layout(
    settings,
    `<p>You are on the MedePaints Collector List.</p>
<p>You will be the first to hear about new original artworks, limited prints and exclusive collector releases. We write rarely, only when there is new work.</p>`,
    `<br><br>You joined the list at checkout. <a href="${unsub}" style="color:#77726A">Unsubscribe</a> at any time.`,
  );
  return deliver(
    {
      to: email,
      subject: "Welcome to the MedePaints Collector List",
      html,
      text: `You are on the MedePaints Collector List. Unsubscribe at any time: ${unsub}`,
      headers: { "List-Unsubscribe": `<${unsub}>` },
    },
    settings,
  );
}

/** True when Resend is configured and email is switched on in Settings. */
export function emailConfigured(settings: Settings): boolean {
  return Boolean(settings.emailEnabled && process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends many emails through Resend's batch endpoint (up to 100 per request).
 * Returns how many were accepted and how many failed.
 */
export async function deliverBatch(mails: Mail[], settings: Settings): Promise<{ sent: number; failed: number }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!emailConfigured(settings) || !key || !from) return { sent: 0, failed: mails.length };
  const fromHeader = from.includes("<") ? from : `${settings.emailFromName} <${from}>`;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          chunk.map((m) => ({
            from: fromHeader,
            to: [m.to],
            subject: m.subject,
            html: m.html,
            text: m.text,
            reply_to: m.replyTo || settings.emailReplyTo || undefined,
            headers: m.headers,
          })),
        ),
      });
      if (res.ok) sent += chunk.length;
      else {
        failed += chunk.length;
        console.error("[email] batch failed", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      failed += chunk.length;
      console.error("[email] batch error", err);
    }
  }
  return { sent, failed };
}

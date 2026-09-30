import "server-only";
import { formatDate, formatMoney, PAYMENT_STATUS_LABELS } from "./format";
import type { Settings } from "./settings";
import type { Order, OrderItem } from "@/db/schema";

/**
 * Transactional email via Resend's HTTP API (https://resend.com).
 * Set RESEND_API_KEY and EMAIL_FROM to enable. If either is missing, emails are
 * skipped and logged — orders still work, because email is optional.
 *
 * To switch providers, replace `deliver()` only.
 */
type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> };

function siteUrl(): string {
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

const esc = (s: string | null | undefined) =>
  (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(settings: Settings, body: string, footer = ""): string {
  return `<!doctype html><html><body style="margin:0;background:#F5F5F2;font-family:Georgia,'Times New Roman',serif;color:#2A2926">
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
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #EEE">${esc(i.title)}<br><span style="color:#77726A;font-size:13px">${
        i.itemType === "original" ? "Original" : `Print, ${esc(i.sizeLabel)}`
      } &times; ${i.quantity}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #EEE">${formatMoney(
        i.lineTotal,
        order.currency,
      )}</td></tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${rows}
<tr><td style="padding:8px 0">Delivery${order.deliveryZoneName ? ` (${esc(order.deliveryZoneName)})` : ""}</td><td align="right">${
    order.deliveryFeeToBeConfirmed ? "To be confirmed" : formatMoney(order.deliveryFee, order.currency)
  }</td></tr>
<tr><td style="padding:8px 0;font-weight:bold">Total</td><td align="right" style="font-weight:bold">${formatMoney(order.total, order.currency)}</td></tr></table>`;
}

function orderLink(order: Order) {
  return `${siteUrl()}/order/${encodeURIComponent(order.orderNumber)}?key=${encodeURIComponent(order.accessToken)}`;
}

export async function sendOrderReceived(order: Order, items: OrderItem[], settings: Settings) {
  if (!order.email) return false;
  const link = orderLink(order);
  const html = layout(
    settings,
    `<p>Dear ${esc(order.customerName)},</p>
<p>Thank you for your purchase. Your order <strong>${esc(order.orderNumber)}</strong> has been received on ${formatDate(order.createdAt)}.</p>
${itemsTable(order, items)}
<p><strong>Payment:</strong> ${PAYMENT_STATUS_LABELS[order.paymentStatus]}.<br>
Pay ${formatMoney(order.total, order.currency)} via M-Pesa to <strong>${esc(settings.mpesaNumber)}</strong> (${esc(settings.mpesaAccountName)}), then enter your M-Pesa confirmation code on your order page.</p>
<p><a href="${link}" style="color:#2A2926">View your order and payment instructions</a></p>
<p>Delivery to: ${esc(order.address)}, ${esc(order.city)}</p>`,
  );
  const text = `Thank you for your purchase.\nOrder ${order.orderNumber}\nTotal ${formatMoney(order.total, order.currency)}\nPay via M-Pesa to ${settings.mpesaNumber} (${settings.mpesaAccountName}), then enter your confirmation code: ${link}`;
  return deliver({ to: order.email, subject: `Your MedePaints order ${order.orderNumber}`, html, text }, settings);
}

export async function sendPaymentConfirmed(order: Order, items: OrderItem[], settings: Settings) {
  if (!order.email) return false;
  const html = layout(
    settings,
    `<p>Dear ${esc(order.customerName)},</p>
<p>We have confirmed your M-Pesa payment for order <strong>${esc(order.orderNumber)}</strong>. We will call you on ${esc(order.phone)} to arrange delivery.</p>
${itemsTable(order, items)}
<p><a href="${orderLink(order)}" style="color:#2A2926">View your order</a></p>`,
  );
  const text = `Payment confirmed for order ${order.orderNumber}. We will call you on ${order.phone} to arrange delivery.`;
  return deliver({ to: order.email, subject: `Payment confirmed: ${order.orderNumber}`, html, text }, settings);
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

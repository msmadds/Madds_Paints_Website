/** Formatting helpers shared by server and client code. */

export function formatMoney(amount: number | null | undefined, currency = "TZS"): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "";
  const n = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(amount);
  return `${currency} ${n}`;
}

/** Long-form date, e.g. "21 April 2026". */
export function formatDate(value: Date | string | null | undefined, withTime = false): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(d);
  if (!withTime) return date;
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dar_es_Salaam",
  }).format(d);
  return `${date}, ${time}`;
}

function trimNum(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "60 × 80 cm" or "60 × 80 × 4 cm". Height first is gallery convention. */
export function formatDimensions(
  width: string | number | null | undefined,
  height: string | number | null | undefined,
  depth?: string | number | null,
): string {
  const w = trimNum(width);
  const h = trimNum(height);
  const d = trimNum(depth ?? null);
  if (!w || !h) return "";
  return d ? `${h} × ${w} × ${d} cm` : `${h} × ${w} cm`;
}

export const ORDER_STATUS_LABELS = {
  pending_payment: "Pending Payment",
  payment_verification: "Payment Verification",
  paid: "Paid",
  processing: "Processing",
  ready_for_delivery: "Ready for Delivery",
  shipped_delivered: "Shipped / Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export const PAYMENT_STATUS_LABELS = {
  unpaid: "Awaiting payment",
  pending_verification: "Payment Pending / Verification Required",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
} as const;

export const ARTWORK_STATUS_LABELS = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
} as const;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

/** Group digits for display: +255 712 345 678 / 0712 345 678 */
export function formatPhone(p: string): string {
  const s = p.replace(/\s+/g, "");
  const m = s.match(/^\+255(\d{3})(\d{3})(\d{3})$/);
  if (m) return `+255 ${m[1]} ${m[2]} ${m[3]}`;
  const l = s.match(/^0(\d{3})(\d{3})(\d{3})$/);
  if (l) return `0${l[1]} ${l[2]} ${l[3]}`;
  return p;
}

import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** Human-friendly order number, e.g. MP-260930-7KQ4. */
export function generateOrderNumber(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return `MP-${get("year")}${get("month")}${get("day")}-${suffix}`;
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

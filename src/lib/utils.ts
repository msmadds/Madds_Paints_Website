export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Normalise Tanzanian mobile numbers to +255XXXXXXXXX; returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s\-().]/g, "");
  if (/^0[67]\d{8}$/.test(raw)) return `+255${raw.slice(1)}`;
  if (/^255[67]\d{8}$/.test(raw)) return `+${raw}`;
  if (/^\+255[67]\d{8}$/.test(raw)) return raw;
  // Accept other international numbers in E.164 form (future international orders).
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  return null;
}

export function whatsappLink(phone: string, text?: string): string | null {
  const n = normalizePhone(phone);
  if (!n) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${n.replace("+", "")}${q}`;
}

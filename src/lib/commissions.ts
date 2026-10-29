/** "2026-10" for the current month in Dar es Salaam. */
export function currentMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", year: "numeric", month: "2-digit" }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** "October 2026" for the current month in Dar es Salaam. */
export function currentMonthName(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", month: "long", year: "numeric" }).format(now);
}

/** Places booked this month. A count saved in an earlier month resets to 0 on the 1st. */
export function bookedThisMonth(s: { commissionsBooked: number; commissionsBookedMonth: string; commissionsCapacity: number }, now = new Date()) {
  const booked = s.commissionsBookedMonth === currentMonthKey(now) ? s.commissionsBooked : 0;
  return Math.min(booked, s.commissionsCapacity);
}

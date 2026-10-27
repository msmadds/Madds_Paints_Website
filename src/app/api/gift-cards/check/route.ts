import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth";
import { findGiftCardByCode, giftCardProblem } from "@/lib/gift-cards";
import { formatGiftCode } from "@/lib/gift-card-rules";

/** Checks a gift card code at checkout and returns its balance. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = z.object({ code: z.string().trim().min(1).max(40) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter your gift card code." }, { status: 422 });

  // Wrong guesses are limited per connection so codes cannot be guessed.
  const key = `giftcard:${await clientIp()}`;
  if (await isRateLimited(key, 10, 15)) {
    return NextResponse.json({ error: "Too many attempts. Wait 15 minutes, then try again." }, { status: 429 });
  }
  const card = await findGiftCardByCode(parsed.data.code);
  const problem = giftCardProblem(card);
  if (problem || !card) {
    await recordAttempt(key, false);
    return NextResponse.json({ error: problem }, { status: 404 });
  }
  return NextResponse.json({
    code: formatGiftCode(card.code),
    balance: card.balance,
    currency: card.currency,
    expiresAt: card.expiresAt.toISOString(),
  });
}

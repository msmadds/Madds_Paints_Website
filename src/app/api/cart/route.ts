import { NextResponse } from "next/server";
import { z } from "zod";
import { cartSchema } from "@/lib/validation";
import { resolveCart } from "@/lib/cart-resolve";
import { originalsDiscount } from "@/lib/promotion";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = z.object({ items: cartSchema }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  try {
    const lines = await resolveCart(parsed.data.items);
    const discount = originalsDiscount(
      lines.filter((l) => l.available).map((l) => ({ kind: l.kind, lineTotal: l.unitPrice * l.quantity })),
    );
    return NextResponse.json({ lines, discount });
  } catch (err) {
    console.error("[api/cart]", err);
    return NextResponse.json({ error: "Could not load your cart. Refresh the page to try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payments";
import { confirmAutomaticPayment } from "@/lib/orders";

/**
 * Callback endpoint for automatic payment gateways, e.g.
 *   https://your-domain/api/payments/webhook/mpesa_api
 * Each provider authenticates its own callbacks inside `handleWebhook`.
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await ctx.params;
  const provider = getProvider(id);
  if (!provider?.handleWebhook || provider.kind !== "automatic" || !provider.isConfigured({} as never)) {
    return NextResponse.json({ error: "Provider not enabled." }, { status: 404 });
  }
  try {
    const result = await provider.handleWebhook(req);
    await confirmAutomaticPayment(provider.id, result);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[webhook:${id}]`, err);
    return NextResponse.json({ error: "Rejected." }, { status: 400 });
  }
}

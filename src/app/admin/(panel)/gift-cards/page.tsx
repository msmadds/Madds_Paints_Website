import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { formatGiftCode } from "@/lib/gift-card-rules";
import { giftCardProblem } from "@/lib/gift-cards";
import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/components/admin/buttons";
import { Checkbox, Flash, Input, PageTitle, Panel, Pill, Textarea } from "@/components/admin/ui";
import { issueGiftCardAction, resendGiftCardAction, setGiftCardStatusAction } from "../../actions";

export const metadata = { title: "Gift cards" };

type Props = { searchParams: Promise<{ q?: string; ok?: string; error?: string }> };

export default async function GiftCardsAdmin({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const code = q.toUpperCase().replace(/[\s-]/g, "");
  const settings = await getSettings();
  const cards = await db.query.giftCards.findMany({
    where: q
      ? or(
          ilike(schema.giftCards.code, `%${code}%`),
          ilike(schema.giftCards.deliverToEmail, `%${q}%`),
          ilike(schema.giftCards.recipientName, `%${q}%`),
          ilike(schema.giftCards.senderName, `%${q}%`),
        )
      : undefined,
    orderBy: [desc(schema.giftCards.createdAt)],
    limit: 200,
    with: {
      purchaseOrder: { columns: { id: true, orderNumber: true } },
      redemptions: { with: { order: { columns: { id: true, orderNumber: true } } } },
    },
  });
  const outstanding = cards.filter((c) => !giftCardProblem(c)).reduce((s, c) => s + c.balance, 0);

  return (
    <div className="max-w-6xl">
      <PageTitle
        actions={
          <Link href="/gift-cards" target="_blank" className="link text-[0.9375rem]">
            View the Gift cards page
          </Link>
        }
      >
        Gift cards
      </PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <p className="mb-6 text-[0.9375rem] text-stone">
        Cards bought on the website are created and emailed automatically when you verify the M-Pesa payment.
        {!q && ` Unspent balance on active cards: ${formatMoney(outstanding, settings.currency)}.`}
      </p>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search by code, email or name" className="field" aria-label="Search gift cards" />
            <button className="btn btn-secondary shrink-0">Search</button>
            {q && <Link href="/admin/gift-cards" className="btn min-h-10 shrink-0 px-3 text-[0.875rem] underline underline-offset-4">Clear</Link>}
          </form>

          {cards.length === 0 && <p className="py-10 text-stone">{q ? "No gift cards match." : "No gift cards yet."}</p>}

          {cards.map((c) => {
            const problem = giftCardProblem(c);
            return (
              <Panel key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[1.25rem] font-semibold tracking-wider tabular-nums">{formatGiftCode(c.code)}</p>
                    <p className="text-[0.875rem]">
                      {formatMoney(c.balance, c.currency)} left of {formatMoney(c.initialValue, c.currency)} · valid until {formatDate(c.expiresAt)}
                    </p>
                  </div>
                  <Pill value={problem ? "cancelled" : "paid"}>{c.status === "disabled" ? "Disabled" : problem ? (c.balance <= 0 ? "Used" : "Expired") : "Active"}</Pill>
                </div>
                <dl className="mt-3 grid gap-1 text-[0.875rem] sm:grid-cols-2">
                  <div>
                    <dt className="inline text-stone">For: </dt>
                    <dd className="inline">{c.recipientName ?? "the buyer"}{c.deliverToEmail ? ` (${c.deliverToEmail})` : ""}</dd>
                  </div>
                  <div>
                    <dt className="inline text-stone">From: </dt>
                    <dd className="inline">{c.senderName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-stone">Source: </dt>
                    <dd className="inline">
                      {c.purchaseOrder ? (
                        <Link href={`/admin/orders/${c.purchaseOrder.id}`} className="underline">Order {c.purchaseOrder.orderNumber}</Link>
                      ) : (
                        `Issued by ${c.issuedBy}`
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-stone">Email: </dt>
                    <dd className="inline">{c.emailedAt ? `sent ${formatDate(c.emailedAt, true)}` : "not sent"}</dd>
                  </div>
                </dl>
                {c.message && <p className="mt-2 text-[0.875rem] text-stone">“{c.message}”</p>}
                {c.redemptions.length > 0 && (
                  <ul className="mt-3 border-t border-rule pt-3 text-[0.875rem]">
                    {c.redemptions.map((r) => (
                      <li key={r.id}>
                        {formatMoney(r.amount, c.currency)} on{" "}
                        <Link href={`/admin/orders/${r.order.id}`} className="underline">{r.order.orderNumber}</Link>, {formatDate(r.createdAt)}
                        {r.reversedAt && <span className="text-stone"> (order cancelled, restored to card)</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-rule pt-4">
                  <form action={resendGiftCardAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="q" value={q} />
                    <input name="email" type="email" placeholder={c.deliverToEmail ?? "Email address"} aria-label="Send to" className="field min-h-11 w-60" />
                    <SubmitButton variant="secondary" pendingText="Sending…">{c.emailedAt ? "Resend email" : "Send email"}</SubmitButton>
                  </form>
                  <form action={setGiftCardStatusAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="q" value={q} />
                    <input type="hidden" name="status" value={c.status === "active" ? "disabled" : "active"} />
                    {c.status === "active" ? (
                      <SubmitButton variant="danger" confirm="Disable this gift card? It will no longer work at checkout.">Disable</SubmitButton>
                    ) : (
                      <SubmitButton variant="quiet">Enable</SubmitButton>
                    )}
                  </form>
                </div>
              </Panel>
            );
          })}
        </div>

        <div className="lg:col-span-4">
          <Panel title="Issue a gift card" description="For a giveaway, a refund or a card paid outside the website. It is valid for 12 months.">
            <form action={issueGiftCardAction} className="grid gap-4">
              <Input label="Amount (TZS)" name="amount" inputMode="numeric" required placeholder="100000" />
              <Input label="Recipient's name (optional)" name="recipientName" />
              <Input label="Email to send it to" name="deliverToEmail" type="email" />
              <Input label="From" name="senderName" defaultValue={settings.businessName} />
              <Textarea label="Message (optional)" name="message" rows={3} maxLength={300} />
              <Checkbox label="Email the card now" name="send" defaultChecked />
              <SubmitButton>Issue gift card</SubmitButton>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}

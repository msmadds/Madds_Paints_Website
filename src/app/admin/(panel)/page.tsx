import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from "@/lib/format";
import { Panel, PageTitle, Pill } from "@/components/admin/ui";
import { getSettings } from "@/lib/settings";
import { releaseExpiredHolds } from "@/lib/orders";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  await releaseExpiredHolds();
  const settings = await getSettings();
  const counts = await db
    .select({ status: schema.orders.status, n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .groupBy(schema.orders.status);
  const c = Object.fromEntries(counts.map((r) => [r.status, r.n])) as Record<string, number>;
  const [collectors] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.collectors)
    .where(sql`${schema.collectors.unsubscribedAt} is null`);
  const [unread] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.contactMessages).where(eq(schema.contactMessages.handled, false));
  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.orders.total}),0)::int` })
    .from(schema.orders)
    .where(eq(schema.orders.paymentStatus, "paid"));
  const toVerify = await db.query.orders.findMany({
    where: eq(schema.orders.status, "payment_verification"),
    orderBy: [desc(schema.orders.updatedAt)],
    limit: 10,
  });
  const toFulfil = await db.query.orders.findMany({
    where: inArray(schema.orders.status, ["paid", "processing", "ready_for_delivery"]),
    orderBy: [desc(schema.orders.paidAt)],
    limit: 10,
  });

  const stats = [
    { label: "Payments to verify", value: c.payment_verification ?? 0, href: "/admin/orders?status=payment_verification" },
    { label: "Awaiting payment", value: c.pending_payment ?? 0, href: "/admin/orders?status=pending_payment" },
    { label: "To fulfil", value: (c.paid ?? 0) + (c.processing ?? 0) + (c.ready_for_delivery ?? 0), href: "/admin/orders?status=to_fulfil" },
    { label: "Collectors", value: collectors.n, href: "/admin/collectors" },
    { label: "Unread messages", value: unread.n, href: "/admin/messages" },
  ];

  return (
    <div className="max-w-6xl">
      <PageTitle>Overview</PageTitle>
      {!settings.mpesaNumber && (
        <div className="mb-6 border border-reddot bg-white px-4 py-3 text-[0.9375rem]">
          The M-Pesa number is not set, so customers cannot see where to pay.{" "}
          <Link href="/admin/settings" className="underline">Add it in Settings</Link>.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="border border-rule bg-white p-4 hover:border-graphite">
            <p className="text-[2rem] leading-none font-semibold tabular-nums">{s.value}</p>
            <p className="mt-2 text-[0.8125rem] text-stone">{s.label}</p>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[0.875rem] text-stone">Paid sales to date: {formatMoney(revenue.total, settings.currency)}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Payments to verify" description="Check each code against your M-Pesa statement before verifying.">
          <OrderList orders={toVerify} empty="No payments waiting." />
        </Panel>
        <Panel title="Paid orders to fulfil">
          <OrderList orders={toFulfil} empty="Nothing to fulfil right now." />
        </Panel>
      </div>
    </div>
  );
}

function OrderList({ orders, empty }: { orders: (typeof schema.orders.$inferSelect)[]; empty: string }) {
  if (!orders.length) return <p className="text-[0.9375rem] text-stone">{empty}</p>;
  return (
    <ul className="divide-y divide-rule">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-wall">
            <span>
              <span className="block font-semibold tabular-nums">{o.orderNumber}</span>
              <span className="block text-[0.8125rem] text-stone">{o.customerName}, {formatDate(o.createdAt)}</span>
            </span>
            <span className="text-right">
              <span className="block tabular-nums">{formatMoney(o.total, o.currency)}</span>
              <Pill value={o.status}>{ORDER_STATUS_LABELS[o.status]}</Pill>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

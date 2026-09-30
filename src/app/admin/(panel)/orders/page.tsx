import Link from "next/link";
import { and, desc, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDate, formatMoney, formatPhone, ORDER_STATUS_LABELS } from "@/lib/format";
import { Flash, PageTitle, Pill } from "@/components/admin/ui";
import { orderStatus, type OrderStatus } from "@/db/schema";
import { releaseExpiredHolds } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const metadata = { title: "Orders" };

const FILTERS: { value: string; label: string; statuses?: OrderStatus[] }[] = [
  { value: "all", label: "All" },
  { value: "payment_verification", label: "Payment Verification", statuses: ["payment_verification"] },
  { value: "pending_payment", label: "Pending Payment", statuses: ["pending_payment"] },
  { value: "to_fulfil", label: "To fulfil", statuses: ["paid", "processing", "ready_for_delivery"] },
  { value: "shipped_delivered", label: "Shipped / Delivered", statuses: ["shipped_delivered"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  await releaseExpiredHolds();
  const filter = FILTERS.find((f) => f.value === sp.status) ?? FILTERS[0];
  const q = (sp.q ?? "").trim();
  const where: SQL[] = [];
  if (filter.statuses) where.push(inArray(schema.orders.status, filter.statuses.filter((s) => orderStatus.enumValues.includes(s))));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(schema.orders.orderNumber, like), ilike(schema.orders.customerName, like), ilike(schema.orders.phone, like), ilike(schema.orders.email, like))!);
  }
  const orders = await db.query.orders.findMany({
    where: where.length ? and(...where) : undefined,
    orderBy: [desc(schema.orders.createdAt)],
    limit: 200,
    with: { items: true, payments: true },
  });

  return (
    <div className="max-w-6xl">
      <PageTitle>Orders</PageTitle>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/orders" : `/admin/orders?status=${f.value}`}
            className={cn("inline-flex h-9 items-center rounded-full border px-3 text-[0.8125rem]", filter.value === f.value ? "border-graphite bg-graphite text-wall" : "border-rule bg-white")}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <form className="mb-6 flex gap-2">
        {filter.value !== "all" && <input type="hidden" name="status" value={filter.value} />}
        <input name="q" defaultValue={q} placeholder="Search order number, name, phone or email" className="field max-w-md" aria-label="Search orders" />
        <button className="btn btn-secondary" type="submit">Search</button>
      </form>

      {orders.length === 0 ? (
        <p className="text-stone">No orders match.</p>
      ) : (
        <div className="overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-[56rem] text-left text-[0.875rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-stone">
              <tr>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Items</th>
                <th className="p-3 font-medium">Total</th>
                <th className="p-3 font-medium">M-Pesa code</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {orders.map((o) => (
                <tr key={o.id} className="align-top hover:bg-wall">
                  <td className="p-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold tabular-nums underline-offset-4 hover:underline">{o.orderNumber}</Link>
                    <p className="text-[0.75rem] text-stone">{formatDate(o.createdAt, true)}</p>
                  </td>
                  <td className="p-3">
                    <p>{o.customerName}</p>
                    <p className="text-[0.75rem] text-stone">{formatPhone(o.phone)}</p>
                    {o.email && <p className="text-[0.75rem] text-stone">{o.email}</p>}
                    <p className="text-[0.75rem] text-stone">{o.city}</p>
                  </td>
                  <td className="p-3">
                    {o.items.map((i) => (
                      <p key={i.id}>{i.title} <span className="text-stone">({i.itemType === "original" ? "original" : i.sizeLabel}) × {i.quantity}</span></p>
                    ))}
                  </td>
                  <td className="p-3 tabular-nums">{formatMoney(o.total, o.currency)}</td>
                  <td className="p-3 tabular-nums">{o.payments.map((p) => <p key={p.id}>{p.reference} <span className="text-stone">({p.status})</span></p>)}</td>
                  <td className="p-3"><Pill value={o.status}>{ORDER_STATUS_LABELS[o.status]}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

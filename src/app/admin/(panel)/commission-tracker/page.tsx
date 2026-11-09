import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { COMMISSION_JOB_STATUS_LABELS, formatDate, formatMoney } from "@/lib/format";
import { balanceDue, contactSuggestions, isOpen, isOverdue, paidSoFar, todayKey, type JobWithPayments } from "@/lib/commission-tracker";
import { SubmitButton } from "@/components/admin/buttons";
import { CommissionJobFields, CommissionPaymentFields } from "@/components/admin/commission-job-fields";
import { Flash, PageTitle, Panel, Pill } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { createCommissionJob } from "../../actions";

export const metadata = { title: "Commission tracker" };

const FILTERS: { value: string; label: string; test: (j: JobWithPayments) => boolean }[] = [
  { value: "open", label: "In hand", test: isOpen },
  { value: "owing", label: "Money owed", test: (j) => balanceDue(j) > 0 },
  { value: "delivered", label: "Delivered", test: (j) => j.status === "delivered" },
  { value: "cancelled", label: "Cancelled", test: (j) => j.status === "cancelled" },
  { value: "all", label: "All", test: () => true },
];

export default async function CommissionTracker({ searchParams }: { searchParams: Promise<{ show?: string; ok?: string; error?: string }> }) {
  const { show, ...sp } = await searchParams;
  const [jobs, suggestions] = await Promise.all([
    db.query.commissionJobs.findMany({
      orderBy: [desc(schema.commissionJobs.createdAt)],
      with: { payments: { columns: { amount: true } } },
    }),
    contactSuggestions(),
  ]);
  const filter = FILTERS.find((f) => f.value === show) ?? FILTERS[0];
  const today = todayKey();
  const rows = jobs.filter(filter.test).sort((a, b) => {
    // Open work by due date (soonest first, undated last); everything else newest first.
    if (isOpen(a) && isOpen(b)) return (a.dueOn ?? "9999") < (b.dueOn ?? "9999") ? -1 : (a.dueOn ?? "9999") > (b.dueOn ?? "9999") ? 1 : 0;
    return 0;
  });

  const live = jobs.filter((j) => j.status !== "cancelled");
  const agreed = live.reduce((s, j) => s + (j.price ?? 0), 0);
  const received = jobs.reduce((s, j) => s + paidSoFar(j), 0);
  const owed = jobs.reduce((s, j) => s + balanceDue(j), 0);
  const overdue = jobs.filter((j) => isOverdue(j, today)).length;

  const stats = [
    { label: "Commissions in hand", value: String(jobs.filter(isOpen).length) },
    { label: "Agreed value (not cancelled)", value: formatMoney(agreed) },
    { label: "Received so far", value: formatMoney(received) },
    { label: "Still owed to you", value: formatMoney(owed) },
  ];

  return (
    <div className="max-w-6xl">
      <PageTitle actions={<a href="#new" className="btn btn-primary">Add commission</a>}>Commission tracker</PageTitle>
      <Flash {...sp} />
      <p className="mb-6 max-w-2xl text-[0.9375rem] text-stone">
        Keep track of commissions agreed outside the website: who they are for, what was agreed, what has been paid and when
        each one is due.
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border border-rule bg-white p-4">
            <p className="text-[1.5rem] leading-none font-semibold tabular-nums">{s.value}</p>
            <p className="mt-2 text-[0.8125rem] text-stone">{s.label}</p>
          </div>
        ))}
      </div>
      {overdue > 0 && (
        <p className="mt-3 text-[0.9375rem] text-reddot">
          {overdue} commission{overdue === 1 ? " is" : "s are"} past the due date.
        </p>
      )}

      <nav className="mt-8 mb-4 flex flex-wrap gap-2 text-[0.875rem]">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "open" ? "/admin/commission-tracker" : `/admin/commission-tracker?show=${f.value}`}
            className={cn("rounded-full border px-3 py-1.5", f.value === filter.value ? "border-graphite bg-graphite text-wall" : "border-rule bg-white hover:border-graphite")}
          >
            {f.label} ({jobs.filter(f.test).length})
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="border border-rule bg-white p-5 text-stone">
          {jobs.length === 0 ? "No commissions yet. Add your first one below." : "Nothing in this list."}
        </p>
      ) : (
        <div className="overflow-x-auto border border-rule bg-white">
          <table className="w-full min-w-[48rem] text-left text-[0.9375rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-stone">
              <tr>
                <th className="p-3 font-medium">Client and commission</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Due</th>
                <th className="p-3 text-right font-medium">Price</th>
                <th className="p-3 text-right font-medium">Paid</th>
                <th className="p-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((j) => {
                const balance = balanceDue(j);
                return (
                  <tr key={j.id} className="hover:bg-wall">
                    <td className="p-3">
                      <Link href={`/admin/commission-tracker/${j.id}`} className="block">
                        <span className="block font-semibold">{j.clientName}</span>
                        <span className="text-[0.875rem] text-stone">{j.title}{j.size && `, ${j.size}`}</span>
                      </Link>
                    </td>
                    <td className="p-3"><Pill value={j.status}>{COMMISSION_JOB_STATUS_LABELS[j.status]}</Pill></td>
                    <td className={cn("p-3 text-[0.875rem]", isOverdue(j, today) && "font-semibold text-reddot")}>
                      {j.status === "delivered" ? (j.deliveredOn ? `Delivered ${formatDate(j.deliveredOn)}` : "Delivered") : formatDate(j.dueOn) || <span className="text-stone">Not set</span>}
                      {isOverdue(j, today) && " (late)"}
                    </td>
                    <td className="p-3 text-right tabular-nums">{j.price === null ? <span className="text-stone">Not agreed</span> : formatMoney(j.price, j.currency)}</td>
                    <td className="p-3 text-right tabular-nums">{formatMoney(paidSoFar(j), j.currency)}</td>
                    <td className={cn("p-3 text-right tabular-nums", balance > 0 && "font-semibold")}>
                      {balance > 0 ? formatMoney(balance, j.currency) : <span className="text-stone">Nothing owed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form action={createCommissionJob} id="new" className="mt-10 scroll-mt-6">
        <Panel title="Add a commission" description="Only the client's name and what the commission is are required. You can fill in the rest later. After saving, the commission opens so you can upload draft images.">
          <CommissionJobFields suggestions={suggestions} />
          <div className="mt-6 border-t border-rule pt-6">
            <CommissionPaymentFields optional />
          </div>
          <div className="mt-6"><SubmitButton>Add commission</SubmitButton></div>
        </Panel>
      </form>
    </div>
  );
}

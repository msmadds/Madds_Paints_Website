import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { COMMISSION_JOB_STATUS_LABELS, formatDate, formatMoney } from "@/lib/format";
import { balanceDue, contactSuggestions, isOverdue, paidSoFar } from "@/lib/commission-tracker";
import { SubmitButton } from "@/components/admin/buttons";
import { CommissionJobFields, CommissionPaymentFields } from "@/components/admin/commission-job-fields";
import { Flash, PageTitle, Panel, Pill } from "@/components/admin/ui";
import { addCommissionPayment, deleteCommissionJob, deleteCommissionPayment, updateCommissionJob } from "../../../actions";

export const metadata = { title: "Commission" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function CommissionJobPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [job, suggestions] = await Promise.all([
    db.query.commissionJobs.findFirst({
      where: eq(schema.commissionJobs.id, id),
      with: { payments: { orderBy: [asc(schema.commissionPayments.paidOn), asc(schema.commissionPayments.createdAt)] } },
    }),
    contactSuggestions(),
  ]);
  if (!job) notFound();
  const paid = paidSoFar(job);
  const balance = balanceDue(job);

  return (
    <div className="max-w-5xl">
      <Link href="/admin/commission-tracker" className="text-[0.875rem] text-stone hover:text-graphite">Commission tracker</Link>
      <PageTitle actions={<Pill value={job.status}>{COMMISSION_JOB_STATUS_LABELS[job.status]}</Pill>}>
        {job.clientName}
      </PageTitle>
      <Flash {...sp} />

      <div className="mb-8 grid grid-cols-3 gap-3">
        {[
          { label: "Agreed price", value: job.price === null ? "Not agreed" : formatMoney(job.price, job.currency) },
          { label: "Received", value: formatMoney(paid, job.currency) },
          { label: job.status === "cancelled" ? "Owed (cancelled)" : "Still owed", value: formatMoney(balance, job.currency) },
        ].map((s) => (
          <div key={s.label} className="border border-rule bg-white p-4">
            <p className="text-[1.375rem] leading-none font-semibold tabular-nums">{s.value}</p>
            <p className="mt-2 text-[0.8125rem] text-stone">{s.label}</p>
          </div>
        ))}
      </div>
      {isOverdue(job) && <p className="-mt-4 mb-8 text-[0.9375rem] text-reddot">This commission was due on {formatDate(job.dueOn)}.</p>}

      <div className="grid gap-8">
        <Panel title="Payments" description="Record each amount as it comes in, such as the deposit and then the balance.">
          {job.payments.length > 0 ? (
            <ul className="mb-6 divide-y divide-rule border border-rule">
              {job.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <span>
                    <span className="block font-semibold tabular-nums">{formatMoney(p.amount, job.currency)}</span>
                    <span className="text-[0.8125rem] text-stone">
                      {[formatDate(p.paidOn), p.method, p.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <form action={deleteCommissionPayment}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="paymentId" value={p.id} />
                    <SubmitButton variant="quiet" pendingText="…" confirm={`Remove the payment of ${formatMoney(p.amount, job.currency)}?`}>Remove</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-[0.9375rem] text-stone">No payments recorded yet.</p>
          )}
          <form action={addCommissionPayment}>
            <input type="hidden" name="jobId" value={job.id} />
            <CommissionPaymentFields />
            <div className="mt-5"><SubmitButton variant="secondary">Record payment</SubmitButton></div>
          </form>
        </Panel>

        <form action={updateCommissionJob}>
          <input type="hidden" name="id" value={job.id} />
          <Panel title="Details">
            <CommissionJobFields job={job} suggestions={suggestions} />
            <div className="mt-6"><SubmitButton>Save</SubmitButton></div>
          </Panel>
        </form>

        <Panel title="Delete commission" description="Deletes this commission and its payment records. To keep a record, set the status to Cancelled instead.">
          <form action={deleteCommissionJob}>
            <input type="hidden" name="id" value={job.id} />
            <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete the commission for ${job.clientName} and its payments?`}>Delete commission</SubmitButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}

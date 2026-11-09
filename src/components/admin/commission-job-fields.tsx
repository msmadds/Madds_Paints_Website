import type { CommissionJob } from "@/db/schema";
import { COMMISSION_JOB_STATUS_LABELS } from "@/lib/format";
import { Input, Select, Textarea } from "./ui";
import { ClientContactFields, type ContactSuggestion } from "./client-contact-fields";

export function CommissionJobFields({ job, suggestions }: { job?: CommissionJob; suggestions: ContactSuggestion[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-6">
      <ClientContactFields name={job?.clientName} contact={job?.clientContact} suggestions={suggestions} />
      <Input label="Commission" name="title" defaultValue={job?.title} required placeholder="Portrait of the family dog" className="md:col-span-4" />
      <Input label="Size" name="size" defaultValue={job?.size} placeholder="60 × 80 cm" className="md:col-span-2" />
      <Input
        label="Agreed price (TZS)"
        name="price"
        inputMode="numeric"
        defaultValue={job?.price ?? ""}
        hint="Whole shillings. Leave empty while it is still an enquiry."
        className="md:col-span-2"
      />
      <Select label="Status" name="status" defaultValue={job?.status ?? "agreed"} className="md:col-span-2">
        {Object.entries(COMMISSION_JOB_STATUS_LABELS).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Select>
      <Input label="Agreed on" name="agreedOn" type="date" defaultValue={job?.agreedOn ?? ""} className="md:col-span-2" />
      <Input label="Due by" name="dueOn" type="date" defaultValue={job?.dueOn ?? ""} className="md:col-span-2" />
      <Input label="Delivered on" name="deliveredOn" type="date" defaultValue={job?.deliveredOn ?? ""} className="md:col-span-2" />
      <Textarea label="What the client asked for" name="details" defaultValue={job?.details} rows={3} className="md:col-span-6" />
      <Textarea label="Notes (private)" name="notes" defaultValue={job?.notes} rows={3} className="md:col-span-6" />
    </div>
  );
}

/** Amount, date, method and note for a payment received. */
export function CommissionPaymentFields({ optional = false }: { optional?: boolean }) {
  return (
    <div className="grid gap-5 md:grid-cols-6">
      <Input
        label={optional ? "Payment received now (optional)" : "Amount received (TZS)"}
        name="paymentAmount"
        inputMode="numeric"
        placeholder="e.g. a deposit"
        className="md:col-span-2"
        id={optional ? "new-payment-amount" : undefined}
      />
      <Input label="Date" name="paymentDate" type="date" className="md:col-span-2" id={optional ? "new-payment-date" : undefined} />
      <Input label="Method" name="paymentMethod" placeholder="M-Pesa, cash, bank" className="md:col-span-2" id={optional ? "new-payment-method" : undefined} />
      <Input label="Note" name="paymentNote" placeholder="Deposit, balance, M-Pesa code…" className="md:col-span-6" id={optional ? "new-payment-note" : undefined} />
    </div>
  );
}

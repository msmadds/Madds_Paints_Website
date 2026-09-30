import { cn } from "@/lib/utils";

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn("mb-6 border px-4 py-3 text-[0.9375rem]", error ? "border-reddot bg-white text-reddot" : "border-verdigris bg-white text-verdigris")}
    >
      {error ?? ok}
    </div>
  );
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="display text-[2.25rem] md:text-[2.75rem]">{children}</h1>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className, description }: { title?: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border border-rule bg-white p-5 md:p-6", className)}>
      {title && <h2 className="text-[1.0625rem] font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-[0.875rem] text-stone">{description}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; name: string };

export function Input({ label, hint, className, ...props }: InputProps) {
  const id = props.id ?? `a-${props.name}-${String(props.form ?? "")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} className="field" {...props} />
      {hint && <p className="mt-1 text-[0.8125rem] text-stone">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, hint, className, rows = 4, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; name: string }) {
  const id = props.id ?? `a-${props.name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <textarea id={id} rows={rows} className="field" {...props} />
      {hint && <p className="mt-1 text-[0.8125rem] text-stone">{hint}</p>}
    </div>
  );
}

export function Select({ label, children, className, hint, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; hint?: string }) {
  const id = props.id ?? `a-${props.name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <select id={id} className="field" {...props}>
        {children}
      </select>
      {hint && <p className="mt-1 text-[0.8125rem] text-stone">{hint}</p>}
    </div>
  );
}

export function Checkbox({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-graphite" {...props} />
      <span>
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {hint && <span className="block text-[0.8125rem] text-stone">{hint}</span>}
      </span>
    </label>
  );
}

const PILL: Record<string, string> = {
  pending_payment: "bg-plinth text-graphite",
  payment_verification: "bg-[#f3e2b8] text-[#5c4410]",
  paid: "bg-[#d7e6de] text-[#24493c]",
  processing: "bg-[#d7e6de] text-[#24493c]",
  ready_for_delivery: "bg-[#d7e6de] text-[#24493c]",
  shipped_delivered: "bg-[#d7e6de] text-[#24493c]",
  completed: "bg-graphite text-wall",
  cancelled: "bg-[#f1d6d3] text-reddot",
  available: "bg-[#d7e6de] text-[#24493c]",
  reserved: "bg-[#f3e2b8] text-[#5c4410]",
  sold: "bg-[#f1d6d3] text-reddot",
};

export function Pill({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap", PILL[value] ?? "bg-plinth")}>
      {children}
    </span>
  );
}

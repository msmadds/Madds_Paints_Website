"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  className,
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(
        "btn",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "danger" && "border border-reddot text-reddot hover:bg-reddot hover:text-white",
        variant === "quiet" && "min-h-10 px-3 text-[0.875rem] underline underline-offset-4",
        className,
      )}
    >
      {pending ? pendingText : children}
    </button>
  );
}

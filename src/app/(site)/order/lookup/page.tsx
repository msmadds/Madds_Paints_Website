import type { Metadata } from "next";
import { LookupForm } from "./lookup-form";

export const metadata: Metadata = { title: "Find my order", robots: { index: false } };

export default function LookupPage() {
  return (
    <div className="mx-auto max-w-xl px-5 pt-12 md:pt-20">
      <h1 className="display text-[2.75rem] md:text-[3.5rem]">Find my order</h1>
      <p className="mt-4 text-stone">
        Enter your order number and the phone number you gave at checkout to see your order, payment instructions and status.
      </p>
      <LookupForm />
    </div>
  );
}

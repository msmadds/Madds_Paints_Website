"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center border border-graphite px-3 text-[0.875rem] font-semibold transition-colors hover:bg-graphite hover:text-wall"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const t = document.createElement("textarea");
          t.value = value;
          document.body.appendChild(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      aria-live="polite"
    >
      {done ? "Copied" : label}
    </button>
  );
}

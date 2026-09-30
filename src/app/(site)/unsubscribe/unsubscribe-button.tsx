"use client";

import { useState } from "react";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  if (state === "done") return <p role="status" className="mt-6 font-semibold">You have been removed from the Collector List.</p>;
  return (
    <div className="mt-8">
      <button
        type="button"
        className="btn btn-primary"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const res = await fetch("/api/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => null);
          if (res?.ok) setState("done");
          else {
            setMsg((await res?.json().catch(() => ({})))?.error ?? "Try again.");
            setState("error");
          }
        }}
      >
        Unsubscribe
      </button>
      {state === "error" && <p className="field-error">{msg}</p>}
    </div>
  );
}

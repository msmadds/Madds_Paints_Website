"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
      {label}
    </button>
  );
}

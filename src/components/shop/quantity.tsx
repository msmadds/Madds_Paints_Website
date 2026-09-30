"use client";

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex h-11 items-center border border-rule bg-white" role="group" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        className="h-full w-11 text-lg disabled:opacity-30"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-8 text-center tabular-nums">{value}</span>
      <button
        type="button"
        className="h-full w-11 text-lg disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

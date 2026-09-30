import Link from "next/link";
import { cn } from "@/lib/utils";

export function ShopTabs({ active }: { active: "originals" | "prints" }) {
  const tab = (key: "originals" | "prints", label: string) => (
    <Link
      href={`/shop/${key}`}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "display pb-2 text-[2.5rem] md:text-[4rem]",
        active === key ? "text-graphite" : "text-stone/60 hover:text-stone",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex items-end gap-6 md:gap-10">
      {tab("originals", "Originals")}
      {tab("prints", "Prints")}
    </div>
  );
}

export function FilterLinks({
  base,
  current,
  options,
}: {
  base: string;
  current: string;
  options: { value: string; label: string; count: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.value === "all" ? base : `${base}?show=${o.value}`}
          scroll={false}
          aria-current={current === o.value ? "true" : undefined}
          className={cn(
            "inline-flex h-10 items-center rounded-full border px-4 text-[0.875rem] transition-colors",
            current === o.value ? "border-graphite bg-graphite text-wall" : "border-rule hover:border-graphite",
          )}
        >
          {o.label}
          <span className={cn("ml-2 tabular-nums", current === o.value ? "text-wall/70" : "text-stone")}>{o.count}</span>
        </Link>
      ))}
    </div>
  );
}

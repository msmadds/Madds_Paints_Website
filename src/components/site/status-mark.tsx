import { cn } from "@/lib/utils";
import type { ArtworkStatus } from "@/db/schema";

/**
 * Gallery convention: a red dot beside a work means it has been sold.
 * Reserved works get an open ring. Available works carry no mark.
 */
export function StatusMark({
  status,
  forSale = true,
  showAvailable = false,
  className,
}: {
  status: ArtworkStatus;
  forSale?: boolean;
  showAvailable?: boolean;
  className?: string;
}) {
  if (!forSale) return <span className={cn("text-stone", className)}>Private collection</span>;
  if (status === "sold")
    return (
      <span className={cn("inline-flex items-center gap-2 font-semibold tracking-wide text-reddot", className)}>
        <span aria-hidden className="inline-block size-2.5 rounded-full bg-reddot" />
        SOLD
      </span>
    );
  if (status === "reserved")
    return (
      <span className={cn("inline-flex items-center gap-2 text-stone", className)}>
        <span aria-hidden className="inline-block size-2.5 rounded-full border border-reddot" />
        Reserved
      </span>
    );
  if (!showAvailable) return null;
  return (
    <span className={cn("inline-flex items-center gap-2 text-verdigris", className)}>
      <span aria-hidden className="inline-block size-2.5 rounded-full bg-verdigris" />
      Available
    </span>
  );
}

/** The small red dot that sits on the corner of a sold work's image. */
export function SoldDot() {
  return (
    <span
      aria-hidden
      className="absolute -right-1.5 -bottom-1.5 size-4 rounded-full bg-reddot ring-4 ring-wall"
      title="Sold"
    />
  );
}

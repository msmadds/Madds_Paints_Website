import { formatDimensions, formatMoney } from "@/lib/format";
import { StatusMark } from "./status-mark";
import { promotionActive, salePrice } from "@/lib/promotion";
import type { Artwork } from "@/db/schema";

/**
 * Museum-style wall label ("tombstone"): title in italic, then medium,
 * dimensions and year on their own lines, then price and status.
 */
export function WallLabel({
  artwork,
  mode = "original",
  printFrom,
  size = "md",
}: {
  artwork: Pick<Artwork, "title" | "medium" | "widthCm" | "heightCm" | "depthCm" | "year" | "price" | "currency" | "status">;
  mode?: "original" | "print" | "gallery";
  printFrom?: number | null;
  size?: "sm" | "md";
}) {
  const dims = formatDimensions(artwork.widthCm, artwork.heightCm, artwork.depthCm);
  return (
    <div className={size === "sm" ? "text-[0.875rem] leading-snug" : "text-[0.9375rem] leading-snug"}>
      <p className={size === "sm" ? "work-title text-[1.125rem]" : "work-title text-[1.3125rem]"}>
        {artwork.title}
        {artwork.year && mode !== "print" ? <span className="not-italic text-stone">, {artwork.year}</span> : null}
      </p>
      {mode === "print" ? (
        <p className="mt-1 text-stone">Fine art print on 300 GSM paper</p>
      ) : (
        <>
          <p className="mt-1 text-stone">{artwork.medium}</p>
          {dims && <p className="text-stone">{dims}</p>}
        </>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {mode === "original" && artwork.price !== null && artwork.status !== "sold" &&
          (artwork.status === "available" && promotionActive() ? (
            <span className="font-medium">
              {formatMoney(salePrice(artwork.price), artwork.currency)}{" "}
              <s className="font-normal text-stone">{formatMoney(artwork.price, artwork.currency)}</s>
            </span>
          ) : (
            <span className="font-medium">{formatMoney(artwork.price, artwork.currency)}</span>
          ))}
        {mode === "print" && printFrom != null && (
          <span className="font-medium">From {formatMoney(printFrom, artwork.currency)}</span>
        )}
        {mode !== "print" && (
          <StatusMark status={artwork.status} forSale={artwork.price !== null} showAvailable={mode === "original"} />
        )}
      </div>
    </div>
  );
}

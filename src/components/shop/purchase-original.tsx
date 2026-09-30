"use client";

import { useRouter } from "next/navigation";
import { useCart } from "./cart-context";

export function PurchaseOriginal({ artworkId, label, sticky }: { artworkId: string; label: string; sticky?: boolean }) {
  const { addOriginal } = useCart();
  const router = useRouter();
  return (
    <button
      type="button"
      className={sticky ? "btn btn-primary flex-1" : "btn btn-primary w-full sm:w-auto sm:min-w-64"}
      onClick={() => {
        addOriginal(artworkId);
        router.push("/cart");
      }}
    >
      {label}
    </button>
  );
}

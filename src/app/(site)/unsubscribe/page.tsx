import type { Metadata } from "next";
import { UnsubscribeButton } from "./unsubscribe-button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-5 pt-16 md:pt-24">
      <h1 className="display text-[2.75rem]">Collector List</h1>
      {token ? (
        <>
          <p className="mt-4 text-stone">
            Unsubscribe from MedePaints collector emails. Your past orders are not affected.
          </p>
          <UnsubscribeButton token={token} />
        </>
      ) : (
        <p className="mt-4 text-stone">This unsubscribe link is incomplete. Use the link at the bottom of any MedePaints email, or contact us and we will remove you.</p>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import { CollectorSignup } from "@/components/site/collector-signup";
import { WhatsAppChannel } from "@/components/site/whatsapp-channel";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Collector List",
  description: "Hear first when a new original is finished, when a limited print is released, and when there is a collector-only preview.",
};

export default async function CollectorListPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-[88rem] px-5 pt-10 md:px-10 md:pt-16">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="display text-[3rem] md:text-[5rem]">The Collector List</h1>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <p className="text-body max-w-xl">
            Collectors hear first when a new original is finished, when a limited print is released, and when there is a
            collector-only preview.
          </p>
          <p className="mt-4 max-w-xl text-stone">
            Joining is free and optional. You never need an account to buy, and you can unsubscribe from any email in one click.
          </p>
          <div className="mt-10">
            <CollectorSignup id="cl-page" />
          </div>
          <WhatsAppChannel url={settings.whatsappChannelUrl} />
        </div>
      </div>
    </div>
  );
}

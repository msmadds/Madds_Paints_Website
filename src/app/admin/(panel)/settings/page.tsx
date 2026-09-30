import { getSettings } from "@/lib/settings";
import { SubmitButton } from "@/components/admin/buttons";
import { Checkbox, Flash, Input, PageTitle, Panel, Select, Textarea } from "@/components/admin/ui";
import { saveSettingsAction } from "../../actions";

export const metadata = { title: "Settings" };

export default async function SettingsAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return (
    <div className="max-w-4xl">
      <PageTitle>Settings</PageTitle>
      <Flash {...sp} />
      <form action={saveSettingsAction} className="space-y-6">
        <Panel title="M-Pesa payment" description="Shown to customers after they place an order. PINs are never collected.">
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="M-Pesa number or Lipa Namba" name="mpesaNumber" defaultValue={s.mpesaNumber} placeholder="0712 345 678" />
            <Input label="Name the customer will see" name="mpesaAccountName" defaultValue={s.mpesaAccountName} hint="Must match the name M-Pesa shows when paying." />
            <Select label="Payment type" name="mpesaPaymentType" defaultValue={s.mpesaPaymentType}>
              <option value="send_money">Send Money to a phone number</option>
              <option value="lipa_namba">Lipa kwa M-Pesa (Lipa Namba)</option>
            </Select>
            <Input label="Hold time (hours)" name="holdHours" inputMode="numeric" defaultValue={s.holdHours} hint="How long items stay reserved while a customer pays." />
            <Textarea
              label="Custom payment steps (optional)"
              name="mpesaInstructions"
              defaultValue={s.mpesaInstructions}
              rows={5}
              className="md:col-span-2"
              hint="One step per line. Leave empty for the standard steps. You can use {number}, {amount}, {order} and {name}."
            />
          </div>
        </Panel>

        <Panel title="Business and contact">
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Business name" name="businessName" defaultValue={s.businessName} />
            <Input label="Artist name" name="artistName" defaultValue={s.artistName} />
            <Input label="Phone" name="phone" defaultValue={s.phone} />
            <Input label="WhatsApp number" name="whatsapp" defaultValue={s.whatsapp} hint="e.g. 0712 345 678" />
            <Input label="Contact email" name="contactEmail" defaultValue={s.contactEmail} />
            <Input label="Location" name="location" defaultValue={s.location} />
            <Input label="Instagram link" name="instagramUrl" defaultValue={s.instagramUrl} />
            <Input label="Instagram handle" name="instagramHandle" defaultValue={s.instagramHandle} />
            <Input label="Currency" name="currency" defaultValue={s.currency} maxLength={3} hint="TZS. Changing this does not convert existing prices." />
          </div>
        </Panel>

        <Panel title="Delivery information" description="Shown on product pages. Set fees under Delivery fees.">
          <Textarea label="Delivery information" name="deliveryInfo" defaultValue={s.deliveryInfo} rows={4} />
        </Panel>

        <Panel
          title="Email"
          description={emailConfigured ? "Email sending is configured." : "Email is not configured yet: set RESEND_API_KEY and EMAIL_FROM in Vercel. Orders work without it."}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Checkbox label="Send order and payment emails" name="emailEnabled" defaultChecked={s.emailEnabled} />
            </div>
            <Input label="Sender name" name="emailFromName" defaultValue={s.emailFromName} />
            <Input label="Reply-to address" name="emailReplyTo" defaultValue={s.emailReplyTo} />
            <Input label="Send new-order alerts to" name="orderNotificationEmail" defaultValue={s.orderNotificationEmail} hint="Defaults to ADMIN_EMAIL." />
          </div>
        </Panel>

        <Panel title="Homepage">
          <div className="grid gap-5">
            <Input label="Statement" name="heroStatement" defaultValue={s.heroStatement} />
            <Input label="Homepage artwork (URL slug)" name="heroArtworkSlug" defaultValue={s.heroArtworkSlug} hint="e.g. harbour-before-rain. Empty uses the first featured work." />
            <Input label="Tagline" name="homeIntro" defaultValue={s.homeIntro} />
            <Textarea label="Studio introduction" name="aboutShort" defaultValue={s.aboutShort} rows={4} />
          </div>
        </Panel>

        <Panel title="About page" description="Separate paragraphs with a blank line.">
          <div className="grid gap-5">
            <Textarea label="Artist biography" name="aboutBio" defaultValue={s.aboutBio} rows={8} />
            <Textarea label="Artistic approach" name="artisticApproach" defaultValue={s.artisticApproach} rows={5} />
            <Textarea label="Original works" name="originalsInfo" defaultValue={s.originalsInfo} rows={4} />
            <Textarea label="Prints" name="printsInfo" defaultValue={s.printsInfo} rows={4} />
            <Textarea label="Collector philosophy" name="collectorPhilosophy" defaultValue={s.collectorPhilosophy} rows={4} />
          </div>
        </Panel>

        <div className="sticky bottom-0 border-t border-rule bg-wall py-4">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </form>
    </div>
  );
}

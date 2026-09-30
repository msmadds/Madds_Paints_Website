import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { SubmitButton } from "@/components/admin/buttons";
import { Flash, Input, PageTitle, Panel } from "@/components/admin/ui";
import { deleteZone, saveZone } from "../../actions";
import type { DeliveryZone } from "@/db/schema";

export const metadata = { title: "Delivery fees" };

function ZoneForm({ z }: { z?: DeliveryZone }) {
  const k = z?.id ?? "new";
  return (
    <form action={saveZone} className="grid items-end gap-3 md:grid-cols-12">
      {z && <input type="hidden" name="id" value={z.id} />}
      <Input label="Name shown at checkout" name="name" id={`n-${k}`} defaultValue={z?.name} placeholder="Dar es Salaam delivery" className="md:col-span-4" />
      <Input label="Fee (TZS)" name="fee" id={`f-${k}`} inputMode="numeric" defaultValue={z?.fee ?? 0} className="md:col-span-2" />
      <Input label="Delivery time" name="estimate" id={`e-${k}`} defaultValue={z?.estimate} placeholder="1–3 days" className="md:col-span-3" />
      <Input label="Order" name="sortOrder" id={`s-${k}`} inputMode="numeric" defaultValue={z?.sortOrder ?? 0} className="md:col-span-1" />
      <Input label="Country" name="country" id={`c-${k}`} defaultValue={z?.country ?? "TZ"} maxLength={2} className="md:col-span-2" />
      <div className="flex flex-wrap items-center gap-5 md:col-span-9">
        <label className="flex items-center gap-2 text-[0.875rem]"><input type="checkbox" name="active" defaultChecked={z?.active ?? true} className="size-4 accent-graphite" /> Shown at checkout</label>
        <label className="flex items-center gap-2 text-[0.875rem]"><input type="checkbox" name="feeToBeConfirmed" defaultChecked={z?.feeToBeConfirmed ?? false} className="size-4 accent-graphite" /> Fee confirmed by phone after ordering</label>
      </div>
      <div className="md:col-span-3 md:text-right"><SubmitButton variant={z ? "secondary" : "primary"}>{z ? "Save" : "Add delivery option"}</SubmitButton></div>
    </form>
  );
}

export default async function DeliveryAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const zones = await db.query.deliveryZones.findMany({ orderBy: [asc(schema.deliveryZones.sortOrder)] });
  return (
    <div className="max-w-5xl">
      <PageTitle>Delivery fees</PageTitle>
      <Flash {...sp} />
      <p className="mb-6 text-[0.9375rem] text-stone">
        Customers choose one of these at checkout. The fee is added to the order total. Use “Fee confirmed by phone” for places where the
        cost varies; you can then set the fee on the order before the customer pays.
      </p>
      <div className="space-y-4">
        {zones.map((z) => (
          <Panel key={z.id}>
            <ZoneForm z={z} />
            <form action={deleteZone} className="mt-2 text-right">
              <input type="hidden" name="id" value={z.id} />
              <SubmitButton variant="quiet" pendingText="…" confirm={`Remove “${z.name}”?`}>Remove</SubmitButton>
            </form>
          </Panel>
        ))}
        <Panel title="New delivery option">
          <ZoneForm />
        </Panel>
      </div>
    </div>
  );
}

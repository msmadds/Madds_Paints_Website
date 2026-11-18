import Link from "next/link";
import { certificateRegister, isStandardCertificate } from "@/lib/certificates";
import { ARTWORK_STATUS_LABELS } from "@/lib/format";
import { CopyButton } from "@/components/site/copy-button";
import { PageTitle, Panel, Pill } from "@/components/admin/ui";

export const metadata = { title: "Certificates" };

export default async function CertificatesAdmin() {
  const { numbered, needsNumber, next, highest, skipped } = await certificateRegister();
  const odd = numbered.filter((r) => !isStandardCertificate(r.coaNumber!));

  return (
    <div className="max-w-5xl">
      <PageTitle>Certificates</PageTitle>
      <p className="mb-6 max-w-2xl text-[0.9375rem] text-stone">
        Every Certificate of Authenticity number in one place. Numbers follow the format MH-year-number, and the count starts
        again at 001 each year. To give a painting its number, open it and type the number into Certificate number.
      </p>

      <Panel title="Next number to use">
        <div className="flex flex-wrap items-center gap-4">
          <p className="display text-[2.25rem] tabular-nums">{next}</p>
          <CopyButton value={next} />
        </div>
        <p className="mt-2 text-[0.875rem] text-stone">
          {highest ? `The highest number used this year is ${highest}.` : "No numbers have been used this year yet."}
        </p>
        {skipped.length > 0 && (
          <p className="mt-2 text-[0.875rem] text-stone">
            Not recorded on any painting here: {skipped.join(", ")}. If any were given to a commission or a painting sold
            outside the website, they are already taken.
          </p>
        )}
      </Panel>

      {needsNumber.length > 0 && (
        <Panel title="Paintings waiting for a number" description="These come with a certificate but have no number yet." className="mt-6">
          <ul className="divide-y divide-rule">
            {needsNumber.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
                <Link href={`/admin/artworks/${a.id}`} className="link">{a.title}</Link>
                <span className="text-[0.8125rem] text-stone">{[a.year, ARTWORK_STATUS_LABELS[a.status]].filter(Boolean).join(", ")}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={`Numbers issued (${numbered.length})`} className="mt-6">
        {numbered.length === 0 ? (
          <p className="text-[0.9375rem] text-stone">No certificate numbers recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.9375rem]">
              <thead className="text-[0.8125rem] text-stone">
                <tr className="border-b border-rule">
                  <th className="py-2 pr-4 font-semibold">Number</th>
                  <th className="py-2 pr-4 font-semibold">Painting</th>
                  <th className="py-2 pr-4 font-semibold">Year</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {numbered.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 pr-4 font-semibold whitespace-nowrap tabular-nums">{a.coaNumber}</td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/admin/artworks/${a.id}`} className="link">{a.title}</Link>
                      {!a.published && <span className="text-[0.8125rem] text-stone"> (hidden)</span>}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{a.year ?? ""}</td>
                    <td className="py-2.5"><Pill value={a.status}>{ARTWORK_STATUS_LABELS[a.status]}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {odd.length > 0 && (
          <p className="mt-4 text-[0.875rem] text-stone">
            {odd.length === 1 ? "1 number does" : `${odd.length} numbers do`} not follow the MH-year-number format (
            {odd.map((r) => r.coaNumber).join(", ")}). They are listed above but not counted when working out the next number.
          </p>
        )}
      </Panel>
    </div>
  );
}

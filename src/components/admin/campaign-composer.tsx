"use client";

import { useState, useTransition } from "react";
import { CAMPAIGN_TEMPLATES, unfilledPlaceholders, type CampaignDraft, type CampaignTemplateKey } from "@/lib/collector-templates";
import { previewCampaign, sendCampaign, sendTestCampaign } from "@/app/admin/campaign-actions";
import { cn } from "@/lib/utils";

export type PickerArtwork = { id: string; title: string; year: number | null; status: string; thumb: string | null; hasPrints: boolean };

export function CampaignComposer({ artworks, recipients, emailReady }: { artworks: PickerArtwork[]; recipients: number; emailReady: boolean }) {
  const [templateKey, setTemplateKey] = useState<CampaignTemplateKey>("new_original");
  const [draft, setDraft] = useState<CampaignDraft>(CAMPAIGN_TEMPLATES.new_original.draft);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const placeholders = unfilledPlaceholders(draft);
  const input = () => ({ ...draft, artworkIds: selected });

  function pickTemplate(k: CampaignTemplateKey) {
    if (k === templateKey) return;
    const edited = JSON.stringify(draft) !== JSON.stringify(CAMPAIGN_TEMPLATES[templateKey].draft);
    if (edited && !window.confirm("Switch template? Your edits to the text will be replaced.")) return;
    setTemplateKey(k);
    setDraft(CAMPAIGN_TEMPLATES[k].draft);
    setPreview(null);
    setNotice(null);
  }

  const set = (field: keyof CampaignDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }));
    setPreview(null);
  };

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setPreview(null);
  };

  const run = (fn: () => Promise<{ ok: boolean; message: string; html?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.html) setPreview(r.html);
      setNotice(r.message ? { ok: r.ok, message: r.message } : null);
    });

  function send() {
    if (!window.confirm(`Send “${draft.subject}” to ${recipients} collector${recipients === 1 ? "" : "s"}? This cannot be undone.`)) return;
    run(() => sendCampaign(input(), recipients));
  }

  const field = (label: string, name: keyof CampaignDraft, rows?: number, hint?: string) => (
    <div>
      <label htmlFor={`cc-${name}`} className="field-label">{label}</label>
      {rows ? (
        <textarea id={`cc-${name}`} rows={rows} className="field" value={draft[name] as string} onChange={set(name)} />
      ) : (
        <input id={`cc-${name}`} className="field" value={draft[name] as string} onChange={set(name)} />
      )}
      {hint && <p className="mt-1 text-[0.8125rem] text-stone">{hint}</p>}
    </div>
  );

  const visible = draft.cardMode === "print" ? artworks.filter((a) => a.hasPrints) : artworks;

  return (
    <div className="space-y-6">
      <section className="border border-rule bg-white p-5 md:p-6">
        <h2 className="text-[1.0625rem] font-semibold">1. Choose the occasion</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CAMPAIGN_TEMPLATES) as CampaignTemplateKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pickTemplate(k)}
              className={cn("border p-4 text-left", k === templateKey ? "border-graphite bg-plinth" : "border-rule hover:border-stone")}
              aria-pressed={k === templateKey}
            >
              <span className="block font-semibold">{CAMPAIGN_TEMPLATES[k].label}</span>
              <span className="mt-1 block text-[0.8125rem] text-stone">{CAMPAIGN_TEMPLATES[k].hint}</span>
            </button>
          ))}
        </div>
        {templateKey === "sale" && (
          <p className="mt-4 border-l-2 border-reddot pl-3 text-[0.875rem]">
            The email says the discount is applied automatically at checkout. Make sure the sale is set up on the website before you send it.
          </p>
        )}
      </section>

      <section className="border border-rule bg-white p-5 md:p-6">
        <h2 className="text-[1.0625rem] font-semibold">2. Edit the email</h2>
        <p className="mt-1 text-[0.875rem] text-stone">Replace everything in [square brackets]. Leave a blank line between paragraphs.</p>
        <div className="mt-4 space-y-4">
          {field("Subject", "subject")}
          {field("Heading", "heading")}
          {field("Introduction (shown above the artworks)", "intro", 6)}
          {field("Closing (shown below the artworks)", "closing", 5)}
          {field("Button text", "buttonLabel")}
        </div>
        {placeholders.length > 0 && (
          <p className="mt-4 text-[0.875rem] text-reddot">Still to fill in: {placeholders.join(", ")}</p>
        )}
      </section>

      <section className="border border-rule bg-white p-5 md:p-6">
        <h2 className="text-[1.0625rem] font-semibold">3. Choose the artworks</h2>
        <p className="mt-1 text-[0.875rem] text-stone">
          {draft.cardMode === "print" ? "Only works with prints are shown." : "Published works are shown."} They appear in the order you tick
          them. {selected.length} selected.
        </p>
        {visible.length === 0 ? (
          <p className="mt-4 text-stone">No artworks to show yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((a) => {
              const on = selected.includes(a.id);
              return (
                <li key={a.id}>
                  <label className={cn("flex cursor-pointer items-center gap-3 border p-2", on ? "border-graphite bg-plinth" : "border-rule")}>
                    <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="size-4 accent-graphite" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.thumb ? <img src={a.thumb} alt="" className="size-14 object-cover" /> : <span className="size-14 bg-wall" />}
                    <span className="min-w-0 text-[0.875rem]">
                      <span className="block truncate font-semibold">{a.title}</span>
                      <span className="text-stone">
                        {a.year ?? ""} {a.status !== "available" && `· ${a.status}`}
                        {on && ` · #${selected.indexOf(a.id) + 1}`}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border border-rule bg-white p-5 md:p-6">
        <h2 className="text-[1.0625rem] font-semibold">4. Preview and send</h2>
        {!emailReady && (
          <p className="mt-2 border-l-2 border-reddot pl-3 text-[0.875rem]">
            Email is not set up yet, so you can preview but not send. Add RESEND_API_KEY and EMAIL_FROM in Vercel and redeploy.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => run(() => previewCampaign(input()))}>
            Preview
          </button>
          <button type="button" className="btn btn-secondary" disabled={pending || !emailReady} onClick={() => run(() => sendTestCampaign(input()))}>
            Send a test to me
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending || !emailReady || recipients === 0 || placeholders.length > 0}
            onClick={send}
          >
            Send to {recipients} collector{recipients === 1 ? "" : "s"}
          </button>
        </div>
        {pending && <p className="mt-3 text-[0.875rem] text-stone">Working…</p>}
        {notice && (
          <p role="status" className={cn("mt-3 text-[0.9375rem]", notice.ok ? "text-verdigris" : "text-reddot")}>
            {notice.message}
          </p>
        )}
        {preview && (
          <iframe title="Email preview" srcDoc={preview} sandbox="" className="mt-5 h-[48rem] w-full border border-rule bg-wall" />
        )}
      </section>
    </div>
  );
}

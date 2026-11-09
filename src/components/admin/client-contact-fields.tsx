"use client";

import { useRef } from "react";

export type ContactSuggestion = { contact: string; name: string | null };

/**
 * Client name and contact for a commission. The contact box suggests emails from
 * the Collector List (and past commission clients) as you type; choosing one fills
 * in the name when the name box is still empty.
 */
export function ClientContactFields({
  name,
  contact,
  suggestions,
}: {
  name?: string;
  contact?: string;
  suggestions: ContactSuggestion[];
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const id = name === undefined ? "new" : "edit";

  function onContact(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.trim().toLowerCase();
    const hit = suggestions.find((s) => s.contact.toLowerCase() === v);
    if (hit?.name && nameRef.current && !nameRef.current.value.trim()) nameRef.current.value = hit.name;
  }

  return (
    <>
      <div className="md:col-span-3">
        <label htmlFor={`${id}-clientName`} className="field-label">Client name</label>
        <input ref={nameRef} id={`${id}-clientName`} name="clientName" defaultValue={name} required className="field" />
      </div>
      <div className="md:col-span-3">
        <label htmlFor={`${id}-clientContact`} className="field-label">Phone, email or WhatsApp</label>
        <input
          id={`${id}-clientContact`}
          name="clientContact"
          defaultValue={contact}
          list={`${id}-contact-suggestions`}
          autoComplete="off"
          onChange={onContact}
          className="field"
        />
        <datalist id={`${id}-contact-suggestions`}>
          {suggestions.map((s) => (
            <option key={s.contact} value={s.contact} label={s.name ?? undefined} />
          ))}
        </datalist>
        <p className="mt-1 text-[0.8125rem] text-stone">Start typing to pick an email from your Collector List.</p>
      </div>
    </>
  );
}

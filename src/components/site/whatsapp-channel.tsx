export function WhatsAppChannel({ url }: { url: string }) {
  if (!url) return null;
  return (
    <div className="mt-10 border-t border-rule pt-8">
      <p className="font-semibold">Prefer WhatsApp?</p>
      <p className="mt-2 max-w-xl text-stone">
        Follow the MedePaints channel for new work, studio updates and sales. Your number stays private.
      </p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-5">
        Follow on WhatsApp
      </a>
    </div>
  );
}

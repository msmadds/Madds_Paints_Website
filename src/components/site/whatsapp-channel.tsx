import QRCode from "qrcode";

export async function WhatsAppChannel({ url }: { url: string }) {
  if (!url) return null;
  // Drawn from the link in Settings, so it follows any change to the channel.
  const qr = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 2,
    color: { dark: "#2a2926", light: "#ffffff" },
  });
  return (
    <div className="mt-10 flex items-start justify-between gap-8 border-t border-rule pt-8">
      <div>
        <p className="font-semibold">Prefer WhatsApp?</p>
        <p className="mt-2 max-w-xl text-stone">
          Follow the MedePaints channel for new work, studio updates and sales. Your number stays private.
        </p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-5">
          Follow on WhatsApp
        </a>
      </div>
      {/* On a computer, scan with a phone instead. Hidden on phones, where the button is easier. */}
      <figure className="hidden shrink-0 text-center md:block">
        <div
          role="img"
          aria-label="QR code for the MedePaints WhatsApp channel"
          className="size-32 border border-rule bg-white [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <figcaption className="mt-2 text-[0.8125rem] text-stone">Scan to follow</figcaption>
      </figure>
    </div>
  );
}

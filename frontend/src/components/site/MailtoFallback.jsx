import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Shown in place of a form right after it attempts a mailto: submission.
// There is no backend here, so a mailto: is the only zero-infrastructure
// way to send — but the browser gives no signal of whether it actually
// opened a mail client (most visitors without one configured get nothing
// at all, silently). Rather than show a false "Thanks!", this tells the
// visitor plainly what should have happened and gives a guaranteed manual
// fallback (copy the message, email it themselves) so an inquiry is never
// just lost with no trace on either side.
export const MailtoFallback = ({ email, subject, body, onReset }) => {
  const [copied, setCopied] = useState(false);

  const fullMessage = `Subject: ${subject}\n\n${body}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/blocked — the textarea below is still
      // there to select-all manually, so this isn't a dead end either way.
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-[var(--sm-gold)]/30 bg-black/30 px-5 py-6 text-left sm:px-6">
      <p className="font-body text-sm text-white/80">
        Your email app should have just opened with this inquiry ready to go — check for it and hit send there to
        complete it.
      </p>
      <p className="font-body mt-2 text-sm text-white/60">
        Didn't see anything open? Copy your message below and send it yourself to{" "}
        <a href={`mailto:${email}`} className="text-[var(--sm-gold-light)] underline decoration-[var(--sm-gold)]/40 underline-offset-2">
          {email}
        </a>
        .
      </p>

      <textarea
        readOnly
        value={fullMessage}
        rows={6}
        data-testid="mailto-fallback-message"
        className="mt-4 w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 font-body text-xs text-white/70 focus:outline-none"
        onFocus={(e) => e.target.select()}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          data-testid="mailto-fallback-copy"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 font-body text-xs uppercase tracking-[0.1em] text-white/80 transition-colors hover:border-[var(--sm-gold)]/60 hover:text-[var(--sm-gold-light)]"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy Message"}
        </button>
        <button
          type="button"
          onClick={onReset}
          data-testid="mailto-fallback-reset"
          className="font-body text-xs text-white/40 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/70"
        >
          Submit another inquiry
        </button>
      </div>
    </div>
  );
};

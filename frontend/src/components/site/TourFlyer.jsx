import { useIsMobile } from "@/hooks/useIsMobile";

// Data-driven tour flyer — takes the TOUR_DATES array ({ date, event, location, and optionally
// note, url, cta }) and renders the layout automatically. Renders nothing when
// there are no dates (the Tour page shows its own "coming soon" state).
// A date's extra line (time, cause) and its link, when it has them.
const DateExtras = ({ d, className = "" }) =>
  d.note || d.url ? (
    <div className={className}>
      {d.note && <p className="font-body mt-2 text-xs font-light leading-relaxed text-white/60">{d.note}</p>}
      {d.url && (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="tour-date-link"
          className="font-accent mt-3 inline-block text-xs uppercase tracking-[0.2em] text-[var(--sm-gold-light)] underline decoration-[var(--sm-gold)]/50 underline-offset-4 transition-colors hover:text-white"
        >
          {d.cta || "Details"}
        </a>
      )}
    </div>
  ) : null;

export const TourFlyer = ({ title, intro, dates }) => {
  const isMobile = useIsMobile();
  if (!dates || dates.length === 0) return null;
  return (
    <div
      data-testid="tour-flyer"
      className={`relative mx-auto max-w-2xl rounded-xl border border-[var(--sm-gold)]/25 bg-black/40 py-14 ${
        isMobile ? "px-3" : "px-6 sm:px-10"
      }`}
    >
      <img src="/trev-logo.png" alt="TREV" className="mx-auto h-12 w-auto object-contain opacity-90" />
      <h2 className="font-display mt-4 text-3xl text-[var(--sm-gold-light)] sm:text-4xl">{title}</h2>
      {intro && <p className="font-body mx-auto mt-4 max-w-md text-sm font-light italic text-white/60">{intro}</p>}

      <div className="mx-auto mt-8 h-px w-32 bg-gradient-to-r from-transparent via-[var(--sm-gold)] to-transparent" />

      <ul className="relative mt-8 space-y-0 text-left">
        {dates.map((d, i) =>
          isMobile ? (
            // Mobile: location drops to its own row below date+event so
            // long event/location names never cramp the date column.
            <li
              key={i}
              data-testid="tour-flyer-date"
              className="border-b border-white/10 py-5 last:border-b-0"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-accent w-14 shrink-0 text-sm text-[var(--sm-gold)]">{d.date}</span>
                <span className="font-display flex-1 text-sm text-white">{d.event}</span>
              </div>
              <p className="font-body mt-1 pl-16 text-xs text-white/50">{d.location}</p>
              <DateExtras d={d} className="pl-16" />
            </li>
          ) : (
            <li
              key={i}
              data-testid="tour-flyer-date"
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 py-5 last:border-b-0"
            >
              <span className="font-accent w-16 shrink-0 text-sm text-[var(--sm-gold)]">{d.date}</span>
              <span className="font-display flex-1 text-base text-white sm:text-lg">{d.event}</span>
              <span className="font-body text-xs text-white/50 sm:text-sm">{d.location}</span>
              <DateExtras d={d} className="basis-full pl-20" />
            </li>
          )
        )}
      </ul>
    </div>
  );
};

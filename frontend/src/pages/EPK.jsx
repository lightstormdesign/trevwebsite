import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import {
  ARTIST_NAME,
  BIO,
  EPK_STATS,
  CAREER_HIGHLIGHTS,
  EPK_TOURED_WITH,
  SHARED_STAGE,
  EPK_BANNER_TEXT,
  FESTIVALS,
  SITE_GENRE_TAGS,
  SITE_LOCATION,
  BOOKING_STATUS,
  BOOKING_COPY,
  BOOKING_EMAIL,
  SOCIALS,
} from "@/data/site";

// EPK gallery — temporary 16:9 stills from the "Kingdom" music video
// (/trev-epk-01.jpg … /trev-epk-12.jpg) until real press photos arrive.
// Swap the files in /public (same names) to update without touching code.
const EPK_GALLERY = Array.from({ length: 12 }, (_, i) => `/trev-epk-${String(i + 1).padStart(2, "0")}.jpg`);

const inputClass =
  "rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 font-body text-sm text-white placeholder:text-white/40 focus:border-[var(--sm-gold)]/60 focus:outline-none";

// Booking form — field labels match the live trevworld.com/contact form
// exactly. There's no backend, so submitting opens a pre-filled mailto: to
// BOOKING_EMAIL (zero-backend submission path). Exported so the Contact page
// renders the same form.
export const BookingForm = () => {
  const [fields, setFields] = useState({
    name: "",
    email: "",
    event: "",
    dateLocation: "",
    budget: "",
    details: "",
  });

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Booking Request: ${fields.event || ARTIST_NAME}`);
    const body = encodeURIComponent(
      `First/last name: ${fields.name}\nEmail: ${fields.email}\nFestival/Event name: ${fields.event}\nEvent Date(s) / Location: ${fields.dateLocation}\nEstimated Budget Range: ${fields.budget}\nAdditional Details: ${fields.details}`
    );
    window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <form data-testid="booking-form" onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
      <input required aria-label="First/last name" placeholder="First/last name*" value={fields.name} onChange={set("name")} className={inputClass} />
      <input required type="email" aria-label="Email" placeholder="Email*" value={fields.email} onChange={set("email")} className={inputClass} />
      <input
        required
        aria-label="Festival/Event name"
        placeholder="Festival/Event name*"
        value={fields.event}
        onChange={set("event")}
        className={`${inputClass} sm:col-span-2`}
      />
      <input
        required
        aria-label="Event Date(s) / Location"
        placeholder="Event Date(s) / Location*"
        value={fields.dateLocation}
        onChange={set("dateLocation")}
        className={`${inputClass} sm:col-span-2`}
      />
      <input
        aria-label="Estimated Budget Range"
        placeholder="Estimated Budget Range"
        value={fields.budget}
        onChange={set("budget")}
        className={`${inputClass} sm:col-span-2`}
      />
      <textarea
        aria-label="Additional Details"
        placeholder="Additional Details"
        value={fields.details}
        onChange={set("details")}
        rows={3}
        className={`${inputClass} sm:col-span-2`}
      />
      <button
        type="submit"
        data-testid="booking-submit"
        className="mt-1 rounded-full bg-[var(--sm-gold)] px-8 py-3 font-body text-sm font-medium text-black transition-colors hover:bg-[var(--sm-gold-light)] sm:col-span-2"
      >
        Send Request
      </button>
      <p className="font-body text-xs text-white/40 sm:col-span-2">
        Every inquiry is reviewed personally, and our team will follow up with next steps. Or email us directly at{" "}
        <a href={`mailto:${BOOKING_EMAIL}`} className="text-[var(--sm-gold-light)] hover:text-white">
          {BOOKING_EMAIL}
        </a>
        .
      </p>
    </form>
  );
};

export default function EPK() {
  return (
    <div className="starfield relative min-h-screen">
      <Navbar />
      <main className="relative mx-auto max-w-4xl px-6 pb-10 pt-40 text-center">
        {/* Header / info */}
        <Reveal>
          <span className="overline">Electronic Press Kit</span>
          <h1 className="font-display mt-5 text-5xl font-normal text-[var(--sm-text)] sm:text-6xl">{ARTIST_NAME}</h1>
          <p className="font-accent mt-4 text-sm uppercase tracking-[0.2em] text-white/60">{SITE_GENRE_TAGS}</p>
          <p className="font-accent mt-2 text-base italic text-white/50">{SITE_LOCATION}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="font-accent mt-10 text-sm uppercase tracking-[0.2em] text-[var(--sm-gold)]">{EPK_BANNER_TEXT}</p>
        </Reveal>

        {/* Slow-scrolling festival-name ticker — ambient, readable at a glance. */}
        <Reveal delay={0.12}>
          <div
            className="mt-8 overflow-hidden"
            style={{
              WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
              maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            }}
          >
            <div className="marquee-track">
              {[...FESTIVALS, ...FESTIVALS].map((f, i) => (
                <span key={i} className="font-accent shrink-0 px-6 text-xs uppercase tracking-[0.25em] text-white/35">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-6 flex items-center justify-center gap-7">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`epk-social-${s.label.toLowerCase()}`}
                className="font-accent text-xs uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-[var(--sm-gold-light)]"
              >
                {s.label}
              </a>
            ))}
          </div>
        </Reveal>
      </main>

      {/* Two-column layout: gallery (left) / EPK info — bio, stats,
          highlights, performances, booking form (right). On mobile the info
          column renders first (order-1) so the booking CTA is reachable
          without scrolling past the whole gallery. */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-32 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-14">
        {/* Thin gold "spotlight beam" divider — desktop only. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-10 hidden w-px lg:block"
          style={{
            left: "44.5%",
            transform: "rotate(4deg)",
            background: "linear-gradient(to bottom, transparent 0%, rgba(227,163,92,0.32) 20%, rgba(227,163,92,0.32) 80%, transparent 100%)",
          }}
        />
        <Reveal className="order-2 lg:order-1" delay={0.2}>
          <div data-testid="epk-gallery" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {EPK_GALLERY.map((src) => (
              <div key={src} className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <img src={src} alt={`${ARTIST_NAME} — Kingdom`} className="aspect-video w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </Reveal>

        <div className="order-1 text-center lg:order-2 lg:text-left">
          {/* Bio — verbatim press-kit bio from trevworld.com/epk. */}
          <Reveal delay={0.1}>
            <div data-testid="epk-bio">
              <span className="overline">Bio</span>
              <div className="mt-4 space-y-4">
                {BIO.map((p, i) => (
                  <p key={i} className="font-body text-sm leading-relaxed text-white/75">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div data-testid="epk-stats" className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-2">
              {EPK_STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-4xl text-[var(--sm-gold-light)]">{s.value}</p>
                  <p className="font-body mt-1 text-xs uppercase tracking-[0.15em] text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.18}>
            <div data-testid="epk-highlights" className="mt-10">
              <span className="overline">Career Highlights</span>
              <ul className="mt-4 space-y-2">
                {CAREER_HIGHLIGHTS.map((h) => (
                  <li key={h} className="font-body text-sm text-white/70">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Selected Performances — toured with, shared the stage with,
              and festivals, each on its own labeled line. */}
          <Reveal delay={0.2}>
            <div data-testid="epk-performances" className="mt-10">
              <span className="overline">Selected Performances</span>
              <p className="font-accent mt-4 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">Toured With</p>
              <p className="font-body mt-2 text-sm leading-relaxed text-white/70">{EPK_TOURED_WITH.join(", ")}</p>
              <p className="font-accent mt-6 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">Shared the Stage With</p>
              <p className="font-body mt-2 text-sm leading-relaxed text-white/70">{SHARED_STAGE.join(" · ")}</p>
              <p className="font-accent mt-6 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">Festivals</p>
              <p className="font-body mt-2 text-sm leading-loose text-white/55">{FESTIVALS.join(" · ")}</p>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div data-testid="epk-booking" className="mt-10 rounded-xl border border-[var(--sm-gold)]/30 px-6 py-8 sm:px-8">
              <h2 className="font-display text-2xl text-white sm:text-3xl">Submit a Booking Request</h2>
              <p className="font-accent mt-2 text-sm italic text-white/60">{BOOKING_STATUS}</p>
              <p className="font-body mt-1 text-xs text-white/45">{BOOKING_COPY}</p>
              <BookingForm />
            </div>
          </Reveal>
        </div>
      </div>
      <Footer />
    </div>
  );
}

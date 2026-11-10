import { useRef, useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { MailtoFallback } from "@/components/site/MailtoFallback";
import { TrackPlayer } from "@/components/site/TrackPlayer";
import { Download } from "lucide-react";
import { EPK_CROWD, EPK_GALLERY, GALLERY_TOTAL, PRESS_ZIP, GalleryVideo, PressPhoto } from "@/components/site/PressGallery";
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
  FORMSPREE_ENDPOINT,
  SOCIALS,
  STREAMING_LINKS,
  EPK_TRACKS,
  ALBUM_COVER,
  EPK_PERFORMANCE_VIDEO,
  PRESS_QUOTES,
  TECH_RIDER,
} from "@/data/site";

// The stage plot (his "Celebrate Life Together" layout): the stage from above, the audience at the
// bottom. Backup mic upstage, lead vocal center, the stool and the laptop table either side of it,
// the two DIs downstage.
const StagePlot = () => {
  const gold = "rgba(243,212,142,0.9)";
  const dim = "rgba(255,255,255,0.4)";
  const label = (x, y, t, sub, c = gold) => (
    <g>
      <text x={x} y={y} textAnchor="middle" fill={c} fontSize="8.5" letterSpacing="1">{t}</text>
      {sub && <text x={x} y={y + 11} textAnchor="middle" fill={dim} fontSize="7.5">{sub}</text>}
    </g>
  );
  const mic = (x, y, r, c) => (
    <g>
      <circle cx={x} cy={y} r={r} fill={c === gold ? "rgba(227,163,92,0.16)" : "none"} stroke={c} />
      <circle cx={x} cy={y} r={2.2} fill={c} />
    </g>
  );
  const di = (x, y, t) => (
    <g>
      <rect x={x - 20} y={y} width="40" height="16" rx="2" fill="none" stroke={gold} />
      <text x={x} y={y + 11} textAnchor="middle" fill={gold} fontSize="7.5">{t}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 320 236" className="w-full" role="img" aria-label="Stage plot: backup mic upstage, lead vocal center, stool to its left, laptop table to its right, vocal and guitar DIs downstage">
      <rect x="6" y="6" width="308" height="204" rx="10" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" />
      <text x="160" y="22" textAnchor="middle" fill={dim} fontSize="8" letterSpacing="2">UPSTAGE</text>
      {mic(160, 40, 8, dim)}
      {label(160, 62, "BACKUP MIC", "wired · venue", dim)}
      {mic(160, 100, 14, gold)}
      {label(160, 127, "LEAD VOCAL", "TREV · wireless")}
      <rect x="57" y="91" width="18" height="18" rx="9" fill="none" stroke={gold} />
      {label(66, 127, "STOOL")}
      <rect x="228" y="89" width="54" height="22" rx="3" fill="none" stroke={gold} />
      <text x="255" y="103" textAnchor="middle" fill={gold} fontSize="7.5">LAPTOP</text>
      {label(255, 127, "TABLE", "\u26A1 power · stereo L/R")}
      {di(115, 160, "VOCAL DI")}
      {di(205, 160, "GUITAR DI")}
      <line x1="24" y1="196" x2="296" y2="196" stroke="rgba(255,255,255,0.25)" strokeDasharray="5 4" />
      <text x="160" y="228" textAnchor="middle" fill={dim} fontSize="8.5" letterSpacing="2">AUDIENCE</text>
    </svg>
  );
};

const TechRider = () => (
  <details data-testid="tech-rider" className="group mt-10 rounded-xl border border-white/12 bg-black/30 px-5 py-4 text-left sm:px-6">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
      <span>
        <span className="font-display block text-xl text-white">Stage Plot &amp; Tech Rider</span>
        <span className="font-body mt-0.5 block text-xs text-white/45">
          {TECH_RIDER.show && <span className="text-white/70">{TECH_RIDER.show}: </span>}
          {TECH_RIDER.lineup}
        </span>
      </span>
      <span className="font-accent shrink-0 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)] group-open:hidden">View</span>
      <span className="font-accent hidden shrink-0 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)] group-open:inline">Close</span>
    </summary>
    <div className="mt-5">
      <StagePlot />
      {(TECH_RIDER.setLength || TECH_RIDER.changeover) && (
        <p className="font-body mt-4 text-xs text-white/55">
          {[TECH_RIDER.setLength && `Set length: ${TECH_RIDER.setLength}`, TECH_RIDER.changeover].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="font-accent mt-5 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">Input List</p>
      <table className="font-body mt-2 w-full text-xs text-white/70">
        <tbody>
          {TECH_RIDER.inputs.map((x) => (
            <tr key={x.ch} className="border-b border-white/10 align-top">
              <td className="py-1.5 pr-3 tabular-nums text-white/40">{x.ch}</td>
              <td className="whitespace-nowrap py-1.5 pr-3 text-white/80">{x.source}</td>
              <td className="py-1.5 text-white/55">{x.mic}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {TECH_RIDER.monitors && <p className="font-body mt-3 text-xs text-white/55">Monitors: {TECH_RIDER.monitors}</p>}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {[
          ["Venue Provides", TECH_RIDER.venueProvides],
          ["Artist Brings", TECH_RIDER.artistBrings],
        ].map(([h, list]) => (
          <div key={h}>
            <p className="font-accent text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">{h}</p>
            <ul className="font-body mt-2 space-y-1 text-xs text-white/65">
              {list.map((x) => (
                <li key={x}>· {x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </details>
);

// Live performance highlight reel, front and centre. public/trev-epk-reel.mp4 (web-compressed from
// TREV's highlight reel); the block hides itself until that file exists.
const EPK_REEL = { src: "/trev-epk-reel.mp4?v=1", poster: "/trev-epk-reel.jpg?v=1" };

const PerformanceReel = () => {
  const [missing, setMissing] = useState(false);
  if (EPK_PERFORMANCE_VIDEO) {
    return (
      <div data-testid="epk-reel" className="mx-auto mt-10 max-w-4xl">
        <span className="overline">Live Performance</span>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--sm-gold)]/25 bg-black shadow-[0_0_60px_rgba(227,163,92,0.12)]">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${EPK_PERFORMANCE_VIDEO.youtubeId}`}
            title={`${ARTIST_NAME}: ${EPK_PERFORMANCE_VIDEO.title}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    );
  }
  if (missing) return null;
  return (
    <div data-testid="epk-reel" className="mx-auto mt-10 max-w-4xl">
      <span className="overline">Live Performance</span>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--sm-gold)]/25 bg-black shadow-[0_0_60px_rgba(227,163,92,0.12)]">
        <video
          className="aspect-[3/2] w-full bg-black object-cover"
          src={EPK_REEL.src}
          poster={EPK_REEL.poster}
          controls
          playsInline
          preload="metadata"
          onError={() => setMissing(true)}
        />
      </div>
    </div>
  );
};

const inputClass =
  "rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 font-body text-sm text-white placeholder:text-white/40 focus:border-[var(--sm-gold)]/60 focus:outline-none";

// Booking form — field labels match the live trevworld.com/contact form exactly. Submits to
// FORMSPREE_ENDPOINT (same as Sierra's and Jenn's sites); if that request fails, it opens a
// pre-filled email to BOOKING_EMAIL and shows MailtoFallback, so an inquiry is never lost.
// Exported so the Contact page renders the same form.
export const BookingForm = () => {
  const [fields, setFields] = useState({
    name: "",
    email: "",
    event: "",
    dateLocation: "",
    budget: "",
    details: "",
  });

  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  const subject = `Booking Request: ${fields.event || ARTIST_NAME}`;
  const body = `First/last name: ${fields.name}\nEmail: ${fields.email}\nFestival/Event name: ${fields.event}\nEvent Date(s) / Location: ${fields.dateLocation}\nEstimated Budget Range: ${fields.budget}\nAdditional Details: ${fields.details}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const formData = new FormData();
      formData.append("_subject", subject);
      formData.append("_replyto", fields.email);
      formData.append("name", fields.name);
      formData.append("email", fields.email);
      formData.append("event", fields.event);
      formData.append("dateLocation", fields.dateLocation);
      formData.append("budget", fields.budget);
      formData.append("details", fields.details);
      const res = await fetch(FORMSPREE_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: formData });
      if (res.ok) return setStatus("success");
      throw new Error("Formspree rejected the submission");
    } catch {
      window.location.href = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div data-testid="booking-success" className="mt-8 rounded-xl border border-white/10 bg-black/30 px-5 py-6 text-center sm:px-6">
        <p className="font-body text-sm text-white/80">
          Got it — your booking request is in. Every inquiry is reviewed personally, and our team will follow up with next
          steps.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return <MailtoFallback email={BOOKING_EMAIL} subject={subject} body={body} onReset={() => setStatus("idle")} />;
  }

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
        disabled={status === "submitting"}
        className="mt-1 rounded-full bg-[var(--sm-gold)] px-8 py-3 font-body text-sm font-medium text-black transition-colors hover:bg-[var(--sm-gold-light)] disabled:opacity-60 sm:col-span-2"
      >
        {status === "submitting" ? "Sending…" : "Send Request"}
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

// Behind the whole EPK: TREV's three crowd clips (the fire, the festival, the basement), giant, soft and very
// dark, each once, then resting on the stage photo from the About story (chapter 8), as dark. Small soft copies
// (public/epk-bg); reduced motion: the photo alone.
const EPK_BG_CLIPS = ["/epk-bg/crowd-03.mp4", "/epk-bg/crowd-01.mp4", "/epk-bg/crowd-02.mp4"];
const EPK_BG_STILL = "/epk-bg/stage.jpg";
const EpkBackdrop = () => {
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [i, setI] = useState(reduce ? EPK_BG_CLIPS.length : 0);
  const [shown, setShown] = useState(false);
  const done = i >= EPK_BG_CLIPS.length;
  const next = () => { setShown(false); setTimeout(() => setI((n) => n + 1), 700); };
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      {!done && (
        <video
          key={EPK_BG_CLIPS[i]}
          src={EPK_BG_CLIPS[i]}
          muted
          autoPlay
          playsInline
          preload="auto"
          onPlaying={() => setShown(true)}
          onEnded={next}
          onError={next}
          className="absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-700"
          style={{ opacity: shown ? 0.3 : 0 }}
        />
      )}
      <img
        src={EPK_BG_STILL}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ opacity: done ? 0.24 : 0, transition: "opacity 2s ease" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,.25), rgba(0,0,0,.7) 85%)" }} />
    </div>
  );
};

export default function EPK() {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const galleryTopRef = useRef(null);
  return (
    <div className="starfield relative isolate min-h-screen">
      <EpkBackdrop />
      <Navbar />
      <main className="relative mx-auto max-w-4xl px-6 pb-10 pt-40 text-center">
        {/* Header / info */}
        <Reveal>
          <span className="overline">Electronic Press Kit</span>
          <h1 className="font-display mt-5 text-5xl font-normal text-[var(--sm-text)] sm:text-6xl">{ARTIST_NAME}</h1>
          <p className="font-accent mt-4 text-sm uppercase tracking-[0.2em] text-white/60">{SITE_GENRE_TAGS}</p>
          <p className="font-accent mt-2 text-base italic text-white/50">{SITE_LOCATION}</p>
          {/* his music first: a few songs to play right here, then where to hear the rest */}
          <TrackPlayer tracks={EPK_TRACKS} cover={ALBUM_COVER} className="mx-auto mt-7 max-w-sm" />
          <div data-testid="epk-streaming" className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {STREAMING_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 px-4 py-1.5 font-accent text-[0.65rem] uppercase tracking-[0.18em] text-white/75 transition-colors hover:border-[var(--sm-gold)]/60 hover:text-[var(--sm-gold-light)]"
              >
                {l.label}
              </a>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <PerformanceReel />
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
          <div ref={galleryTopRef} className="mb-4 flex scroll-mt-24 flex-wrap items-center justify-between gap-3">
            <span className="overline">Press Photos</span>
            <a
              href={PRESS_ZIP}
              download
              data-testid="press-zip"
              className="flex items-center gap-1.5 rounded-full border border-[var(--sm-gold)]/40 px-4 py-1.5 font-body text-xs text-[var(--sm-gold-light)] transition-colors hover:bg-[var(--sm-gold)]/10"
            >
              <Download size={13} /> Download all
            </a>
          </div>
          {/* Crowd shots lead, full width: the live room is what bookers want to see */}
          {EPK_CROWD.map((g) => (
            <div key={g.src} data-testid="epk-crowd">
              <PressPhoto g={g} className="mb-2 !border-[rgba(227,163,92,0.3)]" />
            </div>
          ))}
          <div data-testid="epk-gallery" className="columns-2 gap-2 sm:columns-3 lg:columns-2">
            {(showAllPhotos ? EPK_GALLERY : EPK_GALLERY.filter((g) => g.featured)).map((g) =>
              g.video ? (
                <GalleryVideo key={g.video} g={g} className="mb-2 break-inside-avoid" />
              ) : (
                <PressPhoto key={g.src} g={g} className="mb-2 break-inside-avoid" />
              ),
            )}
          </div>
          <button
            type="button"
            data-testid="epk-gallery-toggle"
            aria-expanded={showAllPhotos}
            onClick={() => {
              if (showAllPhotos) galleryTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              setShowAllPhotos((v) => !v);
            }}
            className="mt-2 w-full rounded-full border border-[var(--sm-gold)]/40 py-2.5 font-accent text-[0.7rem] uppercase tracking-[0.18em] text-[var(--sm-gold-light)] transition-colors hover:bg-[var(--sm-gold)] hover:text-black"
          >
            {showAllPhotos ? "Show fewer" : `See full gallery · ${GALLERY_TOTAL} photos & clips`}
          </button>
          <p className="font-body mt-2 text-[0.65rem] text-white/35">Tap any photo to download it full size. Tap a clip's speaker for sound.</p>
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

          {PRESS_QUOTES.length > 0 && (
            <Reveal delay={0.17}>
              <div data-testid="epk-press" className="mt-10 space-y-6">
                <span className="overline">Press</span>
                {PRESS_QUOTES.map((q) => (
                  <figure key={q.quote}>
                    <blockquote className="font-accent text-lg italic leading-snug text-white/85">“{q.quote}”</blockquote>
                    <figcaption className="font-body mt-1.5 text-xs uppercase tracking-[0.15em] text-white/45">
                      {q.href ? (
                        <a href={q.href} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--sm-gold-light)]">
                          {q.source}
                        </a>
                      ) : (
                        q.source
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Reveal>
          )}

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
              <p className="font-accent mt-6 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">Direct Support For</p>
              <p className="font-body mt-2 text-sm leading-relaxed text-white/70">{SHARED_STAGE.join(" · ")}</p>
              <p className="font-accent mt-6 text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">Festivals</p>
              <p className="font-body mt-2 text-sm leading-loose text-white/55">{FESTIVALS.join(" · ")}</p>
            </div>
          </Reveal>

          <Reveal delay={0.22}>
            <TechRider />
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

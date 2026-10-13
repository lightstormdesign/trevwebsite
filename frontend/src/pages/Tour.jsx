import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { TourFlyer } from "@/components/site/TourFlyer";
import { HeartIcon } from "@/components/site/HeartIcon";
import {
  TOUR_DATES,
  TOUR_INTRO_LINE_1,
  TOUR_INTRO_LINE_2,
  TOUR_TICKETS_URL,
  LAYLO_URL,
  LAYLO_CTA,
  BOOKING_STATUS,
  BOOKING_COPY,
} from "@/data/site";

export default function Tour() {
  const hasDates = Array.isArray(TOUR_DATES) && TOUR_DATES.length > 0;

  return (
    <div className="starfield relative min-h-screen">
      <div
        className="fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(180,85,46,0.16) 0%, transparent 65%)" }}
      />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-32 pt-40 text-center">
        <Reveal>
          <span className="overline">Tour</span>
          <h1 className="font-display mt-5 text-5xl font-normal text-[var(--sm-text)] sm:text-6xl">Tour Dates</h1>
          <h2 className="font-accent mt-3 text-sm uppercase tracking-[0.2em] text-[var(--sm-gold)]">Prayerformance</h2>
          <p className="font-body mx-auto mt-6 max-w-lg text-sm font-light leading-relaxed text-white/60">
            {TOUR_INTRO_LINE_1}
            <br />
            {TOUR_INTRO_LINE_2} <HeartIcon size={14} className="inline-block align-middle" />
          </p>
        </Reveal>

        {hasDates ? (
          <>
            <Reveal delay={0.2}>
              <div className="mt-16">
                <TourFlyer title="Upcoming Dates" dates={TOUR_DATES} />
              </div>
            </Reveal>

            {/* Single site-wide ticket CTA — only when a tickets URL exists. */}
            {TOUR_TICKETS_URL && (
              <Reveal delay={0.25}>
                <a
                  href={TOUR_TICKETS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="tour-get-tickets-link"
                  className="animate-text-glow-pulse font-accent mt-12 inline-block text-sm uppercase tracking-[0.2em] text-[var(--sm-gold-light)] underline decoration-[var(--sm-gold)]/50 underline-offset-4 transition-colors hover:text-white"
                >
                  Get Tickets
                </a>
              </Reveal>
            )}
          </>
        ) : (
          // No dates published yet — graceful "coming soon" state with a
          // notify CTA (Laylo list) instead of an empty flyer.
          <Reveal delay={0.2}>
            <div
              data-testid="tour-coming-soon"
              className="mx-auto mt-16 max-w-2xl rounded-xl border border-[var(--sm-gold)]/25 bg-black/40 px-6 py-14 sm:px-10"
            >
              <img src="/trev-logo.png" alt="TREV" className="mx-auto h-14 w-auto object-contain opacity-90" />
              <h3 className="font-display mt-6 text-2xl text-[var(--sm-gold-light)] sm:text-3xl">New dates coming soon</h3>
              <div className="mx-auto mt-6 h-px w-32 bg-gradient-to-r from-transparent via-[var(--sm-gold)] to-transparent" />
              <p className="font-body mx-auto mt-6 max-w-md text-sm font-light text-white/60">
                Be the first to know when new shows are announced.
              </p>
              <a
                href={LAYLO_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="tour-notify-laylo-link"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--sm-gold)] px-6 py-2.5 font-body text-sm font-medium text-black transition-colors hover:bg-[var(--sm-gold-light)]"
              >
                {LAYLO_CTA} <ArrowUpRight size={15} />
              </a>
            </div>
          </Reveal>
        )}

        {/* Booking — routes to the Contact page. */}
        <Reveal delay={0.3}>
          <div className="mt-14">
            <p className="font-accent text-sm uppercase tracking-[0.2em] text-[var(--sm-gold)]">{BOOKING_STATUS}</p>
            <p className="font-body mx-auto mt-3 max-w-md text-sm font-light text-white/60">{BOOKING_COPY}</p>
            <Link
              to="/contact"
              data-testid="tour-booking-link"
              className="font-accent mt-6 inline-block text-sm uppercase tracking-[0.2em] text-[var(--sm-gold-light)] underline decoration-[var(--sm-gold)]/50 underline-offset-4 transition-colors hover:text-white"
            >
              Book TREV
            </Link>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

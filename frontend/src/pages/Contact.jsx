import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { BookingForm } from "@/pages/EPK";
import { BOOKING_STATUS, BOOKING_COPY, SITE_CONTACT, SOCIALS } from "@/data/site";

// Contact = booking. Mirrors trevworld.com/contact: booking status + copy,
// the booking request form (shared with the EPK page; mailto: submission to
// BOOKING_EMAIL), and a direct-email fallback. Background is CSS-only
// (gradient + grain); swap for an image/video using the same "fixed inset-0"
// pattern once a real asset is supplied.
export default function Contact() {
  return (
    <div className="relative min-h-screen bg-[var(--sm-black)]">
      <div
        className="fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at 50% 30%, var(--sm-brown-deep), var(--sm-black) 70%)" }}
      >
        <div className="grain absolute inset-0" />
      </div>
      <Navbar />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 pb-24 pt-36 text-center">
        <Reveal>
          <span className="overline">Booking</span>
          <h1 data-testid="contact-booking-status" className="font-display mt-5 text-4xl font-normal text-[var(--sm-text)] sm:text-5xl">
            {BOOKING_STATUS}
          </h1>
          <p className="font-accent mt-4 text-lg italic text-white/65">{BOOKING_COPY}</p>
        </Reveal>
        <Reveal delay={0.15} className="w-full">
          <div className="w-full rounded-xl border border-[var(--sm-gold)]/30 bg-black/30 px-6 py-8 sm:px-8">
            <BookingForm />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <div className="mt-10 flex flex-col items-center gap-2">
            <p className="font-body text-xs uppercase tracking-[0.2em] text-white/45">Or email directly</p>
            <a
              href={`mailto:${SITE_CONTACT.email}`}
              data-testid="contact-direct-email"
              className="font-accent text-lg text-[var(--sm-gold-light)] transition-colors hover:text-white"
            >
              {SITE_CONTACT.email}
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex items-center justify-center gap-7">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-accent text-xs uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-[var(--sm-gold-light)]"
              >
                {s.label}
              </a>
            ))}
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

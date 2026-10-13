import { ArrowUpRight, MessageSquare, Heart } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  SOCIALS,
  LAYLO_URL,
  LAYLO_CTA,
  TEXT_KEYWORD,
  TEXT_NUMBER,
  TEXT_SMS_HREF,
  PATREON_URL,
  KINGDOM_LINE,
} from "@/data/site";

// Community / sign-up landing page: TREV's Laylo list ("Unlock the
// Kingdom"), the text-to-join line, and Patreon. Stats live only on the EPK.
export default function Community() {
  const isMobile = useIsMobile();
  return (
    // flex column + min-h-screen: sticky-footer pattern — <main> gets flex-1
    // so the Footer always lands at the true bottom. Mobile gets an explicit
    // dark background since the photo is a bounded block there.
    <div className={`relative flex min-h-screen flex-col ${isMobile ? "bg-[var(--sm-black)]" : ""}`}>
      {/* Background: TREV with the crowd at a house show (on tour). Mobile: bounded block pinned to
          the top; desktop: full-page fixed cover. */}
      <div
        className={isMobile ? "fixed inset-x-0 top-0 z-0 overflow-hidden" : "fixed inset-0 z-0 overflow-hidden"}
        style={isMobile ? { height: "58vh" } : undefined}
      >
        <img src="/trev-community-crowd.jpg" alt="" aria-hidden className="animate-kenburns h-full w-full object-cover object-[50%_25%]" />
        <div aria-hidden className="haze-drift" />
        <div className="absolute inset-0 bg-black/65" />
      </div>
      <Navbar />
      <main
        className={`relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 text-center ${isMobile ? "pb-16" : "pb-32"}`}
        style={{ paddingTop: isMobile ? "calc(4rem + 8vh)" : "calc(10rem + 7vh)" }}
      >
        <Reveal>
          <span className="overline">Community</span>
          <h1
            className={`font-display font-normal text-[var(--sm-text)] text-legible ${
              isMobile ? "text-3xl" : "text-5xl sm:text-6xl"
            }`}
          >
            {KINGDOM_LINE}
          </h1>
        </Reveal>

        {/* Laylo CTA box — rendered directly (no Reveal transform) so its
            backdrop-blur composites correctly from the first frame; the glow
            pulse also needs to run immediately. */}
        <div
          className={`animate-glow-pulse mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-6 rounded-xl border border-[var(--sm-gold)]/25 bg-black/45 px-8 py-5 backdrop-blur-sm ${
            isMobile ? "mt-6" : "mt-10"
          }`}
        >
          <p className="font-body max-w-sm text-left text-sm font-light text-white/75">
            Join TREV's list for new music, videos, and shows.
          </p>
          <a
            href={LAYLO_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="community-signup-laylo-link"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--sm-gold)] px-6 py-2.5 font-body text-sm font-medium text-black transition-colors hover:bg-[var(--sm-gold-light)]"
          >
            {LAYLO_CTA} <ArrowUpRight size={15} />
          </a>
        </div>

        {/* Text-to-join + Patreon. */}
        <Reveal delay={0.2}>
          <div className={`mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 ${isMobile ? "mt-6" : "mt-8"}`}>
            <a
              href={TEXT_SMS_HREF}
              data-testid="community-text-join-link"
              className="flex flex-col items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-6 py-5 backdrop-blur-sm transition-colors hover:border-[var(--sm-gold)]/60"
            >
              <MessageSquare size={18} className="text-[var(--sm-gold)]" />
              <span className="font-body text-sm text-white/80">
                Text <span className="font-medium text-[var(--sm-gold-light)]">{TEXT_KEYWORD}</span> to
              </span>
              <span className="font-display text-xl tracking-wider text-white">{TEXT_NUMBER}</span>
            </a>
            <a
              href={PATREON_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="community-patreon-link"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/45 px-6 py-5 backdrop-blur-sm transition-colors hover:border-[var(--sm-gold)]/60"
            >
              <Heart size={18} className="text-[var(--sm-gold)]" />
              <span className="font-body text-sm text-white/80">Support on</span>
              <span className="font-display inline-flex items-center gap-2 text-xl tracking-wider text-white">
                Patreon <ArrowUpRight size={16} />
              </span>
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className={`flex items-center justify-center gap-7 ${isMobile ? "mt-10" : "mt-14"}`}>
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-accent text-xs uppercase tracking-[0.2em] text-white/70 text-legible transition-colors hover:text-[var(--sm-gold-light)]"
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

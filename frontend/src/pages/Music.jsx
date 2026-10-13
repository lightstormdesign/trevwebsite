import { Apple, Youtube, ArrowUpRight, Music2, Disc3 } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { KingdomPreview } from "@/components/site/KingdomPreview";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  SOCIALS,
  SPOTIFY_ARTIST_ID,
  SPOTIFY_ARTIST_URL,
  MUSIC_PLATFORM_LINKS,
  LAYLO_URL,
  LAYLO_CTA,
  MUSIC_TAGLINE_LINES,
  SITE_GENRE_TAGS,
} from "@/data/site";

// Spotify's official artist embed pulls TREV's discography straight from his
// artist profile and stays current automatically as he releases new music.
const spotifyEmbedSrc = SPOTIFY_ARTIST_ID
  ? `https://open.spotify.com/embed/artist/${SPOTIFY_ARTIST_ID}?theme=0`
  : null;

const PLATFORM_ICONS = {
  Spotify: Music2,
  "Apple Music": Apple,
  YouTube: Youtube,
  Bandcamp: Disc3,
};

export default function Music() {
  const isMobile = useIsMobile();

  return (
    <div className="relative min-h-screen bg-[var(--sm-black)]">
      {/* Background: TREV sitting on the rock over Sedona (moved here from Community). */}
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <img src="/trev-about-04-now.jpg" alt="" className="animate-kenburns h-full w-full object-cover" />
        <div className="haze-drift" />
        <div className="absolute inset-0 bg-black/70" />
      </div>
      <Navbar />
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-32 pt-40 text-center">
        <Reveal>
          <span className="overline">Music</span>
          <h1 className="font-display mt-5 flex flex-col items-center font-normal leading-[1.12] text-[var(--sm-text)] text-legible" style={{ fontSize: "clamp(2rem, 6.4vw, 3.75rem)" }}>
            {MUSIC_TAGLINE_LINES.map((line) => (
              <span key={line} className="whitespace-nowrap">{line}</span>
            ))}
          </h1>
          <p className="font-accent mx-auto mt-5 max-w-2xl text-xs uppercase tracking-[0.2em] text-white/60">
            {SITE_GENRE_TAGS}
          </p>
        </Reveal>

        {/* Artist-level streaming links. */}
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {MUSIC_PLATFORM_LINKS.map((l) => {
              const Icon = PLATFORM_ICONS[l.label] || Music2;
              return (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`music-platform-link-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 font-accent text-xs uppercase tracking-[0.15em] text-white/80 transition-all duration-300 hover:border-[var(--sm-gold)]/60 hover:text-[var(--sm-gold-light)]"
                >
                  <Icon size={14} /> {l.label}
                </a>
              );
            })}
          </div>
        </Reveal>

        {/* Two-column layout: Spotify artist embed (left) alongside the
            "Kingdom" feature + Laylo unlock card (right), with a vertical
            divider between on desktop. */}
        <Reveal delay={0.2}>
          <div className="mt-16 grid grid-cols-1 gap-12 text-left lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-white/10">
            <div className="flex h-full flex-col lg:pr-10">
              <span className="overline">Top Tracks</span>
              {spotifyEmbedSrc ? (
                <iframe
                  data-testid="spotify-embed"
                  title="TREV on Spotify"
                  src={spotifyEmbedSrc}
                  width="100%"
                  className="mt-6 flex-1"
                  style={{ borderRadius: "12px", minHeight: isMobile ? 380 : 520 }}
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              ) : (
                <div
                  data-testid="spotify-embed-placeholder"
                  className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--sm-gold)]/30 px-6 py-16"
                  style={{ minHeight: isMobile ? 380 : 520 }}
                >
                  <a
                    href={SPOTIFY_ARTIST_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-sm text-white/60 hover:text-[var(--sm-gold-light)]"
                  >
                    Listen on Spotify
                  </a>
                </div>
              )}
            </div>

            <div className="lg:pl-10">
              <span className="overline" style={{ color: "var(--sm-turquoise)" }}>
                New Release
              </span>

              {/* "Kingdom" — official video preview: 20 seconds, then "Get the full video" -> Laylo. */}
              <div className="mt-5" data-testid="music-kingdom-feature">
                <h3 className="font-display text-2xl text-white">Kingdom</h3>
                <p className="font-body mt-1 text-xs font-light italic text-white/55">Official music video · preview</p>
                <div className="mt-3">
                  <KingdomPreview />
                </div>
              </div>

              {/* Laylo list — "Unlock the Kingdom". */}
              <div className="mt-12 flex flex-col items-center gap-4 rounded-xl border border-[var(--sm-gold)]/25 bg-black/30 px-6 py-8 text-center">
                <p className="font-accent text-lg italic text-white/80">Remember who you are.</p>
                <a
                  href={LAYLO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="music-laylo-link"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--sm-gold)] px-6 py-2.5 font-body text-sm font-medium text-black transition-colors hover:bg-[var(--sm-gold-light)]"
                >
                  {LAYLO_CTA} <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-20 flex items-center justify-center gap-7">
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

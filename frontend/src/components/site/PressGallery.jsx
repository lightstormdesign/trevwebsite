import { useEffect, useRef, useState } from "react";
import { Download, Volume2, VolumeX } from "lucide-react";

// TREV's press photos and clips, shared by the EPK (its best few first, "See full gallery" for the rest) and the
// Gallery page (all of them).
// EPK gallery — a mix of live, travel, studio and Sedona shots (natural aspect, masonry columns).
// The "Kingdom" video stills are limited to a few strong ones, never mid-verse.
// Every crowd/live photo goes here (shown first, full width). Add more as they come in.
// Each also downloads full size (press: public/press, up to 3000px JPGs, and all of them in one zip).
// Live shots first (stage, crowds), then portraits. Each one's press: the full-size JPG it downloads (public/press,
// numbered in this order; the crowd photo is 01).
// The lead photo, full width (the room lit up is what bookers want to see).
export const EPK_CROWD = [
  { src: "/trev-epk-live-12.jpg", alt: "TREV on stage, arms open", press: "/press/trev-press-01.jpg?v=5" },
];
// featured: the sharpest, strongest shots, shown at first; the rest open with "See full gallery". Every photo's
// full-size JPG (press) is in the zip too.
export const EPK_GALLERY = [
  { src: "/trev-epk-live-01.jpg", alt: "TREV performing live, festival main stage", press: "/press/trev-press-02.jpg?v=5", featured: true },
  { src: "/trev-epk-live-18.jpg", alt: "TREV, his band and the front row shouting together", press: "/press/trev-press-03.jpg?v=5", featured: true },
  { src: "/trev-epk-live-19.jpg", alt: "TREV and his band on stage with a festival crowd behind", press: "/press/trev-press-04.jpg?v=5", featured: true },
  { video: "/trev-epk-clip-01.mp4", poster: "/trev-epk-clip-01.jpg", ratio: "16 / 9", alt: "Video: a festival crowd cheering for TREV", featured: true },
  { src: "/trev-epk-live-03.jpg", alt: "The view from the stage over a festival crowd", press: "/press/trev-press-05.jpg?v=5", featured: true },
  { src: "/trev-epk-live-17.jpg", alt: "TREV and his band with a packed pavilion crowd at night", press: "/press/trev-press-06.jpg?v=5", featured: true },
  { src: "/trev-epk-hawaii.jpg", alt: "TREV above the Hawaiian coast at sunset", press: "/press/trev-press-07.jpg?v=5", featured: true },
  { src: "/trev-epk-live-02.jpg", alt: "TREV on the festival main stage", press: "/press/trev-press-08.jpg?v=5", featured: true },
  { src: "/trev-epk-studio-2.jpg", alt: "TREV at the mic in a red-lit studio", press: "/press/trev-press-09.jpg?v=5", featured: true },
  { src: "/trev-epk-sedona-2.jpg", alt: "TREV in front of the red rocks, Sedona", press: "/press/trev-press-10.jpg?v=5", featured: true },
  { src: "/trev-epk-live-13.jpg", alt: "TREV singing a duet under purple stage light", press: "/press/trev-press-11.jpg?v=5" },
  { src: "/trev-epk-live-14.jpg", alt: "TREV on a stool on stage, eyes closed, in golden light", press: "/press/trev-press-12.jpg?v=5" },
  { src: "/trev-epk-live-05.jpg", alt: "TREV singing a duet on stage", press: "/press/trev-press-13.jpg?v=5" },
  { video: "/trev-epk-clip-02.mp4", poster: "/trev-epk-clip-02.jpg", ratio: "9 / 16", featured: true, alt: "Video: TREV performing in the middle of the crowd at a house show" },
  { src: "/trev-epk-live-06.jpg", alt: "TREV singing outdoors in golden light", press: "/press/trev-press-14.jpg?v=5" },
  { src: "/trev-epk-live-04.jpg", alt: "TREV with a full house after an indoor show", press: "/press/trev-press-15.jpg?v=5" },
  { src: "/trev-epk-live-08.jpg?v=2", alt: "TREV and fellow artists on stage, festival crowd behind", press: "/press/trev-press-16.jpg?v=5" },
  { src: "/trev-epk-live-10.jpg?v=2", alt: "TREV and friends on stage at sunset, festival crowd behind", press: "/press/trev-press-17.jpg?v=5" },
  { src: "/trev-epk-live-15.jpg", alt: "TREV in front of the SLUG Magazine main stage, Craft Lake City DIY Fest", press: "/press/trev-press-18.jpg?v=5" },
  { src: "/trev-epk-live-07.jpg", alt: "TREV with a festival crowd after his set", press: "/press/trev-press-19.jpg?v=5" },
  { src: "/trev-epk-live-20.jpg", alt: "TREV rapping into the mic", press: "/press/trev-press-20.jpg?v=5" },
  { src: "/trev-community-crowd.jpg", alt: "TREV with the crowd at a house show", press: "/press/trev-press-21.jpg?v=5" },
  { src: "/trev-epk-live-09.jpg", alt: "TREV and fellow artists on stage with the crowd", press: "/press/trev-press-22.jpg?v=5" },
  { video: "/trev-epk-clip-03.mp4", poster: "/trev-epk-clip-03.jpg", ratio: "9 / 16", featured: true, alt: "Video: a crowd around the fire at night" },
  { src: "/trev-epk-live-11.jpg", alt: "TREV with the crowd in a festival tent at night", press: "/press/trev-press-23.jpg?v=5" },
  { src: "/trev-epk-live-16.jpg", alt: "TREV with friends in a festival tent", press: "/press/trev-press-24.jpg?v=5" },
  { src: "/trev-epk-sign-2.jpg", alt: "TREV holding a sign: The Kingdom Is Within You", press: "/press/trev-press-25.jpg?v=5" },
  { src: "/trev-epk-film.jpg", alt: "TREV, black-and-white film portrait", press: "/press/trev-press-26.jpg?v=5" },
  { src: "/trev-epk-astral.jpg", alt: "TREV and Sierra Marin at Astral Valley", press: "/press/trev-press-27.jpg?v=5" },
  { src: "/trev-epk-zion.jpg", alt: "TREV in the canyon country of southern Utah", press: "/press/trev-press-28.jpg?v=5" },
  { src: "/trev-epk-bucket.jpg", alt: "TREV smiling in a bucket hat", press: "/press/trev-press-29.jpg?v=5" },
  { src: "/trev-epk-boardwalk.jpg", alt: "TREV on a boardwalk through the reeds", press: "/press/trev-press-30.jpg?v=5" },
  { src: "/trev-epk-beach-4.jpg", alt: "TREV on the beach, eyes closed", press: "/press/trev-press-31.jpg?v=5" },
  { src: "/trev-epk-01.jpg", alt: "TREV in Sedona", press: "/press/trev-press-32.jpg?v=5" },
  { src: "/trev-epk-costa-rica.jpg", alt: "TREV in Costa Rica", press: "/press/trev-press-33.jpg?v=5" },
  { src: "/trev-epk-beach-2.jpg", alt: "TREV on the beach", press: "/press/trev-press-34.jpg?v=5" },
  { src: "/trev-epk-beach-3.jpg", alt: "TREV on the beach, dispersion edit", press: "/press/trev-press-35.jpg?v=5" },
  { src: "/trev-epk-09.jpg", alt: "TREV sitting above Sedona", press: "/press/trev-press-36.jpg?v=5" },
  { src: "/trev-epk-02.jpg", alt: "TREV in prayer, Sedona", press: "/press/trev-press-37.jpg?v=5" },
  { src: "/trev-epk-11.jpg", alt: "TREV at sunset", press: "/press/trev-press-38.jpg?v=5" },
  { src: "/trev-story-03-the-room.jpg", alt: "TREV in his studio", press: "/press/trev-press-39.jpg?v=5" },
  { src: "/trev-epk-we-are-the-i-am.jpg", alt: "Cover art: We Are The I Am, A Soundtrack for Awakening", press: "/press/trev-press-40.jpg?v=5" },
];
export const GALLERY_TOTAL = EPK_CROWD.length + EPK_GALLERY.length;
export const PRESS_ZIP = "/press/trev-press-photos.zip?v=5";

// a photo that downloads full size when tapped, a small download mark in its corner
// A short clip in the gallery: plays silently on a loop while it's on screen (paused off screen); the speaker
// in its corner turns its sound on (and any other clip's off).
export const GalleryVideo = ({ g, className = "" }) => {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  // (set on the element itself too: iOS autoplays only a clip that's muted as it starts)
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    const onOther = (e) => { if (e.detail !== v) setMuted(true); };
    window.addEventListener("epk-clip-sound", onOther);
    return () => window.removeEventListener("epk-clip-sound", onOther);
  }, []);
  const toggle = () => {
    const v = ref.current;
    const next = !muted;
    setMuted(next);
    if (v && !next) {
      window.dispatchEvent(new CustomEvent("epk-clip-sound", { detail: v }));
      v.play().catch(() => {});
    }
  };
  return (
    <div data-testid="gallery-video" className={`relative overflow-hidden rounded-lg border border-white/10 bg-black/40 ${className}`}>
      <video
        ref={ref}
        src={g.video}
        poster={g.poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={g.alt}
        className="block h-auto w-full bg-black object-cover"
        style={{ aspectRatio: g.ratio }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? "Turn this clip's sound on" : "Turn this clip's sound off"}
        className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/85 transition-colors hover:bg-[var(--sm-gold)] hover:text-black"
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>
    </div>
  );
};

export const PressPhoto = ({ g, className = "" }) => (
  <a
    href={g.press}
    download
    aria-label={`Download this photo full size: ${g.alt}`}
    data-testid="press-photo"
    className={`group relative block overflow-hidden rounded-lg border border-white/10 bg-black/40 ${className}`}
  >
    <img src={g.src} alt={g.alt} className="block h-auto w-full" loading="lazy" />
    <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/85 transition-colors group-hover:bg-[var(--sm-gold)] group-hover:text-black">
      <Download size={12} />
    </span>
  </a>
);


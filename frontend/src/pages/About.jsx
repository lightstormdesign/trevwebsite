// About — "Enter the world of TREV". An opening descent through TREV's illustrated Sedona world
// (SedonaWorld: sky, clouds, red rocks, path and a leafy foreground, each moving at its own speed),
// then his story as a pinned slideshow: each scroll/swipe step crossfades to the next slide in place
// (no copy sliding up), over the darkened world, framed by his Sedona horizon along the bottom.
//
// Story copy: condensed from TREV's Instagram story carousel, his first-person voice.
// Photos (public/): trev-story-01-quit-music.jpg … trev-story-10-kingdom.jpg (+ 09 is a beach video
// loop, trev-story-09-the-reward.mp4). 03 is still a Kingdom-video frame — no photo sent for that beat.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Fireflies } from "@/components/site/Fireflies";
import { SedonaWorld } from "@/components/site/SedonaWorld";
import { ARTIST_NAME, LAYLO_CTA, SOCIALS } from "@/data/site";
import { heroLogoPlacement, LOGO_ANCHOR, LOGO_ASPECT } from "@/utils/kingdomLogo";

const FEATHER =
  "radial-gradient(ellipse 82% 86% at 50% 50%, #000 60%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0) 100%)";
const GRADE = "saturate(1.08) brightness(1.04) contrast(1.02) sepia(0.04)";

const SLIDES = [
  {
    id: "quit-music", media: "/trev-story-01-quit-music.jpg", lead: true,
    body: ["This whole thing started the day I quit music."],
  },
  {
    id: "first-dream", title: "The First Dream", media: "/trev-story-02-first-dream.jpg",
    body: [
      "Basketball was my religion and Michael Jordan was God. Then I didn't make the high school team. In Utah, the coach was the bishop, and every kid he picked was from his church.",
      "My first lesson on the “Kingdom of Heaven”: it was an exclusive club, and I wasn't chosen.",
    ],
  },
  {
    id: "second-dream", title: "The Second Dream", media: "/trev-story-03-second-dream.jpg",
    body: [
      "If I couldn't find God in basketball, I'd find it through hip-hop. I locked myself in my room to meditate and write until I became the best rapper in the world.",
      "But I was caught in cycles of addiction, and I wasn't building anything.",
    ],
  },
  {
    id: "the-leap", title: "The Leap", media: "/trev-story-04-the-leap.jpg",
    body: [
      "Years later, a few videos took off: over a million views, huge stages, opening for artists I idolized. Believing “if you jump, the net will appear,” we took a one-way flight to Costa Rica.",
      "The net was a mirage. And maybe I was too.",
    ],
  },
  {
    id: "rise-free", title: "Rise Free", media: "/trev-story-05-rise-free.jpg",
    body: [
      "I gave up on music and ended up in my mom's basement, working night shifts at the post office. My dream was dead for a second time.",
      "In that basement I finally understood: no label, no manager, no miracle was coming. I was the one I'd been waiting for.",
    ],
  },
  {
    id: "every-hat", title: "Every Hat", media: "/trev-story-06-every-hat.jpg",
    body: [
      "So I started to build. I saved post office checks for my first tour and learned every hat: recording engineer, designer, video editor, booking agent.",
    ],
  },
  {
    id: "first-tour", title: "Making It", media: "/trev-story-07-first-tour.jpg",
    body: [
      "After that first tour, I wasn't trying to “make it” anymore. I WAS making it.",
    ],
  },
  {
    id: "the-sword", title: "Create Who I Am", media: "/trev-story-08-sword.jpg",
    body: [
      "I finally understood The Lion King. The mission wasn't just to remember who I am. It was to CREATE who I am.",
    ],
  },
  {
    id: "the-reward", title: "My Own Kingdom", video: "/trev-story-09-the-reward.mp4", media: "/trev-story-09-the-reward.jpg",
    body: [
      "I stopped seeking a kingdom and started building my own. I met the love of my life, started touring internationally, and began making a living from my music.",
    ],
  },
  {
    id: "my-name-is-trev", title: "My Name Is TREV", media: "/trev-story-10-kingdom.jpg",
    body: [
      "I come with the infinite power of the spoken word. Every song is medicine made from my journey, a prayerformance for the man I needed during my own dark night of the soul.",
    ],
    line: "The Kingdom of Heaven is within.",
  },
  { id: "invitation", cta: true },
];
const N = SLIDES.length;
const STEP_SVH = 70; // scroll distance per slide

const Media = ({ s }) => {
  const mask = { WebkitMaskImage: FEATHER, maskImage: FEATHER };
  const cls = "relative mx-auto max-h-[34svh] w-auto max-w-full select-none object-contain lg:max-h-[56vh]";
  return (
    <div className="relative flex items-center justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute h-[85%] w-[90%]"
        style={{ background: "radial-gradient(ellipse at center, rgba(227,163,92,0.2) 0%, rgba(241,207,151,0.06) 45%, transparent 75%)", filter: "blur(30px)" }}
      />
      {s.video ? (
        <video className={cls} style={{ ...mask, filter: GRADE }} src={s.video} poster={s.media} autoPlay muted loop playsInline preload="metadata" />
      ) : (
        <img src={s.media} alt={ARTIST_NAME} className={cls} style={{ ...mask, filter: GRADE }} decoding="async" />
      )}
    </div>
  );
};

const Slide = ({ s, i, active }) => {
  const base = {
    opacity: active ? 1 : 0,
    transform: active ? "scale(1)" : "scale(1.015)",
    transition: "opacity 0.8s ease, transform 1.2s ease",
    pointerEvents: active ? "auto" : "none",
  };
  if (s.cta) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center" style={base} data-testid="about-invitation">
        <div className="flex flex-col items-center">
          <h2 className="font-display max-w-xl text-3xl font-normal leading-tight text-white text-legible sm:text-4xl">
            If this resonates, <span className="text-gold-grad">enter the Kingdom.</span>
          </h2>
          <Link
            to="/community"
            data-testid="about-cta"
            className="mt-9 inline-flex rounded-full bg-[var(--sm-gold)] px-8 py-3.5 font-body text-sm font-medium text-black transition-colors hover:bg-[var(--sm-gold-light)]"
          >
            {LAYLO_CTA}
          </Link>
          <div className="mt-10 flex items-center justify-center gap-7">
            {SOCIALS.map((so) => (
              <a key={so.label} href={so.href} target="_blank" rel="noopener noreferrer" className="font-accent text-xs uppercase tracking-[0.2em] text-white/70 transition-colors hover:text-[var(--sm-gold-light)]">
                {so.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (s.lead) {
    return (
      <div className="absolute inset-x-0 top-0 bottom-[14vh] z-10 flex flex-col items-center justify-center gap-8 px-6 pt-16 text-center" style={base} data-testid={`about-slide-${s.id}`}>
        <div className="w-full max-w-2xl [&_img]:lg:max-h-[48vh]"><Media s={s} /></div>
        <p className="font-accent max-w-2xl text-3xl italic leading-snug text-white/90 text-legible sm:text-4xl">{s.body[0]}</p>
      </div>
    );
  }
  const textFirst = i % 2 === 0; // alternate sides on desktop
  return (
    <div className="absolute inset-x-0 top-0 bottom-[14vh] z-10 flex items-center" style={base} data-testid={`about-slide-${s.id}`}>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-6 px-6 pt-16 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className={`order-1 ${textFirst ? "lg:order-2" : "lg:order-1"}`}><Media s={s} /></div>
        <div className={`relative order-2 ${textFirst ? "lg:order-1" : "lg:order-2"}`}>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 rounded-[40%]"
            style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 78%)", filter: "blur(20px)" }}
          />
          <h2 className="font-display text-2xl font-normal text-[var(--sm-text)] text-legible sm:text-3xl">{s.title}</h2>
          <div className="mt-4 space-y-3">
            {s.body.map((para, j) => (
              <p key={j} className="font-accent text-lg leading-relaxed text-white/90 text-legible sm:text-xl lg:text-2xl">{para}</p>
            ))}
          </div>
          {s.line && <p className="font-display mt-6 text-xl tracking-[0.1em] text-gold-grad sm:text-2xl">{s.line}</p>}
        </div>
      </div>
    </div>
  );
};

export default function About() {
  const hookRef = useRef(null);
  const hookTextRef = useRef(null);
  const storyRef = useRef(null);
  const [slide, setSlide] = useState(-1);
  // the logo sits exactly where it sits on the homepage hero, so "My Story" feels continuous
  const [logo, setLogo] = useState(() => heroLogoPlacement(window.innerWidth, window.innerHeight));

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = 0;
      // the opening's title fades and lifts away as you start to descend
      const el = hookTextRef.current, hook = hookRef.current;
      if (el && hook) {
        const span = hook.offsetHeight - window.innerHeight;
        const t = Math.max(0, Math.min(1, window.scrollY / Math.max(1, span) / 0.28));
        el.style.opacity = (1 - t).toFixed(3);
        el.style.transform = `translate3d(0, ${(-40 * t).toFixed(1)}px, 0)`;
        el.style.pointerEvents = t > 0.6 ? "none" : "auto";
      }
      // which slide: the first fades in the moment the world has landed (end of the opening), then
      // each scroll step crossfades to the next, in place; past the story they all fade away
      const st = storyRef.current;
      if (st && hook) {
        const landed = hook.offsetTop + hook.offsetHeight - window.innerHeight;
        const into = window.scrollY - landed;
        const step = (window.innerHeight * STEP_SVH) / 100;
        const past = window.scrollY > st.offsetTop + st.offsetHeight - window.innerHeight * 0.6;
        const idx = into < 0 || past ? -1 : Math.min(N - 1, Math.floor(into / step));
        setSlide((cur) => (cur === idx ? cur : idx));
      }
      setLogo((cur) => {
        const next = heroLogoPlacement(window.innerWidth, window.innerHeight);
        return cur.x === next.x && cur.y === next.y && cur.width === next.width ? cur : next;
      });
    };
    const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const readStory = () => {
    const hook = hookRef.current;
    if (hook) window.scrollTo({ top: hook.offsetTop + hook.offsetHeight - window.innerHeight, behavior: "smooth" });
  };
  const logoH = logo.width / LOGO_ASPECT;
  const logoTop = logo.y - logoH * LOGO_ANCHOR.y;

  return (
    <div data-testid="about-page" className="relative bg-[var(--sm-black)]">
      <SedonaWorld hookRef={hookRef} />
      <Fireflies />
      <Navbar />

      {/* The opening: a tall scroll span that drives the descent through the world. */}
      <section ref={hookRef} data-testid="about-hook" className="relative z-10" style={{ height: "300svh" }}>
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          <div ref={hookTextRef} className="absolute inset-0">
            <h1 className="absolute m-0" style={{ left: logo.x, top: logoTop, width: 0 }}>
              <span
                className="font-display absolute bottom-3 left-0 -translate-x-1/2 whitespace-nowrap text-[0.7rem] font-normal uppercase tracking-[0.5em] text-[var(--sm-cream)] [margin-right:-0.5em] [text-shadow:0_1px_14px_rgba(0,0,0,0.85),0_0_3px_rgba(0,0,0,0.6)] sm:text-xs"
              >
                Enter the world of
              </span>
              <span className="sr-only">TREV</span>
            </h1>
            {/* the homepage hero's logo, same spot and size */}
            <img
              src="/trev-logo.png"
              alt={ARTIST_NAME}
              data-testid="about-logo"
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: logo.x - logo.width * LOGO_ANCHOR.x, top: logoTop, width: logo.width, filter: "drop-shadow(0 4px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 2px rgba(0,0,0,0.35))" }}
            />
            <div className="absolute flex -translate-x-1/2 flex-col items-center" style={{ left: logo.x, top: logoTop + logoH + 26 }}>
              <button
                type="button"
                onClick={readStory}
                data-testid="about-read-story"
                className="font-display whitespace-nowrap rounded-full border border-white/40 bg-black/25 px-8 py-3 text-[0.65rem] uppercase tracking-[0.36em] text-[var(--sm-text)] backdrop-blur-md transition-colors hover:border-white/80"
              >
                Read My Story
              </button>
              <ChevronDown size={20} className="mt-8 text-[var(--sm-gold-light)]/80" style={{ animation: "breathe 2.4s ease-in-out infinite" }} aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* The story: a fixed stage over the landed world. The section below only provides scroll room;
          each step crossfades to the next slide in place — nothing scrolls up from the bottom. */}
      <section ref={storyRef} id="story" data-testid="about-story" aria-hidden className="relative" style={{ height: `${N * STEP_SVH}svh` }} />
      <div
        className="fixed inset-0 z-10 overflow-hidden"
        style={{ opacity: slide >= 0 ? 1 : 0, pointerEvents: slide >= 0 ? "auto" : "none", transition: "opacity 0.8s ease" }}
      >
        {SLIDES.map((s, i) => (
          <Slide key={s.id} s={s} i={i} active={slide === i} />
        ))}
        {/* his Sedona horizon framing the bottom of the story */}
        <img
          src="/trev-border-sedona.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[14vh] w-full select-none object-cover object-bottom opacity-90"
          decoding="async"
        />
        <div
          className="absolute bottom-0 left-0 z-20 h-[2px] bg-gradient-to-r from-[var(--sm-gold-accent)] to-[var(--sm-gold-light)]"
          style={{ width: `${(Math.max(0, slide + 1) / N) * 100}%`, opacity: 0.75, transition: "width 0.6s ease" }}
        />
      </div>

      <div className="relative z-10 bg-[var(--sm-black)]">
        <Footer />
      </div>
    </div>
  );
}

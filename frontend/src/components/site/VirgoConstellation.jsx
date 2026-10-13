import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { TOUR_DATES } from "@/data/site";

// Virgo's ten main named stars, positioned from real right ascension /
// declination (not evenly spaced like a generic "connect the dots" — this
// is the actual asterism). RA (hours) maps to X, Dec (degrees) maps to Y
// (inverted, since higher Dec is "up" but screen Y increases downward),
// both normalized to a 0-100 box from the real coordinate spread across
// these ten stars.
const VIRGO_STARS = {
  zavijava: { name: "Zavijava (β Vir)", x: 0, y: 41.6 },
  zaniah: { name: "Zaniah (η Vir)", x: 17.3, y: 52.6 },
  porrima: { name: "Porrima (γ Vir)", x: 30.1, y: 56.1 },
  auva: { name: "Auva (δ Vir)", x: 38.1, y: 34.2 },
  vindemiatrix: { name: "Vindemiatrix (ε Vir)", x: 41.6, y: 0 },
  spica: { name: "Spica (α Vir)", x: 54.9, y: 100 },
  heze: { name: "Heze (ζ Vir)", x: 60.1, y: 52.3 },
  kang: { name: "Kang (κ Vir)", x: 82.7, y: 96.0 },
  syrma: { name: "Syrma (ι Vir)", x: 84.4, y: 76.7 },
  rijlAlAwwa: { name: "Rijl al Awwa (μ Vir)", x: 100, y: 75.2 },
};

// The real asterism's connecting lines — Virgo's traditional "maiden
// holding a sheaf of wheat" shape: a head/shoulders branch (zavijava ->
// zaniah -> porrima -> auva -> vindemiatrix) and a body/skirt branch
// forking from porrima down through heze to spica, then trailing out to
// syrma, kang and rijlAlAwwa.
const VIRGO_EDGES = [
  ["zavijava", "zaniah"],
  ["zaniah", "porrima"],
  ["porrima", "auva"],
  ["auva", "vindemiatrix"],
  ["porrima", "heze"],
  ["heze", "spica"],
  ["heze", "syrma"],
  ["syrma", "rijlAlAwwa"],
  ["syrma", "kang"],
];

// Tour dates are chronological; stars are assigned left-to-right (by X)
// so the story still reads in date order across the shape, same spirit as
// a left-to-right timeline, just following Virgo's real proportions
// instead of even spacing.
const STAR_ORDER = [
  "zavijava",
  "zaniah",
  "porrima",
  "auva",
  "vindemiatrix",
  "spica",
  "heze",
  "kang",
  "syrma",
  "rijlAlAwwa",
];

export const VirgoConstellation = () => {
  const [active, setActive] = useState(null);

  const points = useMemo(
    () =>
      STAR_ORDER.map((key, i) => ({
        key,
        ...VIRGO_STARS[key],
        date: TOUR_DATES[i],
      })).filter((p) => p.date),
    []
  );

  const activePoint = active !== null ? points.find((p) => p.key === active) : null;
  const tooltipAbove = activePoint ? activePoint.y > 55 : false;

  return (
    <section data-testid="virgo-constellation" className="relative">
      <div
        className="relative mx-auto h-[320px] w-full max-w-3xl sm:h-[380px]"
        onClick={() => setActive(null)}
        data-testid="virgo-constellation-map"
      >
        {/* The asterism itself — always the same shape regardless of which
            dates are loaded, drawn once from VIRGO_EDGES/VIRGO_STARS. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {VIRGO_EDGES.map(([a, b], i) => {
            const sa = VIRGO_STARS[a];
            const sb = VIRGO_STARS[b];
            return (
              <motion.line
                key={i}
                x1={sa.x}
                y1={sa.y}
                x2={sb.x}
                y2={sb.y}
                stroke="var(--sm-gold)"
                strokeWidth="0.2"
                strokeOpacity="0.4"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.12, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {points.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActive(active === p.key ? null : p.key);
            }}
            className="group absolute -m-2 -translate-x-1/2 -translate-y-1/2 p-2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            data-testid={`virgo-star-${p.key}`}
            data-magnetic="true"
            aria-label={`${p.date.event} — ${p.date.date}, ${p.date.location}`}
            aria-expanded={active === p.key}
          >
            <span
              className={`animate-breathe block rounded-full bg-[var(--sm-gold-light)] transition-all duration-300 ${
                active === p.key
                  ? "h-4 w-4 shadow-[0_0_22px_7px_rgba(214,179,101,0.75)]"
                  : "h-2.5 w-2.5 shadow-[0_0_12px_3px_rgba(214,179,101,0.5)] group-hover:h-3.5 group-hover:w-3.5"
              }`}
            />
            <span className="font-accent absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-wide text-white/45 opacity-0 transition-opacity group-hover:opacity-100">
              {p.date.date}
            </span>
          </button>
        ))}

        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, y: tooltipAbove ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: tooltipAbove ? -8 : 8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute z-20 w-60 rounded-xl border border-[var(--sm-gold)]/30 bg-black/85 p-5 text-left shadow-2xl backdrop-blur-sm"
              style={{
                left: `${Math.min(Math.max(activePoint.x, 22), 78)}%`,
                top: `${activePoint.y}%`,
                transform: `translate(-50%, ${tooltipAbove ? "calc(-100% - 14px)" : "14px"})`,
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid="virgo-star-tooltip"
            >
              <button
                onClick={() => setActive(null)}
                className="absolute right-3 top-3 text-white/40 transition-colors hover:text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
              <p className="font-accent text-xs uppercase tracking-[0.15em] text-[var(--sm-gold)]">{activePoint.date.date}</p>
              <p className="font-display mt-1 pr-4 text-lg text-white">{activePoint.date.event}</p>
              <p className="font-body mt-3 flex items-center gap-2 text-sm text-white/60">
                <MapPin size={13} /> {activePoint.date.location}
              </p>
              <p className="font-accent mt-3 text-[0.6rem] uppercase tracking-[0.15em] text-white/30">{activePoint.name}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

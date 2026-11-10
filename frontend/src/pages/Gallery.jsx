import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { EPK_CROWD, EPK_GALLERY, GALLERY_TOTAL, PRESS_ZIP, GalleryVideo, PressPhoto } from "@/components/site/PressGallery";

// Every photo and clip, the EPK's strongest first (the same list and order as the EPK's full gallery).
// Photos download full size when tapped; "Download all" is the zip.
const ITEMS = [...EPK_CROWD, ...EPK_GALLERY];

// 2 columns on phones, 3 on tablets, 4 on desktop
const colsFor = () => (window.matchMedia("(min-width: 1024px)").matches ? 4 : window.matchMedia("(min-width: 640px)").matches ? 3 : 2);
const useColumns = () => {
  const [n, setN] = useState(colsFor);
  useEffect(() => {
    const on = () => setN(colsFor());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
};

export default function Gallery() {
  // dealt out across the columns in turn (not column by column), so the strongest shots fill the top row
  const n = useColumns();
  const cols = Array.from({ length: n }, (_, c) => ITEMS.filter((_, i) => i % n === c));
  return (
    <div className="starfield relative min-h-screen">
      <Navbar />
      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-36 sm:px-6">
        <Reveal>
          <div className="text-center">
            <span className="overline">TREV</span>
            <h1 className="font-display mt-5 text-4xl font-normal text-[var(--sm-text)] sm:text-5xl">Gallery</h1>
            <p className="font-body mx-auto mt-4 max-w-md text-sm font-light text-white/60">
              On stage, with the people, and on the road. {GALLERY_TOTAL} photos &amp; clips.
            </p>
            <a
              href={PRESS_ZIP}
              download
              data-testid="gallery-zip"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 font-body text-xs text-white/75 transition-colors hover:border-[var(--sm-gold)]/60 hover:text-[var(--sm-gold-light)]"
            >
              <Download size={13} /> Download all photos
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div data-testid="gallery-grid" className="mt-10 flex items-start gap-2">
            {cols.map((col, c) => (
              <div key={c} className="flex min-w-0 flex-1 flex-col gap-2">
                {col.map((g) =>
                  g.video ? <GalleryVideo key={g.video} g={g} /> : <PressPhoto key={g.src} g={g} />,
                )}
              </div>
            ))}
          </div>
          <p className="font-body mt-3 text-center text-[0.7rem] text-white/40">
            Tap any photo to download it full size. Tap a clip's speaker for sound.
          </p>
          <div className="mt-10 text-center">
            <Link
              to="/epk"
              className="inline-flex rounded-full border border-[var(--sm-gold)]/40 px-7 py-3 font-accent text-xs uppercase tracking-[0.2em] text-[var(--sm-gold-light)] transition-colors hover:bg-[var(--sm-gold)] hover:text-black"
            >
              Booking? See the EPK
            </Link>
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

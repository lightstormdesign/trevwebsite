import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { SHOP_URL } from "@/data/site";

// Styled shell only — no cart/checkout. TREV's merch lives on Etsy, so this
// page links out to the real shop.
export default function Shop() {
  return (
    <div className="starfield relative min-h-screen">
      {/* Same ambient tint cycle as the Music page, staggered to a different
          phase so the two pages feel coordinated without moving in lockstep. */}
      <div className="ambient-tint-cycle fixed inset-0 z-0" style={{ animationDelay: "-14s" }} />
      <Navbar />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <img src="/trev-logo.png" alt="TREV" className="mx-auto h-16 w-auto object-contain opacity-90" />
          <span className="overline mt-8 block">Shop</span>
          <h1 className="font-display mt-5 text-4xl font-normal text-[var(--sm-text)] sm:text-5xl">Merch</h1>
          <p className="font-body mt-4 max-w-md text-sm font-light text-white/60">Available on Etsy.</p>
        </Reveal>
        <Reveal delay={0.15}>
          <a
            href={SHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="shop-etsy-link"
            className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3 font-accent text-xs uppercase tracking-[0.22em] text-white/75 transition-all duration-300 hover:border-[var(--sm-gold)]/60 hover:text-[var(--sm-gold-light)]"
          >
            Shop on Etsy <ArrowUpRight size={15} />
          </a>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

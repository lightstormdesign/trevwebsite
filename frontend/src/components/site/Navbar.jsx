import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { NAV_LINKS } from "@/data/site";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SoundButton } from "@/components/site/SoundButton";

const NavLink = ({ to, label, active, testId, mobile }) => (
  <Link
    to={to}
    data-testid={testId}
    onClick={mobile ? mobile.onClick : undefined}
    className={
      mobile
        ? `border-b border-white/5 py-3 text-left font-accent text-sm uppercase tracking-[0.16em] ${
            active ? "text-[var(--sm-gold-light)]" : "text-white/80"
          }`
        : `font-accent text-[0.65rem] uppercase tracking-[0.12em] transition-colors duration-300 ${
            active ? "text-[var(--sm-gold-light)]" : "text-white/70 hover:text-[var(--sm-gold-light)]"
          }`
    }
  >
    {label}
  </Link>
);

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isMobile = useIsMobile();
  // Home (the Kingdom entry + hero) gets a transparent header with no logo on
  // every device — the hero's big logo, pinned to the sun, is the logo there.
  // Mobile shows only the hamburger; desktop keeps its links. Every other page
  // keeps a normal header bar with the logo.
  const isPortalHero = isMobile && isHome;
  const isHomeBar = isHome;

  return (
    // No header bar anywhere: the menu and logo sit straight on each page's background (a soft
    // shadow keeps them legible over imagery). Home hides the logo — the hero's big logo is it.
    <header
      data-testid="site-navbar"
      className="fixed inset-x-0 top-0 z-50 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]"
    >
      {/* Portal/Hero: hamburger is right-aligned, matching the same
          position used on every other page's header (supersedes an
          earlier "centered" spec). Since no wordmark renders for
          isPortalHero, the hamburger is the only flex child here, so
          `justify-between` alone wouldn't push it right — `justify-end`
          does. */}
      <nav
        className={`relative mx-auto flex max-w-7xl items-center px-6 py-3 lg:px-8 ${
          isHomeBar ? "justify-end" : "justify-between"
        }`}
      >
        {!isHomeBar && (
          <div className="flex items-center gap-3">
          {/* the speaker: "Kingdom" keeps playing from page to page */}
          <SoundButton />
          <Link to="/" data-testid="nav-link-wordmark">
            {/* The TREV letters (no sun), as in Home's header. */}
            <img
              src="/journey/trev-logo-letters.webp"
              alt="TREV"
              className="h-[19px] w-auto object-contain drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] lg:h-[22px]"
            />
          </Link>
          </div>
        )}
        {!isPortalHero && (
          <div className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.label} to={l.to} label={l.label} active={location.pathname === l.to} testId={`nav-link-${l.label.toLowerCase()}`} />
            ))}
          </div>
        )}
        <div className="md:hidden">
          {/* Portal/Hero only: +15% over the standard 22px icon. */}
          <button data-testid="nav-mobile-toggle" onClick={() => setOpen((v) => !v)} className="text-white" aria-label="Menu">
            {open ? <X size={isPortalHero ? 25 : 22} /> : <Menu size={isPortalHero ? 25 : 22} />}
          </button>
        </div>
      </nav>

      {open && (
        <div data-testid="nav-mobile-menu" className="border-t border-white/10 bg-black/90 backdrop-blur-xl md:hidden">
          <div className="flex flex-col px-6 pb-4 pt-2">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                label={l.label}
                active={location.pathname === l.to}
                mobile={{ onClick: () => setOpen(false) }}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

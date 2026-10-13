import { Link, useLocation } from "react-router-dom";
import { NAV_LINKS, SOCIALS, SOVEREIGNTREE_URL, LABEL_NAME, ARTIST_NAME } from "@/data/site";
import { MoonPhase } from "./MoonPhase";

export const Footer = () => {
  const location = useLocation();
  return (
    <footer data-testid="site-footer" className="relative border-t border-white/10 bg-black/85 py-12 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-7 px-6 lg:px-8">
        <img src="/trev-logo.png" alt={ARTIST_NAME} className="h-14 w-auto object-contain" />

        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className={`font-accent text-[0.65rem] uppercase tracking-[0.2em] transition-colors ${
                location.pathname === l.to
                  ? "text-[var(--sm-gold-light)] hover:text-white"
                  : "text-white/55 hover:text-[var(--sm-gold-light)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={SOVEREIGNTREE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="footer-link-sovereigntree"
            className="font-accent text-[0.65rem] uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-[var(--sm-gold-light)]"
          >
            SovereignTree.org
          </a>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`footer-social-${s.label.toLowerCase()}`}
              className="font-accent text-[0.65rem] uppercase tracking-[0.2em] text-white/55 transition-colors hover:text-[var(--sm-gold-light)]"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <MoonPhase />

        {/* Credit line matches the live site: "© 2026 TREV - SOVEREIGNTREE RECORDS". */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p data-testid="footer-copyright" className="font-body text-xs font-light text-white/35">
            © {new Date().getFullYear()} {ARTIST_NAME} -{" "}
            <a
              href={SOVEREIGNTREE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--sm-gold-light)]"
            >
              {LABEL_NAME}
            </a>
          </p>
          <p data-testid="footer-built-by" className="font-body text-[0.65rem] font-light uppercase tracking-[0.2em] text-white/25">
            Built by LightStorm
          </p>
        </div>
      </div>
    </footer>
  );
};

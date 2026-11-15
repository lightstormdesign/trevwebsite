import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Page changes as a sunrise: on a click to another page, warm light swells up from the bottom of the screen,
// the page changes under it, and the light lifts away into the new page. Back/forward and new tabs stay instant;
// so does everything with reduced motion.
const RISE_MS = 480, FADE_MS = 800;
const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const SunriseTransition = () => {
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    let busy = false;
    const onClick = (e) => {
      if (busy || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;               // a file (pdf, zip, jpg...)
      if (url.pathname === window.location.pathname) return;             // same page (hash links, the logo at home)
      if (reduce()) return;
      const el = ref.current;
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      busy = true;
      el.classList.remove("lift");
      el.classList.add("rise");
      setTimeout(() => {
        navigate(url.pathname + url.search + url.hash);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          el.classList.add("lift");
          setTimeout(() => { el.classList.remove("rise", "lift"); busy = false; }, FADE_MS);
        }));
      }, RISE_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);
  return <div ref={ref} aria-hidden className="sunrise" style={{ "--rise": `${RISE_MS}ms`, "--fade": `${FADE_MS}ms` }} />;
};

export default SunriseTransition;

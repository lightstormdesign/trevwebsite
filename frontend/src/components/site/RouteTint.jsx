import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// EPK and Tour: the browser's own strip (Android Chrome's bar, the page colour Safari shows past the edges) goes a
// deep amber instead of flat black, so the page fills the phone. (Never on the home/about journey: it sets its own.)
const TINTED = { "/epk": "#1d1107", "/tour": "#1d1107" };

export const RouteTint = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const c = TINTED[pathname];
    if (!c) return undefined;
    const meta = document.createElement("meta");
    meta.name = "theme-color"; meta.content = c;
    document.head.appendChild(meta);
    const de = document.documentElement, b = document.body;
    de.style.background = c; b.style.background = c;
    return () => { meta.remove(); de.style.background = ""; b.style.background = ""; };
  }, [pathname]);
  return null;
};

export default RouteTint;

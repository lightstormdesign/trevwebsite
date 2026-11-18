import { useEffect } from "react";
import { askMotion } from "@/utils/motion";

// Touch only: every press on something tappable sends a small ring of golden light out from the fingertip.
// Tapping the menu or the speaker (never any other tap) also asks, once, on iPhone, to use the phone's tilt,
// for the press photos.
const TAPPABLE = "a, button, [role='button'], label, summary, .tj-enter, .tj-cta";
const ASKS_MOTION = ".tj-menuBtn, [data-testid='nav-mobile-toggle'], .tj-sound";

export const TapRipple = () => {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let asked = false;
    const onFirst = (e) => {
      if (asked || !e.target.closest || !e.target.closest(ASKS_MOTION)) return;
      asked = true; askMotion();
    };
    const onDown = (e) => {
      if (e.pointerType === "mouse" || reduce) return;
      if (!e.target.closest || !e.target.closest(TAPPABLE)) return;
      const r = document.createElement("span");
      r.className = "tap-ripple";
      r.style.left = `${e.clientX}px`; r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 750);
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce) {
      document.addEventListener("click", onFirst, { capture: true });
    }
    return () => {
      document.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("click", onFirst, { capture: true });
    };
  }, []);
  return null;
};

export default TapRipple;

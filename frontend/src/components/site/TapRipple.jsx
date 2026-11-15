import { useEffect } from "react";
import { askMotion } from "@/utils/motion";

// Touch only: every press on something tappable sends a small ring of golden light out from the fingertip.
// The first tap anywhere also asks (on iPhone) to use the phone's tilt, for the press photos.
const TAPPABLE = "a, button, [role='button'], label, summary, .tj-enter, .tj-cta";

export const TapRipple = () => {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let asked = false;
    const onFirst = () => { if (!asked) { asked = true; askMotion(); } };
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
      document.addEventListener("touchend", onFirst, { capture: true, passive: true });
    }
    return () => {
      document.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("click", onFirst, { capture: true });
      document.removeEventListener("touchend", onFirst, { capture: true });
    };
  }, []);
  return null;
};

export default TapRipple;

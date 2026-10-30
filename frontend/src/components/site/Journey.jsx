import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { mountJourney } from "@/components/site/journeyEngine";
import { SoundButton } from "@/components/site/SoundButton";
import "@/components/site/journeyEngine.css";

// Home (start="hero") and About (start="world"): TREV's journey, an imperative engine mounted once.
// The speaker is the site-wide one, fixed over the journey header's slot, so the song carries on
// across pages.
export const Journey = ({ start = "hero" }) => {
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => mountJourney(ref.current, { start, navigate }), [start, navigate]);
  return (
    <>
      <div ref={ref} data-testid={start === "hero" ? "home-page" : "about-page"} />
      <SoundButton className="tj-soundFixed" />
    </>
  );
};

export default Journey;

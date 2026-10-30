import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { mountJourney } from "@/components/site/journeyEngine";
import "@/components/site/journeyEngine.css";

// The hero -> transition -> painted world -> story journey (see journeyEngine.js). Home starts at the hero;
// About starts straight in the world.
export const Journey = ({ start = "hero" }) => {
  const ref = useRef(null);
  const navigate = useNavigate();
  useEffect(() => mountJourney(ref.current, { start, navigate }), [start, navigate]);
  return <div ref={ref} data-testid={start === "hero" ? "home-page" : "about-page"} />;
};

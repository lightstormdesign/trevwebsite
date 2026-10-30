import { useEffect, useState } from "react";
import { sound, requestMotion } from "@/utils/sound";

// The speaker, top left on every page: slashed until the song plays. Pressing it before anything
// has played starts "Kingdom" from 0.0 (and asks for motion access on iPhone); after that it pauses
// and resumes. When the journey's landing asks it to (sound.setBeckon), a muted speaker glows gold
// and rises a touch to invite a press.
export const SoundButton = ({ className = "" }) => {
  const [, force] = useState(0);
  useEffect(() => sound.subscribe(() => force((n) => n + 1)), []);
  const on = sound.playing;
  return (
    <button
      type="button"
      className={`tj-sound ${on ? "on" : ""} ${sound.beckoning ? "beckon" : ""} ${className}`}
      aria-label={on ? "Mute the song" : "Play the song"}
      aria-pressed={on}
      onClick={() => {
        sound.toggle();
        requestMotion();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        <path className="wave" d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path className="wave" d="M18.5 5.5a9 9 0 0 1 0 13" />
        <path className="slash" d="M3 3l18 18" />
      </svg>
    </button>
  );
};

export default SoundButton;

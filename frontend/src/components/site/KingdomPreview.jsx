import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { KINGDOM_PREVIEW, LAYLO_URL } from "@/data/site";

// "Kingdom" official video, preview cut: plays the first KINGDOM_PREVIEW.seconds, then stops on a gold
// "Get the full video" card that sends people to TREV's Laylo list (which unlocks the full video).
// If the preview file isn't there yet, the card shows straight away over the poster.
export const KingdomPreview = () => {
  const ref = useRef(null);
  const [state, setState] = useState("idle"); // idle | playing | ended | missing
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const limit = KINGDOM_PREVIEW.seconds;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      const t = v.currentTime;
      setProgress(Math.min(1, t / limit));
      if (t >= limit) {
        v.pause();
        setState("ended");
        return;
      }
      if (!v.paused) raf = requestAnimationFrame(tick);
    };
    const onPlay = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const onEnded = () => setState("ended");
    const onError = () => setState("missing");
    v.addEventListener("play", onPlay);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
    };
  }, [limit]);

  const play = () => {
    const v = ref.current;
    if (!v) return;
    if (state === "ended") v.currentTime = 0;
    v.muted = muted;
    v.play().then(() => setState("playing")).catch(() => {
      v.muted = true; // autoplay policy: fall back to muted rather than not playing at all
      setMuted(true);
      v.play().then(() => setState("playing")).catch(() => setState("missing"));
    });
  };
  const toggleMute = (e) => {
    e.stopPropagation();
    const v = ref.current;
    if (v) v.muted = !muted;
    setMuted(!muted);
  };

  const showCard = state === "ended" || state === "missing";
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black" data-testid="music-kingdom-preview">
      <video
        ref={ref}
        className="aspect-video w-full object-cover"
        src={KINGDOM_PREVIEW.src}
        poster={KINGDOM_PREVIEW.poster}
        playsInline
        preload="metadata"
        onClick={() => (state === "playing" ? (ref.current.pause(), setState("idle")) : play())}
      />
      {state === "idle" && (
        <button
          type="button"
          onClick={play}
          aria-label="Play the Kingdom preview"
          className="group absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/15"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(227,163,92,0.85)] bg-black/40 backdrop-blur-sm transition-colors group-hover:border-[var(--sm-gold-light)]">
            <Play size={24} className="ml-1 text-[var(--sm-gold-light)]" />
          </span>
        </button>
      )}
      {state === "playing" && (
        <>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur-sm hover:text-white"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
            <div className="h-full bg-gradient-to-r from-[var(--sm-gold-accent)] to-[var(--sm-gold-light)]" style={{ width: `${progress * 100}%` }} />
          </div>
        </>
      )}
      {showCard && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center backdrop-blur-[3px]" data-testid="music-kingdom-gate">
          <p className="font-display text-lg uppercase tracking-[0.18em] text-logo-gold sm:text-xl">Get the full video</p>
          <p className="font-accent max-w-xs text-base italic text-white/75">Join the list and the full Kingdom video is yours.</p>
          <a
            href={LAYLO_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="music-kingdom-laylo"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--sm-gold)] px-6 py-2.5 font-display text-[0.68rem] uppercase tracking-[0.28em] text-[var(--sm-gold-light)] transition-colors hover:bg-[rgba(227,163,92,0.1)] hover:text-white"
          >
            Get the full video <ArrowUpRight size={14} />
          </a>
          {state === "ended" && (
            <button type="button" onClick={play} className="mt-1 inline-flex items-center gap-1.5 font-body text-xs text-white/55 hover:text-white/85">
              <RotateCcw size={12} /> Replay preview
            </button>
          )}
        </div>
      )}
    </div>
  );
};

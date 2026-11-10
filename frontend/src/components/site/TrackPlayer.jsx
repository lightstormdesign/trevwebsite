import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";

// The EPK's small player: one slim row with the cover, the song's title and "1 / 3", a thin progress line
// you tap to jump, and back / play / forward. Moves on to the next song when one ends; back restarts the
// song if it's more than 3 s in, otherwise goes to the previous one; skipping while playing keeps playing.
// Songs only download when played (preload="metadata"), and each one's stored duration shows its length
// before then. His own files, not Spotify's embed (30-second previews to anyone logged out, no skip).
const time = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

export const TrackPlayer = ({ tracks, cover, className = "" }) => {
  const audioRef = useRef(null);
  const wantPlayRef = useRef(false);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(tracks[0]?.duration || 0);
  const track = tracks[i];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    const onTime = () => setT(a.currentTime);
    const onMeta = () => Number.isFinite(a.duration) && setDur(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      if (i < tracks.length - 1) {
        wantPlayRef.current = true;
        setI(i + 1);
      } else setPlaying(false);
    };
    const evs = [["timeupdate", onTime], ["loadedmetadata", onMeta], ["durationchange", onMeta], ["play", onPlay], ["pause", onPause], ["ended", onEnded]];
    evs.forEach(([e, f]) => a.addEventListener(e, f));
    return () => evs.forEach(([e, f]) => a.removeEventListener(e, f));
  }, [i, tracks.length]);

  // a new song: shown from its start, and playing if one was (or it was skipped to while playing)
  const first = useRef(true);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setT(0);
    setDur(track.duration || 0);
    if (first.current) { first.current = false; return; }
    a.load();
    if (wantPlayRef.current) a.play().catch(() => {});
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const go = (d) => {
    const a = audioRef.current;
    if (d < 0 && a && a.currentTime > 3) { a.currentTime = 0; return; }   // back: this song from the top
    wantPlayRef.current = !!a && !a.paused;
    if (tracks.length === 1) { if (a) a.currentTime = 0; return; }
    setI((i + d + tracks.length) % tracks.length);
  };
  const seek = (e) => {
    const a = audioRef.current;
    const d = a && Number.isFinite(a.duration) ? a.duration : dur;
    if (!a || !d) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.min(d, Math.max(0, ((e.clientX - r.left) / r.width) * d));
  };
  const p = dur ? Math.min(1, t / dur) : 0;
  const btn = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/65 transition-colors hover:text-[var(--sm-gold-light)]";

  return (
    <div
      data-testid="track-player"
      className={`flex items-center gap-3 rounded-2xl border border-[var(--sm-gold)]/25 bg-black/40 p-2.5 pr-3 text-left ${className}`}
    >
      <img src={cover} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span data-testid="track-title" className="font-display block truncate text-base leading-tight text-[var(--sm-text)]">{track.title}</span>
          <span data-testid="track-count" className="font-body shrink-0 text-[0.6rem] tabular-nums text-white/40">
            {i + 1} / {tracks.length}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(t)}
            tabIndex={0}
            onClick={seek}
            data-testid="track-seek"
            className="relative h-3.5 flex-1 cursor-pointer"
          >
            <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/15" />
            <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--sm-gold)]" style={{ width: `${(p * 100).toFixed(2)}%` }} />
          </div>
          <span className="font-body shrink-0 text-[0.6rem] tabular-nums text-white/40">{time(playing || t ? t : dur)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <button type="button" onClick={() => go(-1)} aria-label="Previous song" data-testid="track-prev" className={btn}>
          <SkipBack size={15} fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
          data-testid="track-play"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sm-gold)] text-black shadow-[0_0_16px_rgba(227,163,92,0.35)] transition-colors hover:bg-[var(--sm-gold-light)]"
        >
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next song" data-testid="track-next" className={btn}>
          <SkipForward size={15} fill="currentColor" />
        </button>
      </div>
      <audio ref={audioRef} src={track.src} preload="metadata" />
    </div>
  );
};

export default TrackPlayer;

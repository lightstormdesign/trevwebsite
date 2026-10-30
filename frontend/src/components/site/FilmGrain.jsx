// A fine film grain over the whole site (Soleil's): one small noise tile (trev-grain.webp: light and
// dark specks on transparent) repeated over the screen and jittered a few times a second. Plain
// see-through pixels, no blend mode: a blend mode over the whole screen made the phone re-blend every
// pixel of the page on every frame, which is what made Soleil's scroll world stutter.
// On the portal, TREV's face gets half the grain (a soft mask over the still frame; the tile jitters
// inside it).
export const FilmGrain = () => (
  <div aria-hidden className="film-grain-frame">
    <div className="film-grain" style={{ backgroundImage: "url(/trev-grain.webp)" }} />
  </div>
);

export default FilmGrain;

#!/usr/bin/env python3
"""Sedona layer pipeline: PNG masters -> web-ready WebP/AVIF + gold mask.

Masters live in assets/masters/ and are never modified. Outputs go to
assets/scene/. Re-run whenever a master changes:

    pip install pillow numpy scipy
    python3 tools/process_layers.py            # process + write outputs
    python3 tools/process_layers.py --report   # also write QA sheets to tools/qa/

Per layer:
  1. Alpha solidify  - AI cutouts sit at 94-99% alpha in solid areas; anything
                       >= SOLID_ALPHA becomes 255 so layers behind can't show through.
  2. Speck removal   - drops tiny stray opaque islands left by the cutout tool.
  3. Defringe        - edge pixels take the colour of the nearest solid pixel
                       (colour decontamination), and transparent pixels are
                       colour-bled too so scaling/WebGL never pulls in dark or
                       red fringes.
  4. Gap fill        - (mesas only) paints a forest band under the mesa layer's
                       bottom edge, down to the canvas bottom. It is hidden behind
                       the foreground at rest and only matters once parallax moves
                       the layers apart.
The foreground strip also gets a gold mask (picked out by colour) for the
glint / cursor / pulse effects.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTERS = os.path.join(ROOT, "assets", "masters")
OUT = os.path.join(ROOT, "assets", "scene")
QA = os.path.join(ROOT, "tools", "qa")

SOLID_ALPHA = 230          # ~90%
SPECK_MAX_PX = 24          # opaque islands smaller than this (at 941 px wide) are removed
SMALL_WIDTH = 720          # lighter variant for phones

# name, file, options
LAYERS = [
    ("01-sky", "01-sky.png", {"opaque": True}),
    ("02-clouds", "02-clouds.png", {}),
    ("03-mesas", "03-mesas.png", {"gap_fill": True}),
    ("04-foreground-path", "04-foreground-path.png", {}),
]
STRIP = ("strip-foreground", "strip-foreground.png")
SMALL_STRIP_WIDTH = 1280


def load(name):
    return np.array(Image.open(os.path.join(MASTERS, name)).convert("RGBA"))


def solidify(a):
    a = a.copy()
    al = a[..., 3]
    al[al >= SOLID_ALPHA] = 255
    return a


def remove_specks(a, max_px):
    a = a.copy()
    mask = a[..., 3] > 0
    lab, n = ndimage.label(mask)
    if n == 0:
        return a, 0
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    small = np.isin(lab, np.where(sizes < max_px)[0] + 1)
    a[small, 3] = 0
    return a, int(small.sum())


def defringe(a):
    """Colour-decontaminate edges and bleed colour into transparent pixels."""
    a = a.copy()
    solid = a[..., 3] == 255
    if not solid.any():
        return a
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    nearest = a[iy, ix, :3]
    edge = a[..., 3] < 255
    a[edge, :3] = nearest[edge]
    return a


def gap_fill_below(a, band=70, smooth=31):
    """Paint an opaque forest band under the layer, from just above its ragged
    bottom edge down to the canvas bottom."""
    h, w = a.shape[:2]
    solid = a[..., 3] > 128
    cols = solid.any(0)
    yb = np.where(cols, h - 1 - np.argmax(solid[::-1], 0), -1)
    # start the fill above the ragged tree line so gaps between trees are covered
    yb_s = ndimage.minimum_filter1d(np.where(cols, yb, h), smooth) - 25
    fill = np.zeros_like(a)
    # opaque band texture: the band above the bottom edge, flattened onto its median colour
    base = np.median(a[solid][:, :3], 0)
    for x in range(w):
        if not cols[x]:
            continue
        top = max(yb[x] - band, 0)
        src = a[top:yb[x] + 1, x].astype(float)
        al = src[:, 3:4] / 255
        src_rgb = src[:, :3] * al + base * (1 - al)
        # darken slightly with depth so nothing reads as a bright seam
        n = len(src_rgb)
        for y in range(max(yb_s[x], 0), h):
            k = y - yb_s[x]
            row = (k // n)
            idx = k % n
            if row % 2 == 1:                       # mirror every other tile: seamless
                idx = n - 1 - idx
            fill[y, x, :3] = src_rgb[idx] * 0.9
            fill[y, x, 3] = 255
    # layer over the fill
    out = fill.astype(float)
    fa = a[..., 3:4].astype(float) / 255
    out[..., :3] = a[..., :3] * fa + out[..., :3] * (1 - fa)
    out[..., 3] = np.maximum(a[..., 3], fill[..., 3])
    return out.round().astype(np.uint8)


def gold_mask(a):
    """Gold = warm hue, saturated, bright. Returns 0-255 greyscale."""
    rgb = a[..., :3].astype(float) / 255
    mx, mn = rgb.max(-1), rgb.min(-1)
    v, d = mx, mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r)
    gg = m & (mx == g) & ~rr
    hue[rr] = ((g - b)[rr] / d[rr]) % 6
    hue[gg] = (b - r)[gg] / d[gg] + 2
    hue *= 60
    w_h = np.clip(1 - np.abs(hue - 40) / 18, 0, 1)        # 22..58 deg
    w_s = np.clip((s - 0.35) / 0.3, 0, 1)
    w_v = np.clip((v - 0.62) / 0.25, 0, 1)
    mask = w_h * w_s * w_v * (a[..., 3] / 255)
    mask = ndimage.gaussian_filter(mask, 0.8)
    return (np.clip(mask * 1.3, 0, 1) * 255).astype(np.uint8)


def save(img, name, small_width=None):
    im = Image.fromarray(img)
    paths = []
    variants = [(name, im)]
    if small_width and im.width > small_width:
        h = round(im.height * small_width / im.width)
        variants.append((f"{name}-{small_width}", im.resize((small_width, h), Image.LANCZOS)))
    for vname, v in variants:
        p = os.path.join(OUT, vname + ".webp")
        if v.mode == "RGBA" and np.array(v)[..., 3].min() == 255:
            v = v.convert("RGB")
        v.save(p, "WEBP", quality=88, alpha_quality=100, method=6)
        paths.append(p)
        pa = os.path.join(OUT, vname + ".avif")
        v.save(pa, "AVIF", quality=70)
        paths.append(pa)
        MANIFEST.setdefault(name, {"w": im.width, "h": im.height, "variants": []})
        MANIFEST[name]["variants"].append({"file": vname, "w": v.width, "h": v.height})
    return paths


MANIFEST = {}


def stats(a):
    al = a[..., 3]
    return dict(transparent=round(100 * (al == 0).mean(), 1),
                solid=round(100 * (al == 255).mean(), 1),
                semi=round(100 * ((al > 0) & (al < 255)).mean(), 2))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)

    processed = {}
    sizes = set()
    for name, fname, opt in LAYERS:
        a = load(fname)
        sizes.add(a.shape[:2])
        before = stats(a)
        if opt.get("opaque"):
            a[..., 3] = 255
            specks = 0
        else:
            a = solidify(a)
            a, specks = remove_specks(a, SPECK_MAX_PX * (a.shape[1] / 941) ** 2)
            a = defringe(a)
            if opt.get("gap_fill"):
                a = gap_fill_below(a)
        processed[name] = a
        print(f"{name:22s} {a.shape[1]}x{a.shape[0]}  before {before}  after {stats(a)}  specks removed {specks}")
        save(a, name, SMALL_WIDTH)

    if len(sizes) != 1:
        print("WARNING: layers are not all on the same canvas size:", sizes)

    name, fname = STRIP
    s = load(fname)
    before = stats(s)
    s = solidify(s)
    s, specks = remove_specks(s, SPECK_MAX_PX * (s.shape[1] / 941) ** 2)
    s = defringe(s)
    print(f"{name:22s} {s.shape[1]}x{s.shape[0]}  before {before}  after {stats(s)}  specks removed {specks}")
    save(s, name, SMALL_STRIP_WIDTH)
    g = gold_mask(s)
    gm = Image.fromarray(g, "L")
    gm.save(os.path.join(OUT, "strip-gold-mask.webp"), "WEBP", quality=85, method=6)
    sw = SMALL_STRIP_WIDTH
    gm.resize((sw, round(gm.height * sw / gm.width)), Image.LANCZOS).save(
        os.path.join(OUT, f"strip-gold-mask-{sw}.webp"), "WEBP", quality=85, method=6)
    print(f"gold mask coverage {round(100 * (g > 64).mean(), 1)}% of strip")

    # Is the gap fill really hidden at rest? Compare composites with/without it.
    names = [n for n, _, _ in LAYERS]
    def comp(layers):
        out = Image.fromarray(layers[0]).convert("RGBA")
        for l in layers[1:]:
            out.alpha_composite(Image.fromarray(l))
        return np.array(out)[..., :3].astype(int)
    raw = [load(f) for _, f, _ in LAYERS]
    raw[0][..., 3] = 255
    mesa_raw = defringe(remove_specks(solidify(raw[2]), SPECK_MAX_PX)[0])
    a1 = comp([processed[names[0]], processed[names[1]], mesa_raw, processed[names[3]]])
    a2 = comp([processed[n] for n in names])
    changed = (np.abs(a1 - a2).max(-1) > 24)
    print(f"gap fill visible at rest: {changed.sum()} px ({round(100 * changed.mean(), 3)}%) "
          "- only where the foreground has see-through gaps")

    # Portal portrait: transparent cutout that sits over the realistic photo.
    pp = os.path.join(MASTERS, "00-portal-portrait.png")
    if os.path.exists(pp):
        a = defringe(remove_specks(solidify(load("00-portal-portrait.png")), SPECK_MAX_PX)[0])
        im = Image.fromarray(a)
        os.makedirs(os.path.join(ROOT, "assets", "portal"), exist_ok=True)
        im.save(os.path.join(ROOT, "assets", "portal", "portrait.webp"), "WEBP", quality=90, alpha_quality=100, method=6)
        im.save(os.path.join(ROOT, "assets", "portal", "portrait.avif"), "AVIF", quality=72)
        print(f"portal portrait        {im.width}x{im.height}  after {stats(a)}")

    # Portal placeholder until the realistic Sedona photo arrives: a muted, desaturated
    # version of the scene so the flow is testable. Replace with assets/portal/sedona-photo.webp.
    portal_dir = os.path.join(ROOT, "assets", "portal")
    os.makedirs(portal_dir, exist_ok=True)
    full = Image.fromarray(comp([processed[n] for n in names]).astype(np.uint8))
    from PIL import ImageEnhance, ImageFilter
    ph = ImageEnhance.Color(full).enhance(0.35)
    ph = ImageEnhance.Brightness(ph).enhance(0.8).filter(ImageFilter.GaussianBlur(1.2))
    ph.save(os.path.join(portal_dir, "portal-placeholder.webp"), "WEBP", quality=80, method=6)

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(MANIFEST, f, indent=1)

    if args.report:
        os.makedirs(QA, exist_ok=True)
        full = comp([processed[n] for n in names]).astype(np.uint8)
        Image.fromarray(full).save(os.path.join(QA, "stack-rest.png"))
        Image.fromarray(processed["03-mesas"]).save(os.path.join(QA, "mesas-with-gapfill.png"))
        gm.save(os.path.join(QA, "strip-gold-mask.png"))
        print("QA sheets written to", QA)


if __name__ == "__main__":
    main()

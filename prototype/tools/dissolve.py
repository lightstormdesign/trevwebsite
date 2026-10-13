"""Render TREV's dissolve-into-light over the AI transition clip.

Frame 0 is the real last frame of the hero clip, untouched (so the swap is invisible). Over ~2 s TREV
brightens and warms into light, softens, and is drawn slightly toward the sun; a bloom of his own light
swells into the sunshine and fades out by ~2.6 s. The background hands over to the AI clip in 0.35 s.

Usage: python3 tools/dissolve.py <ai_clip.mp4> <real_last.png> <mask.png> <out.mp4>
Requires ffmpeg. Works at the AI clip's size and frame rate.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

AI, REAL, MASK, OUT = sys.argv[1:5]

# where the light gathers: the sun's position as it rises in the AI clip (fraction of frame)
ANCHOR = (0.485, 0.34)
PERSON_END = 2.0   # TREV fully gone by here
BLOOM_END = 2.6    # his light has faded into the sunshine by here
BG_END = 0.35      # background hand-off


def ss(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def bell(t, up, peak, down):
    if t <= up or t >= down:
        return 0.0
    return ss((t - up) / (peak - up)) if t < peak else 1 - ss((t - peak) / (down - peak))


def run(args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


probe = json.loads(subprocess.run(
    ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=width,height,r_frame_rate", "-of", "json", AI], capture_output=True, check=True).stdout)["streams"][0]
W, H = probe["width"], probe["height"]
num, den = map(int, probe["r_frame_rate"].split("/"))
FPS = num / den

tmp = tempfile.mkdtemp(prefix="dissolve_")
try:
    src, out = os.path.join(tmp, "src"), os.path.join(tmp, "out")
    os.makedirs(src)
    os.makedirs(out)
    run(["-i", AI, "-vf", "scale=in_color_matrix=bt709:out_range=pc,format=rgb24", os.path.join(src, "%04d.png")])
    frames = sorted(os.listdir(src))

    # prepared stills: real frame, outline mask, a soft wide mask for the bloom, a warm sun-glow
    real = os.path.join(tmp, "real.png")
    run(["-i", REAL, "-vf", f"scale={W}:{H},format=rgb24", real])
    mask = os.path.join(tmp, "mask.png")
    run(["-i", MASK, "-vf", f"scale={W}:{H},format=gray", mask])
    ax, ay = ANCHOR[0] * W, ANCHOR[1] * H
    glow = os.path.join(tmp, "glow.png")
    r = 0.30 * W
    run(["-f", "lavfi", "-i", f"color=black:s={W}x{H}:d=1", "-vf",
         f"format=rgb24,geq=r='255*exp(-((X-{ax})^2+(Y-{ay})^2)/(2*{r/2.2}^2))':"
         f"g='214*exp(-((X-{ax})^2+(Y-{ay})^2)/(2*{r/2.2}^2))':"
         f"b='150*exp(-((X-{ax})^2+(Y-{ay})^2)/(2*{r/2.2}^2))'", "-frames:v", "1", glow])

    last_fx = int(BLOOM_END * FPS) + 1
    for i, name in enumerate(frames):
        t = i / FPS
        dst = os.path.join(out, name)
        if i > last_fx:
            shutil.copy(os.path.join(src, name), dst)
            continue
        if i == 0:  # the swap frame: exactly the real last frame
            shutil.copy(real, dst)
            continue
        a_bg = 1 - ss(t / BG_END)
        a_p = 1 - ss((t - 0.12) / (PERSON_END - 0.12))
        lift = 0.22 * ss(t / 1.3)                         # exposure into light
        warm = 0.16 * ss(t / 1.3)                         # toward gold
        blur = 16 * ss(t / 1.7)
        scale = 1 - 0.05 * ss(t / PERSON_END)              # drawn toward the sun
        bloom = 0.85 * bell(t, 0.0, 0.85, BLOOM_END)       # his own light, spreading
        sun = 0.55 * bell(t, 0.15, 1.1, BLOOM_END)         # swelling into the sunshine
        soft = 0.35 * H
        cut = (H + soft) - ss((t - 0.15) / (PERSON_END - 0.15)) * ((H + soft) - (ay - 0.08 * H))
        sw, sh = max(2, round(W * scale / 2) * 2), max(2, round(H * scale / 2) * 2)
        ox, oy = ax * (1 - scale), ay * (1 - scale)
        blur_f = f",gblur=sigma={blur:.2f}" if blur > 0.05 else ""
        blur_a = f",gblur=sigma={blur * 1.6:.2f}" if blur > 0.05 else ""   # edges soften into light too

        fc = (
            f"[1:v]format=gbrp,eq=brightness={lift:.4f}:saturation={1 + warm * 3:.4f}:gamma={1 + lift * 0.6:.4f},"
            f"colorbalance=rm={warm:.4f}:gm={warm * 0.35:.4f}:bm={-warm:.4f}:rh={warm:.4f}:gh={warm * 0.4:.4f}:bh={-warm * 1.2:.4f}{blur_f},format=rgb24[pc];"
            f"[2:v]format=gray,geq=lum='p(X\\,Y)*{a_p:.5f}*clip(({cut:.1f}-Y)/{soft:.1f}\\,0\\,1)'{blur_a}[pa];"
            f"[pc][pa]alphamerge,scale={sw}:{sh}[person];"
            f"[1:v]format=rgb24[bgc];[2:v]format=gray,lut=y='{255 * a_bg:.3f}'[bga];[bgc][bga]alphamerge[bgl];"
            f"[0:v]format=rgb24[ai];"
            f"[ai][bgl]overlay=0:0:format=rgb[b1];"
            f"[b1][person]overlay={ox:.2f}:{oy:.2f}:format=rgb[b2];"
            # bloom: the person's light, blurred wide and added as light
            f"color=black:s={W}x{H}:d=1,format=rgba[blk];[1:v]format=gbrp,eq=brightness={0.25 + lift:.4f}:saturation=1.3,format=rgb24[pb];"
            f"[2:v]format=gray,geq=lum='p(X\\,Y)*{bloom:.5f}*clip(({cut + 0.15 * H:.1f}-Y)/{soft:.1f}\\,0\\,1)'[pba];[pb][pba]alphamerge,scale={sw}:{sh}[pbl];"
            f"[blk][pbl]overlay={ox:.2f}:{oy:.2f}:format=rgb,gblur=sigma=42,format=gbrp,colorchannelmixer=gg=0.84:bb=0.52[bl];"
            f"[3:v]format=gbrp,colorchannelmixer=rr={sun:.4f}:gg={sun:.4f}:bb={sun:.4f}[sg];"
            f"[b2]format=gbrp[b3];[b3][bl]blend=all_mode=screen[b4];[b4][sg]blend=all_mode=screen,format=rgb24"
        )
        run(["-i", os.path.join(src, name), "-i", real, "-i", mask, "-i", glow,
             "-filter_complex", fc, "-frames:v", "1", "-update", "1", dst])

    run(["-framerate", f"{num}/{den}", "-i", os.path.join(out, "%04d.png"),
         "-vf", "scale=out_color_matrix=bt709:in_range=pc:out_range=tv,format=yuv420p",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-tune", "film", "-g", str(round(FPS)),
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", "-an", OUT])
finally:
    shutil.rmtree(tmp, ignore_errors=True)
print("wrote", OUT)

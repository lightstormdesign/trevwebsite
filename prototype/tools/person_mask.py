"""Tight matte of TREV in the last hero frame, from |original - Canva erase|.

Threshold the difference, close small gaps, fill interior holes (dark beard vs dark land barely differs),
then feather lightly. Writes an 8-bit gray PNG at the requested size.

Usage: python3 tools/person_mask.py <original.png> <erased.png> <out.png> [width height]
"""
import subprocess
import sys
from collections import deque

orig, erased, out = sys.argv[1:4]
W, H = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1920, 1080)


def ff(args, capture=False):
    return subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, capture_output=capture).stdout


# 1) thresholded difference, lightly smoothed, then a small closing to join hair strands to the body
R = 4
close = ",".join(["dilation"] * R + ["erosion"] * R)
raw = ff(["-i", orig, "-i", erased, "-filter_complex",
          f"[0]scale={W}:{H}:flags=area,format=gbrp[a];[1]scale={W}:{H}:flags=area,format=gbrp[b];"
          f"[a][b]blend=all_mode=difference,format=gray,gblur=sigma=1.2,lut=y='if(gt(val,7),255,0)',{close}",
          "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture=True)
m = bytearray(raw)

# 2) fill holes: flood the background in from the frame edges; anything unreached is inside him
seen = bytearray(W * H)
q = deque()
for x in range(W):
    for y in (0, H - 1):
        i = y * W + x
        if not m[i] and not seen[i]:
            seen[i] = 1
            q.append(i)
for y in range(H):
    for x in (0, W - 1):
        i = y * W + x
        if not m[i] and not seen[i]:
            seen[i] = 1
            q.append(i)
while q:
    i = q.popleft()
    x = i % W
    for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
        if 0 <= j < W * H and not m[j] and not seen[j]:
            seen[j] = 1
            q.append(j)
for i in range(W * H):
    if not seen[i]:
        m[i] = 255

# 3) keep only the largest blob (drops stray specks like the removed town lights), then feather
lab = [0] * (W * H)
best, best_n, cur = 0, 0, 0
for s in range(W * H):
    if m[s] and not lab[s]:
        cur += 1
        n = 0
        q = deque([s])
        lab[s] = cur
        while q:
            i = q.popleft()
            n += 1
            x = i % W
            for j in (i - 1 if x else -1, i + 1 if x < W - 1 else -1, i - W, i + W):
                if 0 <= j < W * H and m[j] and not lab[j]:
                    lab[j] = cur
                    q.append(j)
        if n > best_n:
            best, best_n = cur, n
m = bytes(255 if lab[i] == best else 0 for i in range(W * H))
p = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-i", "-",
                    "-vf", "gblur=sigma=1.5", "-frames:v", "1", out], input=m, check=True)
print("wrote", out, f"(person = {100 * best_n / (W * H):.1f}% of frame)")

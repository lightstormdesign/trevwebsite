"""Fill the TREV logo's hollow sun half-disc with white light (white core, warm gold rim),
under the logo so the rays still overlap it. Usage: python3 logo_sun_fill.py <in.png> <out.png>"""
import math
import subprocess
import sys

src, dst = sys.argv[1:3]
W, H = 788, 484
CX, CY, R = 399.5, 203.0, 27.5  # sun disc centre on the horizon line, radius (cropped-logo px)
raw = bytearray(subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
                               capture_output=True, check=True).stdout)
for y in range(int(CY - R - 2), int(CY + 3)):
    for x in range(int(CX - R - 2), int(CX + R + 3)):
        d = math.hypot(x - CX, y - CY)
        a_disc = max(0.0, min(1.0, (R - d) / 1.6)) * max(0.0, min(1.0, (CY + 2 - y) / 1.5))
        if a_disc <= 0:
            continue
        t = min(1.0, d / R)
        dr, dg, db = 255, 255 - 28 * t, 255 - 90 * t  # white core -> warm gold rim
        i = (y * W + x) * 4
        r, g, b, a = raw[i:i + 4]
        fa = a / 255.0  # logo over disc
        oa = fa + a_disc * (1 - fa)
        if oa <= 0:
            continue
        mix = lambda c_logo, c_disc: round((c_logo * fa + c_disc * a_disc * (1 - fa)) / oa)
        raw[i:i + 4] = bytes([mix(r, dr), mix(g, dg), mix(b, db), round(oa * 255)])
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-i", "-",
                "-frames:v", "1", dst], input=bytes(raw), check=True)
print("wrote", dst)

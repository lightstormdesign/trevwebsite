"""Fill the TREV logo's hollow sun with pure white light, traced to the ray tips so it sits exactly in the
window (drawn under the logo so the rays overlap it). Usage: python3 logo_sun_fill.py trev-logo-hollow.png out.png"""
import math, sys
from PIL import Image
src, dst = sys.argv[1:3]
im = Image.open(src).convert('RGBA'); px = im.load(); W, H = im.size
CX, CY = 399.5, 205.5  # bottom-centre of the hollow (horizon line bottom)
def tip(th):
    r = 0.0
    while r < 80:
        x = CX + r*math.cos(th); y = CY - r*math.sin(th)
        if y < 206 and px[int(x), int(y)][3] >= 110: return r
        r += 0.25
    return 80
angs = [math.radians(a/4) for a in range(0, 721)]
raw = [tip(a) for a in angs]
win = 36  # +-9 degrees
env = [min(raw[max(0,i-win):i+win+1]) for i in range(len(raw))]
print('env min/max', min(env), max(env))
def rfill(th):
    i = max(0, min(720, round(math.degrees(th)*4)))
    return env[i] + 2.2  # tuck under the ray tips
out = Image.new('RGBA', im.size, (0,0,0,0)); op = out.load()
for y in range(150, 207):
    for x in range(340, 460):
        # supersample 4x4 for an antialiased edge
        cov = 0
        for sy in range(4):
            for sx in range(4):
                fx = x + (sx+.5)/4; fy = y + (sy+.5)/4
                if fy > CY + 0.5: continue
                dx, dy = fx-CX, CY-fy
                th = math.atan2(max(dy,0), dx); d = math.hypot(dx, dy)
                if d <= rfill(th): cov += 1
        if cov: op[x, y] = (255,255,255, round(255*cov/16))
out.alpha_composite(im)  # logo over the white disc
out.save(dst)

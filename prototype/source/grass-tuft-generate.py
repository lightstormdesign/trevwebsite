# a small grass tuft in the world's palette: warm olive blades with golden tips, tapered and arcing
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math, random
random.seed(7)
W,H=360,260; SS=3; R=Image.new('RGBA',(W*SS,H*SS),(0,0,0,0)); d=ImageDraw.Draw(R)
def blade(x0, h, lean, width, dark):
    pts=[]; n=24
    for i in range(n+1):
        t=i/n; x=x0+lean*(t**1.8)*h; y=H-4-t*h
        w=width*(1-t)**0.9+0.6; pts.append((x,y,w,t))
    left=[(p[0]-p[2]/2,p[1]) for p in pts]; right=[(p[0]+p[2]/2,p[1]) for p in pts][::-1]
    poly=[(x*SS,y*SS) for x,y in left+right]
    # colour along the blade: dark olive base -> olive -> golden tip
    base=(52,62,22) if dark else (88,98,34); mid=(132,138,52); tip=(214,182,96)
    for i in range(n):
        t=i/n; c=tuple(int(base[k]+(mid[k]-base[k])*min(1,t*1.6)+(tip[k]-mid[k])*max(0,t-0.55)/0.45) for k in range(3))
        a=pts[i]; b=pts[i+1]
        seg=[((a[0]-a[2]/2)*SS,a[1]*SS),((b[0]-b[2]/2)*SS,b[1]*SS),((b[0]+b[2]/2)*SS,b[1]*SS),((a[0]+a[2]/2)*SS,a[1]*SS)]
        d.polygon(seg,fill=c+(255,))
for k in range(34):
    x0=W/2+random.gauss(0,34); h=random.uniform(80,215)*(1-abs(x0-W/2)/260); lean=(x0-W/2)/110+random.uniform(-.35,.35)
    blade(x0,h,lean,random.uniform(5,9),k<14)
im=R.resize((W,H),Image.LANCZOS)
# a soft contact shadow at its base
sh=Image.new('RGBA',(W,H),(40,26,12,0)); ImageDraw.Draw(sh).ellipse((W/2-95,H-22,W/2+95,H+6),fill=(40,26,12,120)); sh=sh.filter(ImageFilter.GaussianBlur(7))
out=Image.alpha_composite(sh,im); out.save('trev-world-grass.webp','WEBP',quality=90,method=6)
import os; print('grass', out.size, os.path.getsize('trev-world-grass.webp'))

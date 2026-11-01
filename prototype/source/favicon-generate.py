# TREV favicon: the gold sword on white, and two of the portal's open Flowers of Life (19 circles, no
# ring around them, fading at their edges): one off the top right, a small one behind the hilt
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math
S='/tmp/claude-0/-home-user-trevwebsite/d4d2ff2f-54ac-56c6-86b9-cd5baa7a52c6/scratchpad/'
def trim(im):
    a=np.asarray(im.getchannel('A')); ys,xs=np.where(a>20); return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
Sw=trim(Image.open('journey/trev-sword.webp').convert('RGBA'))
DARK_GOLD=(156,104,14)   # a rich dark gold (paler golds read as beige on white)
def portal_flower(c, cx, cy, r, alpha, width, R):
    pts=[(0,0)]+[(math.cos(k*math.pi/3),math.sin(k*math.pi/3)) for k in range(6)]+[(2*math.cos(k*math.pi/3),2*math.sin(k*math.pi/3)) for k in range(6)]+[(math.sqrt(3)*math.cos(math.pi/6+k*math.pi/3),math.sqrt(3)*math.sin(math.pi/6+k*math.pi/3)) for k in range(6)]
    def lines(wd, a):
        L=Image.new('RGBA',(R,R),DARK_GOLD+(0,)); d=ImageDraw.Draw(L)
        for px,py in pts: d.ellipse((cx+px*r-r,cy+py*r-r,cx+px*r+r,cy+py*r+r),outline=DARK_GOLD+(a,),width=wd)
        return L
    glow=lines(max(2,width*4), int(alpha*.9)).filter(ImageFilter.GaussianBlur(max(1,width*2)))   # the soft glow copy
    L=Image.alpha_composite(glow, lines(width, alpha))
    # fade toward its edges: solid to 45% of its radius, gone by 78% (the portal's mask)
    yy,xx=np.mgrid[0:R,0:R]; dist=np.hypot(xx-cx,yy-cy)/(3*r)
    m=np.clip((0.78-dist)/(0.78-0.45),0,1)
    L.putalpha(Image.fromarray((np.asarray(L.getchannel('A'))*m).astype(np.uint8)))
    c.alpha_composite(L)
def colored(R,s,x,y,color,alpha_img,blur):
    L=Image.new('RGBA',(R,R),color+(0,)); g=Image.new('RGBA',s.size,color+(0,)); g.putalpha(alpha_img)
    L.alpha_composite(g,(x,y)); return L.filter(ImageFilter.GaussianBlur(blur)) if blur else L
def icon(size, radius=0.22, pad=0.1):
    R=size*4; small=size<=32
    c=Image.new('RGBA',(R,R),(255,255,255,0)); ImageDraw.Draw(c).rounded_rectangle((0,0,R-1,R-1),radius=int(R*radius),fill=(255,255,255,255))
    w=max(2,int(R*(0.012 if small else 0.0055)))
    h=int(R*(1-2*pad)); s=Sw.resize((max(1,int(Sw.width*h/Sw.height)),h),Image.LANCZOS); x=(R-s.width)//2; y=(R-s.height)//2
    geo=Image.new('RGBA',(R,R),DARK_GOLD+(0,))
    # the top right only: the portal's Flower of Life (19 circles, a soft glow behind fine lines, fading
    # out toward its edges), where the portal has it (92% across, 8% down), 5% bigger than before
    k = 0.4 if small else 1.0   # barely there
    portal_flower(geo, R*0.92, R*0.08, R*0.126, int(12*k), w, R)
    # behind the sword: only its hilt and the first quarter of the blade (the bottom 48% of the sword)
    portal_flower(geo, R/2, y+0.76*h, 0.08*h, int(25*(0.6 if small else 1)), w, R)   # the same open geometry, behind the hilt
    mask=Image.new('L',(R,R),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,R-1,R-1),radius=int(R*radius),fill=255)
    geo.putalpha(Image.fromarray(np.minimum(np.asarray(geo.getchannel('A')),np.asarray(mask)))); c.alpha_composite(geo)
    if small:
        al=s.getchannel('A').filter(ImageFilter.MaxFilter(5)); s2=Image.new('RGBA',s.size,(0,0,0,0)); s2.paste(s.convert('RGB'),(0,0)); s2.putalpha(al); s=Image.alpha_composite(s2,s)
    A=s.getchannel('A')
    halo=colored(R,s,x,y,(255,255,255),A.filter(ImageFilter.MaxFilter(9)),R*0.02); c.alpha_composite(halo); c.alpha_composite(halo)   # lines never touch the sword
    c.alpha_composite(colored(R,s,x,y,(245,190,90),A.point(lambda v:int(v*.55)),R*0.03))   # a soft gold glow (no grey)
    c.alpha_composite(s,(x,y))
    return c.resize((size,size),Image.LANCZOS)
icon(32).save('favicon-32.png'); icon(512).save('favicon-512.png'); icon(180,radius=0).convert('RGB').save('apple-touch-icon.png'); icon(16).save(S+'f16g.png')
prev=Image.new('RGB',(600,300),(225,225,228)); x=10
for f,sz in [(S+'f16g.png',16),('favicon-32.png',32)]:
    big=Image.open(f).convert('RGBA').resize((sz*4,sz*4),Image.NEAREST); t=Image.new('RGB',big.size,(255,255,255)); t.paste(big,(0,0),big); prev.paste(t,(x,10)); x+=big.width+15
prev.paste(Image.open('favicon-512.png').convert('RGB').resize((280,280)),(x,10)); prev.save(S+'fav-geo2.png')
# grey check: any visible pixel near the sword that's grey (low saturation, not white)
im=np.asarray(Image.open('favicon-512.png').convert('RGB')).astype(int); mx=im.max(2); mn=im.min(2)
grey=((mx-mn)<14)&(mx<235); print('grey pixels in the 512 icon:', int(grey.sum()))

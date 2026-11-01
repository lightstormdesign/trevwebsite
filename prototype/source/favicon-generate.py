from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math
S='/tmp/claude-0/-home-user-trevwebsite/d4d2ff2f-54ac-56c6-86b9-cd5baa7a52c6/scratchpad/'
def trim(im):
    a=np.asarray(im.getchannel('A')); ys,xs=np.where(a>20); return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
Sw=trim(Image.open('journey/trev-sword.webp').convert('RGBA'))
def flower(R, r, alpha, width):
    L=Image.new('RGBA',(R,R),(206,160,72,0)); d=ImageDraw.Draw(L); cx=cy=R/2
    pts=[(0,0)]+[(math.cos(k*math.pi/3),math.sin(k*math.pi/3)) for k in range(6)]+[(2*math.cos(k*math.pi/3),2*math.sin(k*math.pi/3)) for k in range(6)]+[(math.sqrt(3)*math.cos(math.pi/6+k*math.pi/3),math.sqrt(3)*math.sin(math.pi/6+k*math.pi/3)) for k in range(6)]
    col=(206,160,72,alpha)
    for px,py in pts: d.ellipse((cx+px*r-r,cy+py*r-r,cx+px*r+r,cy+py*r+r),outline=col,width=width)
    d.ellipse((cx-3*r,cy-3*r,cx+3*r,cy+3*r),outline=col,width=width)
    return L
def colored(s,R,x,y,color,alpha_img,blur):
    L=Image.new('RGBA',(R,R),color+(0,)); g=Image.new('RGBA',s.size,color+(0,)); g.putalpha(alpha_img)
    L.alpha_composite(g,(x,y)); return L.filter(ImageFilter.GaussianBlur(blur)) if blur else L
def icon(size, radius=0.22, pad=0.1):
    R=size*4; small=size<=32
    c=Image.new('RGBA',(R,R),(255,255,255,0)); d=ImageDraw.Draw(c)
    d.rounded_rectangle((0,0,R-1,R-1),radius=int(R*radius),fill=(255,255,255,255))
    a = 34 if size<=16 else 46 if small else 70
    w = max(2, int(R*(0.012 if small else 0.006)))
    fl=flower(R, R*0.152, a, w)
    mask=Image.new('L',(R,R),0); ImageDraw.Draw(mask).rounded_rectangle((0,0,R-1,R-1),radius=int(R*radius),fill=255)
    fl.putalpha(Image.fromarray(np.minimum(np.asarray(fl.getchannel('A')),np.asarray(mask)))); c.alpha_composite(fl)
    h=int(R*(1-2*pad)); s=Sw.resize((max(1,int(Sw.width*h/Sw.height)),h),Image.LANCZOS); x=(R-s.width)//2; y=(R-s.height)//2
    if small:
        al=s.getchannel('A').filter(ImageFilter.MaxFilter(5)); s2=Image.new('RGBA',s.size,(0,0,0,0)); s2.paste(s.convert('RGB'),(0,0)); s2.putalpha(al); s=Image.alpha_composite(s2,s)
    A=s.getchannel('A')
    halo=colored(s,R,x,y,(255,255,255),A.filter(ImageFilter.MaxFilter(9)),R*0.02); c.alpha_composite(halo); c.alpha_composite(halo)
    if small: c.alpha_composite(colored(s,R,x,y,(120,80,20),A.point(lambda v:int(v*.55)),R*0.025))
    else: c.alpha_composite(colored(s,R,x,y,(245,190,90),A.point(lambda v:int(v*.6)),R*0.03))
    c.alpha_composite(s,(x,y))
    return c.resize((size,size),Image.LANCZOS)
icon(32).save('favicon-32.png'); icon(512).save('favicon-512.png'); icon(180,radius=0).convert('RGB').save('apple-touch-icon.png'); icon(16).save(S+'f16g.png')
prev=Image.new('RGB',(560,270),(225,225,228)); x=10
for f,sz in [(S+'f16g.png',16),('favicon-32.png',32)]:
    big=Image.open(f).convert('RGBA').resize((sz*4,sz*4),Image.NEAREST); t=Image.new('RGB',big.size,(255,255,255)); t.paste(big,(0,0),big); prev.paste(t,(x,10)); x+=big.width+15
prev.paste(Image.open('apple-touch-icon.png').resize((250,250)),(x,10)); prev.save(S+'fav-geo.png')

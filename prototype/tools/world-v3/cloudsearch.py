import numpy as np, cv2, json
from PIL import Image
SP='/tmp/claude-0/-home-user-trevwebsite/d4d2ff2f-54ac-56c6-86b9-cd5baa7a52c6/scratchpad/world3/'
S=0.25; W,H=int(941*S),int(1672*S)
def alpha(name):
    a=np.asarray(Image.open(SP+name).convert('RGBA'))[...,3].astype(np.float32)/255; return a
CL={k:alpha(f'burnell-world-cloud-{k}.webp') for k in ['small','medium','large']}
mt=alpha('w3-mountains.webp')  # 941x1672 canvas, placed at y=5+300 at landing
fa=alpha('w3-falls.webp')       # placed at y=160+760
def place(a,x,y,w):
    h=a.shape[0]*w/a.shape[1]
    out=np.zeros((H,W),np.float32)
    r=cv2.resize(a,(max(1,int(w*S)),max(1,int(h*S))),interpolation=cv2.INTER_AREA)
    x0,y0=int(round(x*S)),int(round(y*S))
    xs,ys=max(0,x0),max(0,y0); xe,ye=min(W,x0+r.shape[1]),min(H,y0+r.shape[0])
    if xe>xs and ye>ys: out[ys:ye,xs:xe]=r[ys-y0:ye-y0,xs-x0:xe-x0]
    return out
mtA=place(mt,0,305,941); faA=place(fa,0,920,941)
land=np.maximum(mtA,faA)>0.5
# sky region: above the first land pixel per column
first=np.array([np.argmax(land[:,x]) if land[:,x].any() else H for x in range(W)])
sky=np.arange(H)[:,None]<first[None,:]
# tallest rock: mountains alpha in the central castle region above y=900
cast=(mtA>0.5); cast[int(900*S):]=False; cast[:, :int(380*S)]=False; cast[:, int(650*S):]=False
SUN=(471*S,306*S)
fixed=[dict(src='large',after='sky',depth=0.5,w=660,x0=720,y0=440,dir=1,op=0.97,flip=True)]
def render(cs):
    behind=np.zeros((H,W),np.float32); front=np.zeros((H,W),np.float32)
    for c in cs:
        a=CL[c['src']]; w=c['w']; h=a.shape[0]*w/a.shape[1]
        A=place(a[:, ::-1] if c.get('flip') else a, c['x0']-w/2, c['y0']-w*0.22, w)*c['op']
        if c['after']=='sky': behind=1-(1-behind)*(1-A)
        else: front=1-(1-front)*(1-A)
    vis=1-(1-front)*(1-behind*(~land))
    return vis,front
def score(cs):
    vis,front=render(cs)
    cov=(vis[sky]>0.5).mean()
    castcov=(front[cast]>0.5).mean()
    sunc=vis[int(SUN[1])-6:int(SUN[1])+6,int(SUN[0])-6:int(SUN[0])+6].mean()
    return abs(cov-0.40)*4+max(0,castcov-0.12)*6+max(0,sunc-0.15)*3, cov, castcov
rng=np.random.default_rng(11)
best=None
for it in range(4000):
    n=rng.integers(7,10); cs=list(fixed)
    for i in range(n):
        y0=float(rng.uniform(150,880))
        tier='mountains' if y0<620 else ('falls' if y0<780 else 'foreground')
        if y0<520 and rng.random()<0.5: tier='sky'
        w=float(rng.uniform(180,360) if tier in('sky','mountains') else rng.uniform(320,620))
        x0=float(rng.choice([rng.uniform(-60,330),rng.uniform(610,1000)]) if tier!='sky' else rng.uniform(-60,1000))
        depth={'sky':0.25,'mountains':0.35,'falls':0.65,'foreground':1.0}[tier]
        cs.append(dict(src=str(rng.choice(['small','medium','large'])),after=tier,depth=depth,w=round(w),x0=round(x0),y0=round(y0),
                       dir=-1 if x0<471 else 1,op=round(float(rng.uniform(0.8,0.97)),2),flip=bool(rng.random()<0.5)))
    sc=score(cs)
    if best is None or sc[0]<best[0][0]: best=(sc,cs)
print(best[0]); json.dump(best[1],open('clouds_best.json','w'),indent=0)

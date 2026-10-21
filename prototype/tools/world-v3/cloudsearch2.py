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
mtA=place(mt,0,639,941); faA=place(fa,0,1254,941)
land=np.maximum(mtA,faA)>0.5
# sky region: above the first land pixel per column
first=np.array([np.argmax(land[:,x]) if land[:,x].any() else H for x in range(W)])
sky=np.arange(H)[:,None]<first[None,:]
# tallest rock: mountains alpha in the central castle region above y=900
cast=(mtA>0.5); cast[int(1250*S):]=False; cast[:, :int(380*S)]=False; cast[:, int(650*S):]=False
SUN=(471*S,306*S)
fixed=[dict(src='medium',after='sky',depth=0.25,w=1061,x0=182,y0=336,dir=-1,op=0.97,flip=False),
 dict(src='large',after='sky',depth=0.5,w=660,x0=720,y0=440,dir=1,op=0.97,flip=True),
 dict(src='medium',after='mountains',depth=0.35,w=226,x0=839,y0=198,dir=1,op=0.93,flip=True),
 dict(src='large',after='mountains',depth=0.35,w=285,x0=704,y0=249,dir=1,op=0.91,flip=True)]
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
    return abs(cov-0.60)*4+max(0,castcov-0.08)*6, cov, castcov
rng=np.random.default_rng(23)
best=None
for it in range(5000):
    n=rng.integers(8,13); cs=list(fixed)
    for i in range(n):
        y0=float(rng.uniform(470,900))
        tier=str(rng.choice(['mountains','falls','foreground'],p=[0.4,0.35,0.25]))
        w=float(rng.uniform(300,640))
        x0=float(rng.uniform(-80,1020))
        depth={'mountains':0.35,'falls':0.65,'foreground':1.0}[tier]
        cs.append(dict(src=str(rng.choice(['small','medium','large'])),after=tier,depth=depth,w=round(w),x0=round(x0),y0=round(y0),
                       dir=-1 if x0<471 else 1,op=round(float(rng.uniform(0.82,0.97)),2),flip=bool(rng.random()<0.5)))
    sc=score(cs)
    if best is None or sc[0]<best[0][0]: best=(sc,cs)
print(best[0]); json.dump(best[1],open('clouds_best2.json','w'),indent=0)

import numpy as np, cv2, json, os
from scipy import ndimage
D='/home/user/trevwebsite/prototype/source/world-v2/layers/raw/'
OUT='/home/user/trevwebsite/prototype/source/world-v2/layers/'
T=json.load(open('/tmp/claude-0/s/reg/all.json'))
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png'); H,W=M.shape[:2]
Mf=M.astype(np.float32)
own=np.load('/tmp/claude-0/s/owner.npy')
order=['sky','cliffs','groves','pool','bison','stream','aspens','juniper','fgleft','fgright']
src={'sky':['01-sky'],'cliffs':['02-spires','03-canyon-walls'],'groves':['04-canyon-floor'],'pool':['05-pool'],'bison':[],
     'stream':['10-stream','07-boulders'],'aspens':['08-aspens'],'juniper':['09-juniper'],'fgleft':['11-fg-left'],'fgright':['12-fg-right']}
MARGIN={'sky':10**6,'cliffs':120,'groves':110,'pool':90,'bison':0,'stream':80,'aspens':60,'juniper':60,'fgleft':40,'fgright':40}
def warp(n):
    L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
    if L.shape[2]==3: L=cv2.cvtColor(L,cv2.COLOR_BGR2BGRA)
    return cv2.warpAffine(L,np.float32(T[n]['A']),(W,H),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0))
def fit_ct(X,Y):
    X=X.astype(np.float64);Y=Y.astype(np.float64)
    if len(X)>150000: i=np.random.default_rng(0).choice(len(X),150000,replace=False); X=X[i];Y=Y[i]
    Xa=np.hstack([X,np.ones((len(X),1))]); C=np.linalg.lstsq(Xa,Y,rcond=None)[0]
    for _ in range(3):
        r=np.linalg.norm(Xa@C-Y,axis=1); k=r<np.percentile(r,60); C=np.linalg.lstsq(Xa[k],Y[k],rcond=None)[0]
    return C
def ct(img,C):
    s=img.reshape(-1,3).astype(np.float64); return np.clip(np.hstack([s,np.ones((len(s),1))])@C,0,255).reshape(img.shape).astype(np.float32)
# match via mean/std in Lab of the AI layer region vs owned master region (more stable than per-pixel fit when geometry differs)
def stat_ct(aiRGB,aiMask,ref,refMask):
    a=cv2.cvtColor(aiRGB.astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32); r=cv2.cvtColor(ref.astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32)
    o=a.copy()
    for c in range(3):
        am,asd=a[...,c][aiMask].mean(),a[...,c][aiMask].std()+1e-3; rm,rsd=r[...,c][refMask].mean(),r[...,c][refMask].std()
        o[...,c]=(a[...,c]-am)*(rsd/asd)+rm
    return cv2.cvtColor(np.clip(o,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR).astype(np.float32)
def mirror_fill(rgb,known,hole):
    # fill hole pixels by reflecting known pixels through the nearest known boundary point (keeps real texture)
    dist,(iy,ix)=ndimage.distance_transform_edt(~known,return_indices=True)
    yy,xx=np.nonzero(hole)
    by,bx=iy[yy,xx],ix[yy,xx]
    ry,rx=2*by-yy,2*bx-xx
    ok=(ry>=0)&(ry<H)&(rx>=0)&(rx<W)
    ry=np.clip(ry,0,H-1);rx=np.clip(rx,0,W-1)
    ok&=known[ry,rx]
    out=rgb.copy()
    out[yy[ok],xx[ok]]=rgb[ry[ok],rx[ok]]
    out[yy[~ok],xx[~ok]]=rgb[by[~ok],bx[~ok]]
    # soften the seam a touch
    sm=cv2.GaussianBlur(out,(0,0),1.0)
    band=hole&(dist<3)
    out[band]=sm[band]
    return out
os.makedirs(OUT,exist_ok=True)
report={}
for i,k in enumerate(order):
    li=i+1
    O=own==li
    front=np.zeros_like(O)
    for j in range(li+1,len(order)+1): front|=own==j
    if k=='sky':
        region=np.ones_like(O)
    else:
        if MARGIN[k]:
            # extend only downward (what a nearer layer rising from below uncovers), plus a thin side band
            m=MARGIN[k]*3 if k=='cliffs' else MARGIN[k]
            kern=np.zeros((2*m+1,1),np.uint8); kern[:m+1]=1   # anchor at center, ones above -> grows downward
            down=cv2.dilate(O.astype(np.uint8),kern)>0
            side=cv2.dilate(O.astype(np.uint8),np.ones((1,9)))>0
            reach=down|side
            if k=='cliffs': reach&=(np.arange(H)[:,None]>220)  # sides only below the peaks
        else: reach=O
        region=O|(reach&front)
    # base: master pixels for owned (+3px)
    rgb=np.zeros((H,W,3),np.float32); have=np.zeros((H,W),bool)
    own3=cv2.dilate(O.astype(np.uint8),np.ones((5,5)))>0
    rgb[own3]=Mf[own3]; have|=(O if k=='sky' else own3)
    # fill hidden from AI layers
    if k=='sky':
        O_s=cv2.erode(O.astype(np.uint8),np.ones((7,7)))>0
        L=cv2.imread(D+'01-sky.png'); 
        fill=cv2.warpAffine(L,np.float32([[1,0,15],[0,1,-272]]),(W,H),borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        fill=stat_ct(fill,np.ones((H,W),bool),Mf,O_s)
        near=Mf.copy(); hv=O_s.copy(); hole=~O_s
        near=mirror_fill(near,hv,hole)  # one pass: real texture right next to the sky edge
        dist=ndimage.distance_transform_edt(~O_s)
        wgt=np.clip((dist-4)/36,0,1)[...,None]
        rgb=np.where(O_s[...,None],Mf,near*(1-wgt)+fill*wgt)
        have=np.ones((H,W),bool)
    # inpaint the rest of region
    hole=(region&~have)
    if hole.any():
        # repeat: mirror fill reaches 2x the known band per pass
        for _ in range(6):
            if not hole.any(): break
            rgb=mirror_fill(rgb,have,hole); 
            have=have|hole; hole=region&~have
    keep=own3 if k!='sky' else (cv2.erode(O.astype(np.uint8),np.ones((7,7)))>0)
    rgb[keep]=Mf[keep]
    # alpha: owned region feathered at its outer edge; hidden extension fully opaque (it's behind front layers at rest)
    if k=='sky': alpha=np.full((H,W),255,np.uint8)
    else:
        solid=region.astype(np.uint8)*255
        alpha=cv2.GaussianBlur(solid,(5,5),1.2)
        alpha[cv2.erode(region.astype(np.uint8),np.ones((5,5)))>0]=255
    rgba=np.dstack([np.clip(rgb,0,255).astype(np.uint8),alpha])
    rgba[alpha==0,:3]=0
    cv2.imwrite(OUT+f'trev-world-{i+1:02d}-{k}.png',rgba)
    report[k]=dict(owned=int(O.sum()),region=int(region.sum()),inpainted=int(hole.sum()))
    print(k,report[k],flush=True)
json.dump(order,open('/tmp/claude-0/s/order.json','w'))

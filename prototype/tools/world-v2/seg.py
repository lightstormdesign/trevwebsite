import cv2, numpy as np, json
D='/home/user/trevwebsite/prototype/source/world-v2/layers/raw/'
T=json.load(open('/tmp/claude-0/s/reg/all.json'))
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png'); H,W=M.shape[:2]
ML=cv2.cvtColor(M,cv2.COLOR_BGR2LAB).astype(np.float32)
names=['01-sky','02-spires','03-canyon-walls','04-canyon-floor','05-pool','BISON','07-boulders','10-stream','08-aspens','09-juniper','11-fg-left','12-fg-right']
def warp(n):
    if n=='BISON':
        L=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/layers/trev-world-bison.png',cv2.IMREAD_UNCHANGED); return L
    L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
    if L.shape[2]==3: L=cv2.cvtColor(L,cv2.COLOR_BGR2BGRA)
    return cv2.warpAffine(L,np.float32(T[n]['A']),(W,H),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0))
def fit_ct(src,dst,m):
    X=src[m].reshape(-1,3).astype(np.float64); Y=dst[m].reshape(-1,3).astype(np.float64)
    if len(X)>200000: idx=np.random.default_rng(0).choice(len(X),200000,replace=False); X=X[idx];Y=Y[idx]
    Xa=np.hstack([X,np.ones((len(X),1))])
    # robust: 2 passes
    C=np.linalg.lstsq(Xa,Y,rcond=None)[0]
    for _ in range(2):
        r=np.linalg.norm(Xa@C-Y,axis=1); k=r<np.percentile(r,70)
        C=np.linalg.lstsq(Xa[k],Y[k],rcond=None)[0]
    return C
def apply_ct(img,C):
    s=img.reshape(-1,3).astype(np.float64); o=np.hstack([s,np.ones((len(s),1))])@C
    return np.clip(o,0,255).reshape(img.shape).astype(np.float32)
layers={}; cts={}
for n in names:
    w=warp(n); a=w[...,3]
    rgb=w[...,:3]
    if n!='BISON':
        core=cv2.erode((a>230).astype(np.uint8),np.ones((7,7)))>0
        C=fit_ct(rgb.astype(np.float32),M.astype(np.float32),core)
        # refit only on matching pixels
        ct=apply_ct(rgb,C)
        d=np.abs(cv2.blur(ct,(9,9))-cv2.blur(M.astype(np.float32),(9,9))).mean(-1)
        C=fit_ct(rgb.astype(np.float32),M.astype(np.float32),core&(d<25))
        ct=apply_ct(rgb,C); cts[n]=C.tolist()
    else:
        ct=rgb.astype(np.float32)
    ctL=cv2.cvtColor(np.clip(ct,0,255).astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32)
    d=np.linalg.norm(cv2.blur(ctL,(11,11))-cv2.blur(ML,(11,11)),axis=-1)
    layers[n]=dict(a=a,ct=ct,d=d)
    print(n,'cover',round((a>128).mean(),3),'match',round(((d<14)&(a>230)).sum()/max(1,(a>230).sum()),3),flush=True)
np.save('/tmp/claude-0/s/cts.npy',cts,allow_pickle=True)
# seeds, front to back
lab=np.zeros((H,W),np.int32)
for i,n in reversed(list(enumerate(names))):
    L=layers[n]
    if n=='BISON':
        s=cv2.erode((L['a']>200).astype(np.uint8),np.ones((5,5)))>0
    else:
        thr=18 if n=='01-sky' else 14
        s=cv2.erode((L['a']>230).astype(np.uint8),np.ones((9,9)))>0
        s&=L['d']<thr
        s=cv2.morphologyEx(s.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5)))>0
    lab[(lab==0)&s]=i+1
print('seeded',round((lab>0).mean(),3))
ws=cv2.watershed(cv2.GaussianBlur(M,(3,3),0),lab.copy())
# fill -1 boundaries with neighbor
b=ws==-1
ws2=ws.copy(); ws2[b]=0
dil=cv2.dilate(ws2.astype(np.float32),np.ones((3,3))).astype(np.int32)
ws[b]=dil[b]
np.save('/tmp/claude-0/s/labels.npy',ws); np.save('/tmp/claude-0/s/seeds.npy',lab)
pal=np.random.default_rng(3).integers(40,255,(20,3)).astype(np.uint8)
vis=(pal[ws]*0.6+M*0.4).astype(np.uint8)
vs=(pal[lab]*(lab[...,None]>0)*0.7+M*0.3).astype(np.uint8)
cv2.imwrite('/tmp/claude-0/s/labels.jpg',cv2.resize(np.concatenate([vs,vis],1),None,fx=0.45,fy=0.45))

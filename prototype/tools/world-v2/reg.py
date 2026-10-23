import cv2, numpy as np, json, sys
D='/home/user/trevwebsite/prototype/source/world-v2/layers/raw/'
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png')
H,W=M.shape[:2]
f=0.25
def prep(img):
    g=cv2.cvtColor(img,cv2.COLOR_BGR2LAB).astype(np.float32)
    return g
Ms=cv2.resize(M,None,fx=f,fy=f,interpolation=cv2.INTER_AREA)
pad=int(max(Ms.shape)*0.8)
Mp=cv2.copyMakeBorder(Ms,pad,pad,pad,pad,cv2.BORDER_CONSTANT,value=(0,0,0))
Mg=cv2.cvtColor(Mp,cv2.COLOR_BGR2GRAY)
Mg=cv2.Laplacian(cv2.GaussianBlur(Mg,(3,3),0),cv2.CV_32F)
res={}
for n in sys.argv[1:]:
    L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
    a=L[...,3]; ys,xs=np.where(a>128); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    T=L[y0:y1+1,x0:x1+1]
    best=None
    for s in np.arange(0.35,1.31,0.02):
        sc=s*f
        t=cv2.resize(T,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
        if t.shape[0]<8 or t.shape[1]<8 or t.shape[0]>=Mg.shape[0] or t.shape[1]>=Mg.shape[1]: continue
        tg=cv2.Laplacian(cv2.GaussianBlur(cv2.cvtColor(t[...,:3],cv2.COLOR_BGR2GRAY),(3,3),0),cv2.CV_32F)
        mk=(cv2.erode((t[...,3]>200).astype(np.uint8),np.ones((3,3)))).astype(np.float32)
        if mk.sum()<50: continue
        r=cv2.matchTemplate(Mg,tg,cv2.TM_CCORR_NORMED,mask=mk)
        r[~np.isfinite(r)]=-1
        _,mv,_,ml=cv2.minMaxLoc(r)
        if best is None or mv>best[0]: best=(mv,s,ml)
    mv,s,ml=best
    # transform: layer px (x,y) -> master: X = (x - x0)*s + (ml.x - pad)/f
    ox=(ml[0]-pad)/f - x0*s; oy=(ml[1]-pad)/f - y0*s
    res[n]=dict(score=float(mv),s=float(s),ox=float(ox),oy=float(oy),size=[L.shape[1],L.shape[0]])
    print(n,round(mv,3),round(s,3),round(ox,1),round(oy,1),flush=True)
json.dump(res,open('/tmp/claude-0/s/reg/coarse_%s.json'%sys.argv[1],'w'))

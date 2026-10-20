import cv2, numpy as np, json, sys
D='/home/user/trevwebsite/prototype/source/world-v2/layers/raw/'
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png')
sift=cv2.SIFT_create(nfeatures=40000,contrastThreshold=0.02)
kM,dM=sift.detectAndCompute(cv2.cvtColor(M,cv2.COLOR_BGR2GRAY),None)
PM=np.float32([k.pt for k in kM])
bf=cv2.BFMatcher()
n=sys.argv[1]; region=[float(v) for v in sys.argv[2].split(',')]  # x0,y0,x1,y1 in master where layer roughly lives
L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
mk=cv2.erode((L[...,3]>200).astype(np.uint8)*255,np.ones((9,9)))
kL,dL=sift.detectAndCompute(cv2.cvtColor(L[...,:3],cv2.COLOR_BGR2GRAY),mk)
inreg=(PM[:,0]>=region[0])&(PM[:,0]<=region[2])&(PM[:,1]>=region[1])&(PM[:,1]<=region[3])
idx=np.where(inreg)[0]
ms=bf.knnMatch(dL,dM[idx],k=3)
src=[];dst=[]
for mm in ms:
    for m in mm[:2]:
        src.append(kL[m.queryIdx].pt); dst.append(PM[idx[m.trainIdx]])
src=np.float32(src);dst=np.float32(dst)
rng=np.random.default_rng(0); best=(0,None)
N=len(src)
for it in range(60000):
    i,j=rng.choice(N,2,replace=False)
    dx=src[j]-src[i]; dd=dst[j]-dst[i]
    l1=np.hypot(*dx)
    if l1<20: continue
    s=np.hypot(*dd)/l1
    if not(0.4<s<1.15): continue
    # require near-zero rotation
    a1=np.arctan2(dx[1],dx[0]); a2=np.arctan2(dd[1],dd[0])
    if abs((a2-a1+np.pi)%(2*np.pi)-np.pi)>0.06: continue
    t=dst[i]-s*src[i]
    err=np.hypot(*(src*s+t-dst).T)
    c=(err<5).sum()
    if c>best[0]: best=(c,(s,t))
c,(s,t)=best
inl=np.hypot(*(src*s+t-dst).T)<5
# refine LS
A=np.zeros((inl.sum()*2,3));b=np.zeros(inl.sum()*2)
S=src[inl];Dd=dst[inl]
A[0::2,0]=S[:,0];A[0::2,1]=1;b[0::2]=Dd[:,0]
A[1::2,0]=S[:,1];A[1::2,2]=1;b[1::2]=Dd[:,1]
s,tx,ty=np.linalg.lstsq(A,b,rcond=None)[0]
print(n,'cands',N,'inl',int(c),'s',round(s,3),'t',round(tx,1),round(ty,1))
json.dump({n:dict(A=[[s,0,tx],[0,s,ty]],inliers=int(c))},open('/tmp/claude-0/s/reg/c2_%s.json'%n,'w'))

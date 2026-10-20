import cv2, numpy as np, json, sys
D='/home/user/trevwebsite/prototype/source/world-v3/layers/raw/'
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v3/trev-world-v3-final.png')
sift=cv2.SIFT_create(nfeatures=40000,contrastThreshold=0.02)
kM,dM=sift.detectAndCompute(cv2.cvtColor(M,cv2.COLOR_BGR2GRAY),None)
bf=cv2.BFMatcher()
n=sys.argv[1]
L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
if L.shape[2]==3: L=cv2.cvtColor(L,cv2.COLOR_BGR2BGRA)
mk=cv2.erode((L[...,3]>200).astype(np.uint8)*255,np.ones((9,9)))
kL,dL=sift.detectAndCompute(cv2.cvtColor(L[...,:3],cv2.COLOR_BGR2GRAY),mk)
ms=bf.knnMatch(dL,dM,k=2)
good=[m for m,n2 in ms if m.distance<0.8*n2.distance]
src=np.float32([kL[m.queryIdx].pt for m in good]); dst=np.float32([kM[m.trainIdx].pt for m in good])
A,inl=cv2.estimateAffinePartial2D(src,dst,method=cv2.RANSAC,ransacReprojThreshold=5,maxIters=50000,confidence=0.999)
s=float(np.hypot(A[0,0],A[1,0])); rot=float(np.degrees(np.arctan2(A[1,0],A[0,0])))
print(n,'good',len(good),'inl',int(inl.sum()),'s',round(s,3),'rot',round(rot,2),'t',A[:,2].round(1),flush=True)
json.dump({n:dict(A=A.tolist(),inl=int(inl.sum()),s=s,rot=rot)},open(f'/tmp/claude-0/s/reg3/{n}.json','w'))

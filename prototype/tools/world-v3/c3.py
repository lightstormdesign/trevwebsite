import cv2, numpy as np, json, sys
from scipy import ndimage
D='/home/user/trevwebsite/prototype/source/world-v3/layers/raw/'
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v3/trev-world-v3-final.png')
W,H=941,1672
def defringe(L,er=3):
    a=L[...,3]
    core=cv2.erode((a>200).astype(np.uint8),np.ones((2*er+1,2*er+1)))>0
    # pull edge colours from the nearest solid interior pixel (kills the red/yellow halo)
    _,(iy,ix)=ndimage.distance_transform_edt(~core,return_indices=True)
    rgb=L[...,:3].copy(); edge=(a>0)&~core
    rgb[edge]=L[...,:3][iy[edge],ix[edge]]
    na=cv2.GaussianBlur((core*255).astype(np.uint8),(0,0),1.2)
    na=np.maximum(na,(core*255).astype(np.uint8))
    return np.dstack([rgb,na])
def load(n):
    L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
    if L.shape[2]==3: L=cv2.cvtColor(L,cv2.COLOR_BGR2BGRA)
    return L
def top(L): r=np.where((L[...,3]>128).mean(1)>0.02)[0]; return int(r[0]) if len(r) else 0
P=json.load(open(sys.argv[1]))
if __name__=='__main__':
    for n in P:
        L=load(n); print(n,L.shape[:2],'top',top(L))

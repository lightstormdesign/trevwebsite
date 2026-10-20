import cv2, numpy as np
rng=np.random.default_rng(7)
def paper(h,w):
    n=rng.standard_normal((h,w)).astype(np.float32)
    g=cv2.GaussianBlur(n,(0,0),1.1)*0.6+cv2.GaussianBlur(n,(0,0),4)*1.4
    return g/ g.std()
def grade(bgr, chroma=0.76, contrast=0.9, smooth=0.55, grain=2.2):
    img=bgr.astype(np.uint8)
    sm=cv2.edgePreservingFilter(img,flags=1,sigma_s=18,sigma_r=0.12)
    img=cv2.addWeighted(sm,smooth,img,1-smooth,0)
    lab=cv2.cvtColor(img,cv2.COLOR_BGR2LAB).astype(np.float32)
    L,a,b=lab[...,0],lab[...,1]-128,lab[...,2]-128
    L=(L-128)*contrast+128+4          # softer contrast, slightly lifted
    a*=chroma; b=b*chroma+2.5         # muted colour, a touch warm (aged paper)
    L+=paper(*L.shape)*grain          # fine paper/canvas tooth
    lab=np.dstack([np.clip(L,0,255),np.clip(a+128,0,255),np.clip(b+128,0,255)]).astype(np.uint8)
    return cv2.cvtColor(lab,cv2.COLOR_LAB2BGR)

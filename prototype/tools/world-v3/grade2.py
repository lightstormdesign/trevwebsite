import cv2, numpy as np
rng=np.random.default_rng(7)
def paper(h,w):
    n=rng.standard_normal((h,w)).astype(np.float32)
    g=cv2.GaussianBlur(n,(0,0),1.1)*0.6+cv2.GaussianBlur(n,(0,0),4)*1.4
    return g/g.std()
def smoothstep(e0,e1,x): t=np.clip((x-e0)/(e1-e0),0,1); return t*t*(3-2*t)
def grade(bgr, base_chroma=0.86, gold_chroma=1.3, lift=7, smooth=0.5, grain=1.6):
    img=bgr.astype(np.uint8)
    sm=cv2.edgePreservingFilter(img,flags=1,sigma_s=18,sigma_r=0.12)
    img=cv2.addWeighted(sm,smooth,img,1-smooth,0)
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV).astype(np.float32)
    H,S,V=hsv[...,0],hsv[...,1]/255,hsv[...,2]/255
    # gold: yellow-orange hues (OpenCV H 15..32 = 30..64 deg), saturated and bright
    gold=smoothstep(13,18,H)*(1-smoothstep(30,36,H))*smoothstep(0.25,0.5,S)*smoothstep(0.45,0.75,V)
    # brilliance: the sun and its glow
    hi=smoothstep(0.82,0.97,V)
    lab=cv2.cvtColor(img,cv2.COLOR_BGR2LAB).astype(np.float32)
    L,a,b=lab[...,0],lab[...,1]-128,lab[...,2]-128
    ch=base_chroma+(gold_chroma-base_chroma)*gold
    ch=np.maximum(ch,1.0*hi)
    a*=ch; b*=ch
    # brighter, illustrated: lift shadows/mids, keep highlights brilliant (no compression)
    Ln=L/255
    Ln=Ln+ (lift/255)*(1-Ln)*1.6 + 0.06*gold*(1-Ln)
    L=Ln*255+paper(*L.shape)*grain*(1-hi)
    lab=np.dstack([np.clip(L,0,255),np.clip(a+128,0,255),np.clip(b+128,0,255)]).astype(np.uint8)
    return cv2.cvtColor(lab,cv2.COLOR_LAB2BGR)

def grade3(bgr, base_chroma=0.78, gold_chroma=1.06, lift=5, smooth=0.5, grain=1.8):
    # muted, painterly, shifted away from purple/red toward green-yellow-blue (Burnell's palette)
    img=grade(bgr, base_chroma=1.0, gold_chroma=1.0, lift=lift, smooth=smooth, grain=grain)
    hsv=cv2.cvtColor(img,cv2.COLOR_BGR2HSV).astype(np.float32)
    H,S,V=hsv[...,0],hsv[...,1]/255,hsv[...,2]/255
    gold=smoothstep(13,18,H)*(1-smoothstep(30,36,H))*smoothstep(0.25,0.5,S)*smoothstep(0.45,0.75,V)
    hi=smoothstep(0.82,0.97,V)
    lab=cv2.cvtColor(img,cv2.COLOR_BGR2LAB).astype(np.float32)
    L,a,b=lab[...,0],lab[...,1]-128,lab[...,2]-128
    # pull magenta/red out: positive a shrinks and slides a touch toward green
    a=np.where(a>0,a*0.72,a)-2.5
    # purples (red + blue) lean blue
    purple=smoothstep(0,10,lab[...,1]-128)*smoothstep(0,10,-(lab[...,2]-128))
    a=a*(1-0.5*purple); b=b-3*purple
    # greens and yellows a little richer than the rest
    green=smoothstep(2,10,-a)
    ch=base_chroma+(gold_chroma-base_chroma)*np.maximum(gold,0.6*green)
    ch=np.maximum(ch,0.95*hi)
    a*=ch; b*=ch
    lab=np.dstack([np.clip(L,0,255),np.clip(a+128,0,255),np.clip(b+128,0,255)]).astype(np.uint8)
    return cv2.cvtColor(lab,cv2.COLOR_LAB2BGR)

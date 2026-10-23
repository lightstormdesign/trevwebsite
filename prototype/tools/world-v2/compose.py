import cv2, numpy as np, json, glob, sys
D='/home/user/trevwebsite/prototype/source/world-v2/layers/raw/'
T={}
T=json.load(open('/tmp/claude-0/s/reg/all.json'))
try: T.update(json.load(open('/tmp/claude-0/s/reg/manual.json')))
except: pass
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png')
H,W=M.shape[:2]
order=['01-sky','02-spires','03-canyon-walls','04-canyon-floor','05-pool','BISON','07-boulders','10-stream','08-aspens','09-juniper','11-fg-left','12-fg-right']
skip=set(sys.argv[1:])
comp=np.zeros((H,W,3),np.float32)
for n in order:
    if n in skip: continue
    if n=='BISON':
        L=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/layers/trev-world-bison.png',cv2.IMREAD_UNCHANGED); A=np.float32([[1,0,0],[0,1,0]])
    else:
        L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
        if L.shape[2]==3: L=cv2.cvtColor(L,cv2.COLOR_BGR2BGRA)
        A=np.float32(T[n]['A'])
    w=cv2.warpAffine(L,A,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0,0)).astype(np.float32)
    a=w[...,3:4]/255
    comp=comp*(1-a)+w[...,:3]*a
cv2.imwrite('/tmp/claude-0/s/comp.png',comp.astype(np.uint8))
s=np.concatenate([comp.astype(np.uint8),np.zeros((H,10,3),np.uint8),M],1)
cv2.imwrite('/tmp/claude-0/s/comp_side.jpg',cv2.resize(s,None,fx=0.5,fy=0.5))

import numpy as np, cv2
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png'); H,W=M.shape[:2]
d=np.load('/tmp/claude-0/s/samlogits.npy',allow_pickle=True).item()
order=['sky','cliffs','groves','pool','bison','stream','aspens','juniper','fgleft','fgright']  # back->front
lab=np.zeros((H,W),np.int32)
for i,k in reversed(list(enumerate(order))):
    if k=='sky': continue
    m=d[k]>0
    m=cv2.erode(m.astype(np.uint8),np.ones((5,5)))>0   # markers slightly inside
    lab[(lab==0)&m]=i+1
# sky marker: top area not claimed, above y where cliffs start per column
cl=d['cliffs']>0
yy=np.arange(H)[:,None]*np.ones((1,W))
first=np.where(cl.any(0),cl.argmax(0),H)  # first cliff row per column
skym=(yy<np.minimum(first[None,:]-8,700))&(lab==0)
skym&=~(cv2.dilate((d['aspens']>0).astype(np.uint8),np.ones((15,15)))>0)&~(cv2.dilate((d['juniper']>0).astype(np.uint8),np.ones((15,15)))>0)
lab[skym]=1
ws=cv2.watershed(cv2.GaussianBlur(M,(5,5),0),lab.copy())
b=ws==-1; w2=ws.copy(); w2[b]=0
for _ in range(3):
    dl=cv2.dilate(w2.astype(np.float32),np.ones((3,3))).astype(np.int32); w2[w2==0]=dl[w2==0]
ws=w2
# drop small islands of any label (e.g. sky specks between leaves): give them to the surrounding label
for l in range(1,len(order)+1):
    n,cc,st,_=cv2.connectedComponentsWithStats((ws==l).astype(np.uint8),8)
    if n<=2: continue
    big=np.argmax(st[1:,cv2.CC_STAT_AREA])+1
    for c in range(1,n):
        if c!=big and st[c,cv2.CC_STAT_AREA]<(30000 if l==1 else 1500):
            ws[cc==c]=0
for _ in range(60):
    if not (ws==0).any(): break
    dl=cv2.dilate(ws.astype(np.float32),np.ones((3,3))).astype(np.int32); ws[ws==0]=dl[ws==0]
np.save('/tmp/claude-0/s/owner.npy',ws)
pal=np.array([[0,0,0],[255,160,60],[60,60,230],[60,200,60],[230,200,40],[255,255,255],[40,230,230],[230,60,230],[30,120,255],[160,90,40],[120,255,180]],np.uint8)
vis=(pal[ws]*0.55+M*0.45).astype(np.uint8)
for i,k in enumerate(order): cv2.putText(vis,k,(10,40+i*34),0,1.1,pal[i+1].tolist(),3)
cv2.imwrite('/tmp/claude-0/s/owner.jpg',cv2.resize(vis,None,fx=0.5,fy=0.5))

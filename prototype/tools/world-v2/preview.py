import numpy as np, cv2, json
OUT='/home/user/trevwebsite/prototype/source/world-v2/layers/'
order=json.load(open('/tmp/claude-0/s/order.json'))
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png').astype(np.float32); H,W=M.shape[:2]
Ls=[cv2.imread(OUT+f'trev-world-{i+1:02d}-{k}.png',cv2.IMREAD_UNCHANGED).astype(np.float32) for i,k in enumerate(order)]
def comp(shift):
    c=np.zeros((H,W,3),np.float32)
    for (k,L),(dx,dy) in zip(zip(order,Ls),shift):
        A=np.float32([[1,0,dx],[0,1,dy]]); w=cv2.warpAffine(L,A,(W,H),borderValue=(0,0,0,0))
        a=w[...,3:4]/255; c=c*(1-a)+w[...,:3]*a
    return c
rest=comp([(0,0)]*len(order))
d=np.abs(rest-M).mean(-1)
print('rest diff mean',d.mean().round(3),'p99',np.percentile(d,99).round(2),'max',d.max().round(1))
# simulate scroll mid-descent: far layers lag (move down more), near layers move up
dep={'sky':0,'cliffs':0.15,'groves':0.3,'pool':0.45,'bison':0.45,'stream':0.6,'aspens':0.8,'juniper':0.8,'fgleft':1,'fgright':1}
sim=comp([(0 if k not in('aspens','juniper','fgleft','fgright') else (-25 if k in('aspens','fgleft') else 25), -90*dep[k]+40) for k in order])
s=np.concatenate([rest,np.zeros((H,10,3)),M,np.zeros((H,10,3)),sim],1)
cv2.imwrite('/tmp/claude-0/s/preview.jpg',cv2.resize(s.astype(np.uint8),None,fx=0.42,fy=0.42))
tiles=[]
for k,L in zip(order,Ls):
    bg=np.zeros((H,W,3),np.float32); bg[:]=(40,140,40); a=L[...,3:4]/255
    t=(L[...,:3]*a+bg*(1-a)).astype(np.uint8); cv2.putText(t,k,(20,70),0,2.2,(255,255,255),5); tiles.append(cv2.resize(t.astype(np.uint8),None,fx=0.2,fy=0.2))
cv2.imwrite('/tmp/claude-0/s/layertiles.jpg',np.concatenate([np.concatenate(tiles[:5],1),np.concatenate(tiles[5:],1)],0))

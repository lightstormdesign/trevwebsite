import numpy as np,cv2,json,sys
OUT='/home/user/trevwebsite/prototype/source/world-v2/layers/'
order=json.load(open('/tmp/claude-0/s/order.json'))
start=json.loads(sys.argv[1])
H,W=1672,941; c=np.zeros((H,W,3),np.float32)
for i,k in enumerate(order):
    L=cv2.imread(OUT+f'trev-world-{i+1:02d}-{k}.png',cv2.IMREAD_UNCHANGED).astype(np.float32)
    dx,dy=start.get(k,[0,0])
    w=cv2.warpAffine(L,np.float32([[1,0,dx],[0,1,dy]]),(W,H),borderValue=(0,0,0,0)); a=w[...,3:4]/255; c=c*(1-a)+w[...,:3]*a
cv2.imwrite(sys.argv[2],np.clip(c+0.5,0,255).astype(np.uint8))

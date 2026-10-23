import cv2, numpy as np, json
D='/home/user/trevwebsite/prototype/source/world-v2/layers/raw/'
T=json.load(open('/tmp/claude-0/s/reg/all.json'))
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png'); H,W=M.shape[:2]
def al(n):
    L=cv2.imread(D+n+'.png',cv2.IMREAD_UNCHANGED)
    return cv2.warpAffine(L,np.float32(T[n]['A']),(W,H),flags=cv2.INTER_LINEAR,borderValue=(0,0,0,0))[...,3]
def gc(init_fg, sure_fg=None, sure_bg=None, iters=6):
    m=np.full((H,W),cv2.GC_PR_BGD,np.uint8)
    m[init_fg]=cv2.GC_PR_FGD
    far=cv2.dilate(init_fg.astype(np.uint8),np.ones((61,61)))==0
    m[far]=cv2.GC_BGD
    core=cv2.erode(init_fg.astype(np.uint8),np.ones((25,25)))>0
    m[core]=cv2.GC_FGD
    if sure_fg is not None: m[sure_fg]=cv2.GC_FGD
    if sure_bg is not None: m[sure_bg]=cv2.GC_BGD
    bg=np.zeros((1,65));fg=np.zeros((1,65))
    cv2.grabCut(M,m,None,bg,fg,iters,cv2.GC_INIT_WITH_MASK)
    return (m==1)|(m==3)
out={}
A={n:al(n)>128 for n in ['02-spires','03-canyon-walls','04-canyon-floor','05-pool','07-boulders','10-stream','08-aspens','09-juniper','11-fg-left','12-fg-right']}
for k,v in A.items(): np.save(f'/tmp/claude-0/s/ai_{k}.npy',v)
for n in ['08-aspens','09-juniper','11-fg-left','12-fg-right']:
    out[n]=gc(A[n]); np.save(f'/tmp/claude-0/s/gc_{n}.npy',out[n]); print(n,out[n].mean(),flush=True)
water=A['05-pool']|A['07-boulders']|A['10-stream']
out['water']=gc(water); np.save('/tmp/claude-0/s/gc_water.npy',out['water'])
out['groves']=gc(A['04-canyon-floor']); np.save('/tmp/claude-0/s/gc_groves.npy',out['groves'])
cl=A['02-spires']|A['03-canyon-walls']
out['cliffs']=gc(cl); np.save('/tmp/claude-0/s/gc_cliffs.npy',out['cliffs'])
tiles=[]
for k,v in out.items():
    vis=(M*0.35).astype(np.uint8); vis[v]=M[v]
    cnt,_=cv2.findContours(v.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(vis,cnt,-1,(0,255,255),2)
    cv2.putText(vis,k,(20,60),cv2.FONT_HERSHEY_SIMPLEX,2,(255,255,255),4)
    tiles.append(cv2.resize(vis,None,fx=0.3,fy=0.3))
while len(tiles)<8: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite('/tmp/claude-0/s/gc.jpg',np.concatenate([np.concatenate(tiles[:4],1),np.concatenate(tiles[4:8],1)],0))

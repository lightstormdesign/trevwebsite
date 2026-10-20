import sys; sys.argv=[sys.argv[0],'/tmp/claude-0/s/p3.json']+sys.argv[1:]
exec(open('/tmp/claude-0/s/c3.py').read().split("if __name__")[0])
import json
P=json.load(open('/tmp/claude-0/s/p3.json'))
out=sys.argv[2] if len(sys.argv)>2 else '/tmp/claude-0/s/r3.png'
cache={}
def placed(n,cfg,extra=(0,0)):
    if n not in cache:
        L=load(n)
        if n!='01-sky': L=defringe(L,cfg.get('er',3))
        cache[n]=L
    L=cache[n]; s=cfg.get('s',W/L.shape[1]); x=cfg.get('x',0)+extra[0]; y=cfg.get('y',0)+extra[1]
    A=np.float32([[s,0,x],[0,s,y]])
    return cv2.warpAffine(L,A,(W,H),flags=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC,borderValue=(0,0,0,0))
def comp(off=None):
    c=np.zeros((H,W,3),np.float32)
    for n,cfg in P.items():
        w=placed(n,cfg,(off or {}).get(n,(0,0))).astype(np.float32); a=w[...,3:4]/255; c=c*(1-a)+w[...,:3]*a
    return c
if __name__=='__main__':
    c=comp()
    cv2.imwrite(out,np.clip(c,0,255).astype(np.uint8))
    s=np.concatenate([np.clip(c,0,255).astype(np.uint8),np.zeros((H,10,3),np.uint8),M],1)
    cv2.imwrite('/tmp/claude-0/s/r3side.jpg',cv2.resize(s,None,fx=0.5,fy=0.5))

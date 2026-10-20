import numpy as np,cv2,json,sys
OUT='/home/user/trevwebsite/prototype/source/world-v2/layers/'
order=json.load(open('/tmp/claude-0/s/order.json'))
S=float(__import__("os").environ.get("S","0.5")); H,W=int(1672*S),int(941*S)
Ls={k:cv2.resize(cv2.imread(OUT+f'trev-world-{i+1:02d}-{k}.png',cv2.IMREAD_UNCHANGED),(W,H),interpolation=cv2.INTER_AREA).astype(np.float32) for i,k in enumerate(order)}
P=json.load(open('/tmp/claude-0/s/plan.json'))
def ease(t): t=min(1,max(0,t)); return t*t*(3-2*t)
def lerp(a,b,t): return a+(b-a)*t
def state(k,p):
    if k in('aspens','juniper'):
        t=ease((p-P['trees']['span'][0])/(P['trees']['span'][1]-P['trees']['span'][0])); x=P['trees']['from']*(1-t)
        return (-x if k=='aspens' else x)*S,0
    a,b=P['Dspan']; D=P['D']*(1-ease((p-a)/(b-a)))
    return 0, D*P['mult'][k]*S
def render(p):
    c=np.zeros((H,W,3),np.float32); skyvis=np.ones((H,W),np.float32)
    for k in order:
        dx,dy=state(k,p); L=cv2.warpAffine(Ls[k],np.float32([[1,0,dx],[0,1,dy]]),(W,H),borderValue=(0,0,0,0))
        a=L[...,3:4]/255
        if k=='cliffs' and 'mist' in P:
            m=P['mist']; mo=1-ease((p-m['span'][0])/(m['span'][1]-m['span'][0]))
            c=c*(1-a)+L[...,:3]*a
            yy=np.arange(H)[:,None]; top=(m['y0']*S+dy); haze=np.clip((yy-top)/(m['h']*S),0,1); haze=haze*haze*(3-2*haze)*0.92*mo
            mist=np.array([222,214,232],np.float32)
            c=c*(1-haze[...,None])+mist*haze[...,None]
        else:
            c=c*(1-a)+L[...,:3]*a
        if k=='sky': pass
        else: skyvis*=(1-a[...,0])
    return c,skyvis
ps=[float(x) for x in sys.argv[1].split(',')]
fr=[]
for p in ps:
    c,sv=render(p); img=np.clip(c,0,255).astype(np.uint8)
    cv2.putText(img,f'{p:.2f}',(8,30),0,1,(255,255,255),2); fr.append(img)
rows=[np.concatenate(fr[i:i+5],1) for i in range(0,len(fr),5)]
if len(rows)>1 and rows[-1].shape!=rows[0].shape: rows[-1]=np.pad(rows[-1],((0,0),(0,rows[0].shape[1]-rows[-1].shape[1]),(0,0)))
cv2.imwrite(sys.argv[2],cv2.resize(np.concatenate(rows,0),None,fx=0.7,fy=0.7))

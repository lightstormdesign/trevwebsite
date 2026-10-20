import numpy as np,cv2,json
OUT='/home/user/trevwebsite/prototype/source/world-v2/layers/'
order=json.load(open('/tmp/claude-0/s/order.json'))
H,W=1672,941
def ld(k): i=order.index(k); return cv2.imread(OUT+f'trev-world-{i+1:02d}-{k}.png',cv2.IMREAD_UNCHANGED).astype(np.float32)
sky=ld('sky')[...,:3]; cl=ld('cliffs')
DY=900
cl=cv2.warpAffine(cl,np.float32([[1,0,0],[0,1,DY]]),(W,H),borderValue=(0,0,0,0))
a=cl[...,3]/255
# soften the cliff layer's side cuts into the sky (each row: ramp in from its leftmost/rightmost pixel)
on=a>0.5; xs=np.arange(W)[None,:]
left=np.where(on.any(1),on.argmax(1),W)[:,None]; right=np.where(on.any(1),W-1-on[:,::-1].argmax(1),-1)[:,None]
ramp=np.clip(np.minimum(xs-left,right-xs)/110,0,1); ramp=ramp*ramp*(3-2*ramp)
a=a*ramp
c=sky*(1-a[...,None])+cl[...,:3]*a[...,None]
# low cloud bank: the sky's own lower clouds, drifting over the base of the cliffs
yy=np.arange(H)[:,None]
haze=np.clip((yy-1330)/300,0,1); haze=(haze*haze*(3-2*haze))*0.92
mist=cv2.GaussianBlur(sky,(0,0),6)*0.55+np.array([222,214,232],np.float32)*0.45
c=c*(1-haze[...,None])+mist*haze[...,None]
cv2.imwrite('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-endframe.png',np.clip(c+0.5,0,255).astype(np.uint8),[cv2.IMWRITE_PNG_COMPRESSION,9])
cv2.imwrite('/tmp/claude-0/s/end.jpg',np.clip(c,0,255).astype(np.uint8))

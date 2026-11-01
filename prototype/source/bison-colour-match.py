# match the grazing and head-up bisons' colour grade to the facing bison: per-channel histogram matching
# in CIE Lab, over the opaque bison pixels only (alpha kept as is)
from PIL import Image
import numpy as np, sys
def srgb2lin(c): c=c/255.0; return np.where(c<=0.04045, c/12.92, ((c+0.055)/1.055)**2.4)
def lin2srgb(c): c=np.clip(c,0,1); return np.where(c<=0.0031308, c*12.92, 1.055*c**(1/2.4)-0.055)*255
M=np.array([[0.4124564,0.3575761,0.1804375],[0.2126729,0.7151522,0.0721750],[0.0193339,0.1191920,0.9503041]]); Mi=np.linalg.inv(M)
W=np.array([0.95047,1.0,1.08883])
def f(t): return np.where(t>216/24389, np.cbrt(t), (24389/27*t+16)/116)
def fi(t): return np.where(t**3>216/24389, t**3, (116*t-16)/(24389/27))
def rgb2lab(rgb):
    xyz=srgb2lin(rgb)@M.T/W; fx,fy,fz=f(xyz[...,0]),f(xyz[...,1]),f(xyz[...,2])
    return np.stack([116*fy-16, 500*(fx-fy), 200*(fy-fz)],-1)
def lab2rgb(lab):
    fy=(lab[...,0]+16)/116; fx=fy+lab[...,1]/500; fz=fy-lab[...,2]/200
    xyz=np.stack([fi(fx),fi(fy),fi(fz)],-1)*W; return lin2srgb(xyz@Mi.T)
def match(src_vals, ref_vals, x):
    # map x through src's CDF onto ref's quantiles
    q=np.linspace(0,1,1001); sq=np.quantile(src_vals,q); rq=np.quantile(ref_vals,q)
    sq=np.maximum.accumulate(sq+np.arange(len(sq))*1e-9)
    return np.interp(x, sq, rq)
ref=np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float); rm=ref[...,3]>200; rl=rgb2lab(ref[...,:3])[rm]
for path in sys.argv[2:]:
    im=np.asarray(Image.open(path).convert('RGBA')).astype(float); a=im[...,3]; m=a>200; lab=rgb2lab(im[...,:3]); sl=lab[m]
    out=lab.copy()
    for ch in range(3): out[...,ch]=match(sl[:,ch], rl[:,ch], lab[...,ch])
    rgb=lab2rgb(out); rgb=np.where((a>0)[...,None], rgb, im[...,:3])
    Image.fromarray(np.dstack([np.clip(rgb,0,255),a]).astype(np.uint8),'RGBA').save(path,'WEBP',quality=88,method=6)
    print('graded', path)

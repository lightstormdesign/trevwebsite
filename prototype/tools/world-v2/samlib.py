import onnxruntime as ort, numpy as np, cv2
P='/tmp/claude-0/s/sam/'
M=cv2.imread('/home/user/trevwebsite/prototype/source/world-v2/trev-world-v2-full.png'); H,W=M.shape[:2]
sc=1024/H; rw=round(W*sc)
EMB=np.load('/tmp/claude-0/s/sam_emb_sq.npy')
dec=ort.InferenceSession(P+'sam_vit_b_01ec64.decoder.onnx',providers=['CPUExecutionProvider'])
def logits(pos,neg=(),box=None,prev=None):
    pts=[(x*sc,y*sc) for x,y in pos]+[(x*sc,y*sc) for x,y in neg]; lab=[1]*len(pos)+[0]*len(neg)
    if box is not None:
        x0,y0,x1,y1=box; pts+=[(x0*sc,y0*sc),(x1*sc,y1*sc)]; lab+=[2,3]
    else: pts.append((0,0)); lab.append(-1)
    mi=np.zeros((1,1,256,256),np.float32) if prev is None else prev
    out=dec.run(None,{'image_embeddings':EMB,'point_coords':np.float32([pts]),'point_labels':np.float32([lab]),
        'mask_input':mi,'has_mask_input':np.float32([0 if prev is None else 1]),'orig_im_size':np.float32([1024,1024])})
    return out[2],float(out[1][0][0])
def seg(pos,neg=(),box=None,refine=1):
    low,iou=logits(pos,neg,box)
    for _ in range(refine): low,iou=logits(pos,neg,box,prev=low)
    up=cv2.resize(low[0,0],(1024,1024),interpolation=cv2.INTER_LINEAR)[:,:rw]
    full=cv2.resize(up,(W,H),interpolation=cv2.INTER_LINEAR)
    return full,iou   # logits at full res

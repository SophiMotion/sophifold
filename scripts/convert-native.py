import os,sys,json,hashlib,time,math,array
sys.path.insert(0,os.path.abspath('.cad-python'))
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString
from OCP.XCAFDoc import XCAFDoc_DocumentTool, XCAFDoc_ColorType
from OCP.TDF import TDF_Label
from OCP.collections import Sequence_TDF_Label as TDF_LabelSequence
from OCP.TDataStd import TDataStd_Name
from OCP.TopLoc import TopLoc_Location
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE,TopAbs_REVERSED
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.Quantity import Quantity_Color
source=sys.argv[1]
start=time.time()
doc=TDocStd_Document(TCollection_ExtendedString('V3'))
reader=STEPCAFControl_Reader();reader.SetColorMode(True);reader.SetNameMode(True)
print('Reading native STEP',flush=True)
status=reader.ReadFile(source)
if int(status)!=1:raise RuntimeError('Native STEP read failed '+str(status))
if not reader.Transfer(doc):raise RuntimeError('Native transfer failed')
st=XCAFDoc_DocumentTool.ShapeTool_s(doc.Main());ct=XCAFDoc_DocumentTool.ColorTool_s(doc.Main())
print('STEP transferred in',round(time.time()-start,1),'seconds',flush=True)
meshes=[];chunks=[];offset=0;triangles=0;bounds=[math.inf]*3+[-math.inf]*3;empty=[]
def name(label):
    n=TDataStd_Name()
    return str(n.Get().ToExtString()) if label.FindAttribute(TDataStd_Name.GetID_s(),n) else 'Component'
def append(values,typ):
    global offset
    a=array.array(typ,values); b=a.tobytes();info={'offset':offset,'length':len(a)};chunks.append(b);offset+=len(b);return info
def color(label,shape):
    c=Quantity_Color()
    for kind in [XCAFDoc_ColorType.XCAFDoc_ColorSurf,XCAFDoc_ColorType.XCAFDoc_ColorGen]:
        if ct.GetColor_s(label,kind,c) or ct.GetColor(shape,kind,c):return [c.Red(),c.Green(),c.Blue()]
    return [.75,.77,.8]
def visit(label,loc):
    global triangles
    if st.IsReference_s(label):
        ref=TDF_Label();st.GetReferredShape_s(label,ref)
        visit(ref,loc.Multiplied(st.GetLocation_s(label)));return
    if st.IsAssembly_s(label):
        seq=TDF_LabelSequence();st.GetComponents_s(label,seq)
        for j in range(1,seq.Length()+1):visit(seq.Value(j),loc)
        return
    shape=st.GetShape_s(label).Moved(loc)
    BRepMesh_IncrementalMesh(shape,.4,False,.4,True)
    exp=TopExp_Explorer(shape,TopAbs_FACE);positions=[];indices=[]
    while exp.More():
        face=TopoDS.Face(exp.Current());floc=TopLoc_Location();tri=BRep_Tool.Triangulation_s(face,floc)
        if tri is not None:
            base=len(positions)//3;trsf=floc.Transformation()
            for j in range(1,tri.NbNodes()+1):
                p=tri.Node(j).Transformed(trsf);xyz=[p.X(),p.Y(),p.Z()];positions.extend(xyz)
                for k in range(3):bounds[k]=min(bounds[k],xyz[k]);bounds[k+3]=max(bounds[k+3],xyz[k])
            reverse=face.Orientation()==TopAbs_REVERSED
            for j in range(1,tri.NbTriangles()+1):
                a,b,c=tri.Triangle(j).Get()
                indices.extend([base+a-1,base+c-1,base+b-1] if reverse else [base+a-1,base+b-1,base+c-1])
        exp.Next()
    if not indices:empty.append(name(label));return
    triangles+=len(indices)//3
    meshes.append({'id':len(meshes),'name':name(label),'color':color(label,shape),'position':append(positions,'f'),'normal':None,'index':append(indices,'I')})
    if len(meshes)%25==0:print('Meshed',len(meshes),'parts',flush=True)
roots=TDF_LabelSequence();st.GetFreeShapes(roots)
for j in range(1,roots.Length()+1):visit(roots.Value(j),TopLoc_Location())
if triangles==0:raise RuntimeError('No triangles from native converter')
meta={'source':'V3 Assembly.step','sha256':hashlib.sha256(open(source,'rb').read()).hexdigest(),'sourceBytes':os.path.getsize(source),'meshBytes':offset,'triangles':triangles,'bounds':bounds,'meshes':meshes,'omittedEmptyShapes':empty}
outdir=sys.argv[2] if len(sys.argv)>2 else 'public/assets'
os.makedirs(outdir,exist_ok=True)
open(os.path.join(outdir,'v3-mesh.bin'),'wb').write(b''.join(chunks))
json.dump(meta,open(os.path.join(outdir,'v3-model.json'),'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(json.dumps({'meshCount':len(meshes),'triangles':triangles,'bounds':bounds,'bytes':offset,'empty':empty,'seconds':time.time()-start}),flush=True)

import os,sys,json,time
sys.path.insert(0,os.path.abspath('.cad-python'))
from OCP.STEPCAFControl import STEPCAFControl_Reader
from OCP.TDocStd import TDocStd_Document
from OCP.TCollection import TCollection_ExtendedString
from OCP.XCAFDoc import XCAFDoc_DocumentTool
from OCP.TDF import TDF_Label
from OCP.collections import Sequence_TDF_Label
from OCP.TDataStd import TDataStd_Name
from OCP.TopLoc import TopLoc_Location
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE
from OCP.TopoDS import TopoDS
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder
from OCP.BRep import BRep_Tool
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
start=time.time();doc=TDocStd_Document(TCollection_ExtendedString('Inspect'))
r=STEPCAFControl_Reader();r.SetNameMode(True);r.ReadFile(sys.argv[1]);r.Transfer(doc)
st=XCAFDoc_DocumentTool.ShapeTool_s(doc.Main());out=[]
def visit(l,loc):
 if st.IsReference_s(l):
  ref=TDF_Label();st.GetReferredShape_s(l,ref);visit(ref,loc.Multiplied(st.GetLocation_s(l)));return
 if st.IsAssembly_s(l):
  seq=Sequence_TDF_Label();st.GetComponents_s(l,seq)
  for i in range(1,seq.Length()+1):visit(seq.Value(i),loc)
  return
 n=TDataStd_Name();name=str(n.Get().ToExtString()) if l.FindAttribute(TDataStd_Name.GetID_s(),n) else 'Part'
 shape=st.GetShape_s(l).Moved(loc)
 if name=='Mounting':return
 cylinders=[]
 if len(out)>=62:
  e=TopExp_Explorer(shape,TopAbs_FACE)
  while e.More():
   f=TopoDS.Face(e.Current());surf=BRepAdaptor_Surface(f,True)
   if surf.GetType()==GeomAbs_Cylinder:
    c=surf.Cylinder();axis=c.Axis();p=axis.Location();d=axis.Direction()
    if c.Radius()>8:cylinders.append({'radius':round(c.Radius(),3),'point':[round(p.X(),3),round(p.Y(),3),round(p.Z(),3)],'axis':[round(d.X(),3),round(d.Y(),3),round(d.Z(),3)]})
   e.Next()
 out.append({'id':len(out),'name':name,'cylinders':cylinders})
roots=Sequence_TDF_Label();st.GetFreeShapes(roots)
for i in range(1,roots.Length()+1):visit(roots.Value(i),TopLoc_Location())
json.dump(out,open(sys.argv[2] if len(sys.argv)>2 else 'cad-hinge-inspection.json','w',encoding='utf8'),ensure_ascii=False,indent=2)
print('Inspected',len(out),'groups in',round(time.time()-start,1),'seconds')
for p in out:
 if p['cylinders']:print(p['id'],p['name'],p['cylinders'][:12])

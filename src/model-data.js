export function decodeMesh(mesh, buffer) {
  const read=(v,T)=>{if(!v||!Number.isSafeInteger(v.offset)||!Number.isSafeInteger(v.length)||v.offset<0||v.length<0||v.offset%4||v.offset+v.length*4>buffer.byteLength)throw Error('Invalid CAD mesh buffer');return new T(buffer,v.offset,v.length);};
  return {position:read(mesh.position,Float32Array),normal:mesh.normal?read(mesh.normal,Float32Array):null,index:read(mesh.index,Uint32Array)};
}
export function dimensions(bounds){return bounds.slice(3).map((n,i)=>n-bounds[i]);}
export function filterComponents(meshes,query){return meshes.filter(m=>m.name.toLowerCase().includes(query.trim().toLowerCase()));}

// Match the real-world video: source Z -> X, source X -> Y, source Y -> Z (up).
export function displayPosition([x,y,z]){return [z,x,y];}
export function alignBoundsToX(b){return [...displayPosition(b.slice(0,3)),...displayPosition(b.slice(3))];}
// Detached mirrored motor fasteners in this exact source assembly.
const hiddenDefaultIds=new Set([32,33,34,35,38,39,40,41]);
export function isDefaultVisible(id){return !hiddenDefaultIds.has(id);}

export function isScrewComponent(part){return /\b(screw|bolt)\b/i.test(part.name);}

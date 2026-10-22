import * as THREE from 'three';
// Full triangle/box intersection catches thin edges and supports as well as vertices.
export function intersectsObstacles(parts,obstacles,margin=3){
 const boxes=obstacles.filter(o=>o.isMesh).map(o=>new THREE.Box3().setFromObject(o).expandByScalar(margin));
 const triangle=new THREE.Triangle(),bounds=new THREE.Box3();let hit=false;
 for(const part of parts){part.traverse(mesh=>{if(hit||!mesh.geometry?.index)return;const geometry=mesh.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();bounds.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld);const candidates=boxes.filter(box=>box.intersectsBox(bounds));if(!candidates.length)return;const position=geometry.getAttribute('position'),indices=geometry.index.array;for(let i=0;i<indices.length;i+=3){triangle.a.fromBufferAttribute(position,indices[i]).applyMatrix4(mesh.matrixWorld);triangle.b.fromBufferAttribute(position,indices[i+1]).applyMatrix4(mesh.matrixWorld);triangle.c.fromBufferAttribute(position,indices[i+2]).applyMatrix4(mesh.matrixWorld);if(candidates.some(box=>box.intersectsTriangle(triangle))){hit=true;break;}}});if(hit)return true;}
 return false;
}

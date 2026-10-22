import * as THREE from 'three';

// Fit the full motion envelope to the camera, leaving room for view controls.
export function cameraFitDistance(bounds,direction,aspect,fovDegrees){
 const center=bounds.getCenter(new THREE.Vector3());
 const right=new THREE.Vector3(0,0,1).cross(direction).normalize();
 const up=direction.clone().cross(right).normalize();
 const vertical=Math.tan(THREE.MathUtils.degToRad(fovDegrees)/2)*.74;
 const horizontal=Math.tan(THREE.MathUtils.degToRad(fovDegrees)/2)*aspect*.9;
 let distance=0;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const p=new THREE.Vector3(x,y,z).sub(center),depth=p.dot(direction);
  distance=Math.max(distance,depth+Math.abs(p.dot(up))/vertical,depth+Math.abs(p.dot(right))/horizontal);
 }
 return distance;
}

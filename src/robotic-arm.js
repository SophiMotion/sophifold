import * as THREE from 'three';
import {calibrateArmPoint,calibrateArmDirection,ARM_REFERENCE_ROTATION} from './arm-calibration.js';

// Approximate pitch axes from the original arm's cylindrical CAD features.
// Mounting geometry remains in its original Fusion frame.
export const BASE_YAW=Object.freeze([0,403.876,104.654]);
const CARRIER_UPRIGHT=-Math.PI/2+Math.atan2(.05,.999);
const BASE_YAW_AXIS=new THREE.Vector3(0,.05,.999).normalize();
export const SHOULDER = Object.freeze(calibrateArmPoint([0,699.87,7.3]));
export const ELBOW = Object.freeze(calibrateArmPoint([0,815.2,18.8]));
export const WRIST = Object.freeze(calibrateArmPoint([0,839.8,151.5]));
export const GRIP_POINT = Object.freeze(calibrateArmPoint([-8,683,170]));
const JAW_PIVOT=new THREE.Vector3(...calibrateArmPoint([-22.3,753.7,146.5]));
const JAW_AXIS=new THREE.Vector3(...calibrateArmDirection([.01,-.143,-.99])).normalize();
const groups={mount:[93,94,96],base:[92],shoulder:[91],elbow:[89,90],gripper:[85,86,87,88]};
const vec=p=>new THREE.Vector3(...p);
function around(p,angle,axis=new THREE.Vector3(1,0,0)){
 return new THREE.Matrix4().makeTranslation(...p).multiply(new THREE.Matrix4().makeRotationAxis(axis,angle)).multiply(new THREE.Matrix4().makeTranslation(...p.map(n=>-n)));
}
export function armTransforms({yaw=0,shoulder=0,elbow=0,wrist=0}){
 const mount=new THREE.Matrix4(),base=around(BASE_YAW,yaw,BASE_YAW_AXIS),a=base.clone().multiply(around(SHOULDER,shoulder)),b=a.clone().multiply(around(ELBOW,elbow)),c=b.clone().multiply(around(WRIST,wrist));
 return {mount,base,shoulder:a,elbow:b,gripper:c};
}
export function solveArmIK(target,carrierAngle=CARRIER_UPRIGHT){
 if(!target?.every(Number.isFinite))throw new TypeError('Invalid arm target');
 const aligned=vec(target).sub(vec(BASE_YAW)).applyAxisAngle(new THREE.Vector3(1,0,0),Math.atan2(.05,.999));
 const radius=Math.hypot(aligned.x,aligned.y),side=GRIP_POINT[0]-BASE_YAW[0];if(radius<Math.abs(side))return {reachable:false};
 const yaw=Math.atan2(aligned.x,-aligned.y)-Math.asin(side/radius);
 const localTarget=vec(target).applyMatrix4(around(BASE_YAW,yaw,BASE_YAW_AXIS).invert()).toArray();
 const desiredRotation=-ARM_REFERENCE_ROTATION-carrierAngle;const offset=vec(GRIP_POINT).sub(vec(WRIST)).applyAxisAngle(new THREE.Vector3(1,0,0),desiredRotation),wrist=vec(localTarget).sub(offset),d=wrist.sub(vec(SHOULDER));
 const l1=Math.hypot(ELBOW[1]-SHOULDER[1],ELBOW[2]-SHOULDER[2]),l2=Math.hypot(WRIST[1]-ELBOW[1],WRIST[2]-ELBOW[2]);
 const cosine=(d.y*d.y+d.z*d.z-l1*l1-l2*l2)/(2*l1*l2);
 if(cosine<-1-1e-8||cosine>1+1e-8||Math.abs(localTarget[0]-GRIP_POINT[0])>1)return {reachable:false};
 const bend=-Math.acos(THREE.MathUtils.clamp(cosine,-1,1));
 const theta1=Math.atan2(d.y,d.z)-Math.atan2(l2*Math.sin(bend),l1+l2*Math.cos(bend));
 const original1=Math.atan2(ELBOW[1]-SHOULDER[1],ELBOW[2]-SHOULDER[2]);
 const original2=Math.atan2(WRIST[1]-ELBOW[1],WRIST[2]-ELBOW[2]);
 const shoulder=original1-theta1,elbow=original2-original1-bend;
 return {reachable:true,angles:{yaw,shoulder,elbow,wrist:desiredRotation-shoulder-elbow}};
}

export function createRoboticArm(parts,carrier,descriptor){
 const actuator=parts[95],original=actuator.geometry,sourceIndex=original.index.array;
 const attributePosition=original.getAttribute('position'),attributeNormal=original.getAttribute('normal');
 const merged=new Map();
 for(const piece of descriptor.segments){let m=merged.get(piece.segment);if(!m){m={ranges:[],bounds:new THREE.Box3()};merged.set(piece.segment,m);}m.ranges.push(...piece.ranges);m.bounds.union(new THREE.Box3(vec(piece.bounds.slice(0,3)),vec(piece.bounds.slice(3))));}
 const motors=[];
 for(const [segment,description] of merged){
  const size=description.ranges.reduce((n,r)=>n+r.count,0),index=new Uint32Array(size);let cursor=0;
  for(const range of description.ranges){index.set(sourceIndex.subarray(range.start,range.start+range.count),cursor);cursor+=range.count;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',attributePosition);if(attributeNormal)geo.setAttribute('normal',attributeNormal);geo.setIndex(new THREE.BufferAttribute(index,1));geo.boundingBox=description.bounds;geo.boundingSphere=description.bounds.getBoundingSphere(new THREE.Sphere());
  const mesh=new THREE.Mesh(geo,actuator.userData.baseMaterial);mesh.userData={id:95,segment,baseMaterial:actuator.userData.baseMaterial};mesh.matrixAutoUpdate=false;actuator.add(mesh);motors.push(mesh);
 }
 actuator.geometry=new THREE.BufferGeometry();original.dispose();
 const anchor=new THREE.Object3D();anchor.name='Gripper grasp point';anchor.matrixAutoUpdate=false;carrier.add(anchor);
 let angles={yaw:0,shoulder:0,elbow:0,wrist:0},jaw=0;
 function apply(next=angles,opening=jaw){
  angles={...next};jaw=opening;const transforms=armTransforms(angles);
  for(const [segment,ids] of Object.entries(groups))for(const id of ids){const part=parts[id];part.matrixAutoUpdate=false;part.matrix.copy(transforms[segment]);}
  // The driven jaw opens before approaching, then closes around the demo cube.
  parts[87].matrix.copy(transforms.gripper).multiply(around(JAW_PIVOT.toArray(),THREE.MathUtils.degToRad(jaw),JAW_AXIS));
  for(const motor of motors)motor.matrix.copy(transforms[motor.userData.segment]);
  anchor.matrix.copy(transforms.gripper).multiply(new THREE.Matrix4().makeTranslation(...GRIP_POINT));
  return angles;
 }
 apply();
 return {anchor,motors,get angles(){return {...angles}},get jaw(){return jaw},apply,reset(){apply({shoulder:0,elbow:0,wrist:0},0);}};
}

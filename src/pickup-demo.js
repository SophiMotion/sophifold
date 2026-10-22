import * as THREE from 'three';
import {solveArmIK} from './robotic-arm.js';
import {foldPose} from './folding.js';
const smooth=t=>t*t*(3-2*t);
const mixAngles=(a,b,t)=>Object.fromEntries(['yaw','shoulder','elbow','wrist'].map(k=>[k,(a[k]??0)+((b[k]??0)-(a[k]??0))*t]));
const compact=foldPose(1).toolTranslation,upright=foldPose(0).toolTranslation;
// Keep the same reachable arm-local target, translated to the full-height carrier.
export const CUBE_HOME=Object.freeze([300,110,314+upright[1]-compact[1]]);
export const PLACE_POINT=Object.freeze([CUBE_HOME[0],-110,CUBE_HOME[2]]);
export const TABLE_TOP=CUBE_HOME[2]-14;
export const DRIVE_START=-320;

export class PickupDemo {
 constructor(viewer){
  this.viewer=viewer;this.state='ready';this.elapsed=0;this.looping=false;this.loopPaused=false;this.group=new THREE.Group();this.group.name='Pickup demonstration';viewer.scene.add(this.group);
  const metal=new THREE.MeshStandardMaterial({color:0x526579,roughness:.65,metalness:.2});
  const addBox=(size,pos,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...pos);this.group.add(m);return m;};
  const blue=new THREE.MeshStandardMaterial({color:0x0057ff,roughness:.5});
  for(const [index,point] of [CUBE_HOME,PLACE_POINT].entries()){
   addBox([110,72,8],[point[0],point[1],TABLE_TOP-4],metal);
   for(const x of [point[0]-46,point[0]+46])for(const y of [point[1]-29,point[1]+29])addBox([7,7,TABLE_TOP-8],[x,y,(TABLE_TOP-8)/2],metal);
   addBox([110,4,10],[point[0],point[1]-36,TABLE_TOP-5],blue);
  }
  this.sourcePoint=CUBE_HOME;this.destinationPoint=PLACE_POINT;
  this.cube=addBox([28,28,28],CUBE_HOME,new THREE.MeshStandardMaterial({color:0xff8f35,roughness:.35,metalness:.06}));
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(this.cube.geometry),new THREE.LineBasicMaterial({color:0x9c4310}));this.cube.add(edge);
  this.viewer.armRig.apply(this.parkAngles(),24);this.viewer.model.position.x=DRIVE_START;
 }
 get active(){return !['ready','holding','complete','unreachable','blocked'].includes(this.state)}
 notify(){this.viewer.dispatchEvent(new Event('pickupchange'));}
 phase(state){this.state=state;this.elapsed=0;this.notify();}
 reset(preserveLoop=false){if(!preserveLoop)this.stopLoop();this.group.attach(this.cube);this.cube.position.fromArray(CUBE_HOME);this.cube.quaternion.identity();this.viewer.armRig.apply(this.parkAngles(),24);this.viewer.model.position.x=DRIVE_START;this.viewer.model.updateMatrixWorld(true);this.sourcePoint=CUBE_HOME;this.destinationPoint=PLACE_POINT;this.phase('ready');}
 startPick(internal=false){if(this.active||this.state==='holding')return;if(!internal)this.stopLoop();const position=this.cube.getWorldPosition(new THREE.Vector3());this.sourcePoint=position.distanceTo(new THREE.Vector3(...CUBE_HOME))<position.distanceTo(new THREE.Vector3(...PLACE_POINT))?CUBE_HOME:PLACE_POINT;this.destinationPoint=this.sourcePoint===CUBE_HOME?PLACE_POINT:CUBE_HOME;if(Math.abs(this.viewer.model.position.x)>.01)this.drive('driving',0,2.5);else this.parkForPickup();}
 parkForPickup(){this.viewer.armRig.apply(this.viewer.armRig.angles,24);this.fromAngles=this.viewer.armRig.angles;this.toAngles=this.parkAngles();this.duration=1.4;this.phase('parking');}
 drive(state,to,duration){this.driveFrom=this.viewer.model.position.x;this.driveTo=to;this.duration=duration;this.phase(state);}
 startPlace(){if(this.state!=='holding')return;this.phase('preparingPlace');this.viewer.animateFold(0,true);}
 onManualJoint(){const x=this.viewer.model.position.x;this.reset();this.viewer.model.position.x=x;this.viewer.model.updateMatrixWorld(true);}
 startLoop(){this.reset();this.viewer.foldPlayback.seek(1);this.viewer.foldRig.setProgress?.(1);this.viewer.model.updateMatrixWorld(true);this.viewer.updatePoseBounds();this.looping=true;this.phase('cycleWaiting');}
 stopLoop(){this.viewer.foldPlayback.playing=false;this.looping=false;this.loopPaused=false;this.resumeFolding=false;}
 toggleLoop(){if(!this.looping){this.startLoop();return;}this.loopPaused=!this.loopPaused;if(this.loopPaused){this.resumeFolding=this.viewer.foldPlayback.playing;this.viewer.foldPlayback.playing=false;}else if(this.resumeFolding){this.viewer.foldPlayback.playing=true;this.resumeFolding=false;}this.viewer.dispatchFoldState?.();this.notify();}
 localTarget(world){this.viewer.model.updateMatrixWorld(true);return this.viewer.foldRig.tool.worldToLocal(world.clone()).toArray();}
 solve(world){const result=solveArmIK(this.localTarget(world),this.viewer.foldRig.pose?.angle??foldPose(0).angle);if(!result.reachable){this.phase('unreachable');return null;}return result.angles;}
 parkAngles(){return {yaw:0,shoulder:0,elbow:0,wrist:0};}
 transition(state,target,duration){const goal=this.solve(target);if(!goal)return;this.fromPoint=this.gripWorld();this.toPoint=target.clone();this.fromAngles=this.viewer.armRig.angles;this.toAngles=goal;this.duration=duration;this.phase(state);}
 gripWorld(){this.viewer.model.updateMatrixWorld(true);return this.viewer.armRig.anchor.getWorldPosition(new THREE.Vector3());}
 apply(angles,jaw){this.viewer.armRig.apply(angles,jaw);this.viewer.model.updateMatrixWorld(true);this.viewer.updatePoseBounds();}
 update(dt){
  if(this.loopPaused)return;
  if(this.state==='driving'||this.state==='returningHome'){this.elapsed+=dt;const t=Math.min(1,this.elapsed/this.duration);this.viewer.model.position.x=this.driveFrom+(this.driveTo-this.driveFrom)*smooth(t);this.viewer.model.updateMatrixWorld(true);this.viewer.updatePoseBounds();if(t===1){if(this.state==='driving')this.parkForPickup();else this.phase('cycleWaiting');}return;}
  if(this.looping){
   if(this.state==='holding'){this.elapsed+=dt;if(this.elapsed>=1)this.startPlace();return;}
   if(this.state==='complete'){this.phase('cycleFolding');this.viewer.animateFold(1,true);return;}
   if(this.state==='cycleFolding'){if(!this.viewer.foldPlayback.playing)this.drive('returningHome',DRIVE_START,2.5);return;}
   if(this.state==='cycleWaiting'){this.elapsed+=dt;if(this.elapsed>=1){this.phase('ready');this.startPick(true);}return;}
   if(this.state==='unreachable'){this.stopLoop();this.notify();return;}
  }
  if(!this.active)return;
  const arm=this.viewer.armRig;
  if(this.state==='preparing'||this.state==='preparingPlace'){
   if(this.viewer.foldPlayback.playing)return;
   const joints=this.viewer.foldPlayback.getAngles();if(Math.abs(joints.base)>.01||Math.abs(joints.upper)>.01){this.phase('ready');return;}
   const target=new THREE.Vector3(...(this.state==='preparing'?this.sourcePoint:this.destinationPoint));target.z+=70;
   this.transition(this.state==='preparing'?'reaching':'returning',target,1.5);return;
  }
  this.elapsed+=dt;
  const duration=this.duration||1,t=Math.min(1,this.elapsed/duration),s=smooth(t);
  if(['returning','lowering','placing','lifting','retreating','retracting'].includes(this.state)){const point=this.fromPoint.clone().lerp(this.toPoint,s),angles=this.solve(point);if(!angles)return;this.apply(angles,['lifting','returning','placing'].includes(this.state)?10:24);}
  else if(['parking','stowing','reaching'].includes(this.state))this.apply(mixAngles(this.fromAngles,this.toAngles,s),24);
  else if(this.state==='gripping')this.apply(arm.angles,24+(10-24)*s);
  else if(this.state==='releasing')this.apply(arm.angles,10+(24-10)*s);
  if(t<1)return;
  if(this.state==='parking'){this.phase('preparing');this.viewer.animateFold(0,true);}
  else if(this.state==='reaching'||this.state==='returning'){this.transition(this.state==='reaching'?'lowering':'placing',new THREE.Vector3(...(this.state==='reaching'?this.sourcePoint:this.destinationPoint)),1.1);}
  else if(this.state==='lowering'){
   if(this.gripWorld().distanceTo(this.cube.getWorldPosition(new THREE.Vector3()))>.1){this.phase('unreachable');return;}
   this.duration=.75;this.phase('gripping');
  }else if(this.state==='gripping'){
   this.viewer.armRig.anchor.attach(this.cube);
   const target=new THREE.Vector3(...this.sourcePoint);target.z+=70;this.transition('lifting',target,1.5);
  }else if(this.state==='lifting')this.phase('holding');
  else if(this.state==='placing'){
   // Detach at contact, preserving the world transform; the cube now rests on the table.
   this.group.attach(this.cube);this.duration=.75;this.phase('releasing');}
  else if(this.state==='releasing'){
   const target=new THREE.Vector3(...this.destinationPoint);target.z+=70;this.transition('retreating',target,1.3);
  }else if(this.state==='retreating'){const target=new THREE.Vector3(CUBE_HOME[0]-70,0,CUBE_HOME[2]+90);this.transition('retracting',target,1.4);}
  else if(this.state==='retracting'){this.fromAngles=arm.angles;this.toAngles=this.parkAngles();this.duration=1.8;this.phase('stowing');}
  else if(this.state==='stowing')this.phase('complete');
 }
 dispose(){this.group.attach(this.cube);this.group.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});this.group.removeFromParent();}
}

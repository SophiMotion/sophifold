import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {foldPose,createFoldRig,BASE_PIVOT,FOLD_PIVOT,TOOL_PIVOT,FoldPlayback} from '../src/folding.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const vectorNear=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
const rotateX=(v,a)=>[v[0],v[1]*Math.cos(a)-v[2]*Math.sin(a),v[1]*Math.sin(a)+v[2]*Math.cos(a)];
test('fully unfolded endpoint places both folding links vertically upright',()=>{
 const p=foldPose(0);near(p.lowerAngle,Math.PI/2);
 const lowerLink=rotateX([0,0,-265.5],p.lowerAngle);near(lowerLink[2],0);assert.ok(lowerLink[1]>265);
 const upperLink=p.toolPivot.map((v,i)=>v-p.elbowPivot[i]);near(upperLink[2],0);assert.ok(upperLink[1]>265);
 assert.ok(p.toolPivot[1]>850,'Upper mount rises above the old partially unfolded position');
});
test('both joint angles change continuously between upright and compact poses',()=>{
 const open=foldPose(0),middle=foldPose(.5),closed=foldPose(1);
 assert.ok(open.lowerAngle>middle.lowerAngle&&middle.lowerAngle>closed.lowerAngle);
 assert.ok(open.upperAngle<middle.upperAngle&&middle.upperAngle<closed.upperAngle);
 near(closed.lowerAngle,0);near(closed.toolPivot[1],closed.elbowPivot[1]);vectorNear(closed.elbowPivot,FOLD_PIVOT);
});
test('both rigid link lengths stay constant across the entire travel',()=>{
 const distance=(a,b)=>new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));
 for(let i=0;i<=100;i++) {const p=foldPose(i/100);near(distance(p.elbowPivot,BASE_PIVOT),distance(FOLD_PIVOT,BASE_PIVOT));near(distance(p.toolPivot,p.elbowPivot),distance(TOOL_PIVOT,FOLD_PIVOT));}
});
test('progress is bounded and rejects non-finite values',()=>{
 assert.deepEqual(foldPose(-1),foldPose(0));assert.deepEqual(foldPose(2),foldPose(1));assert.throws(()=>foldPose(NaN));assert.throws(()=>foldPose(Infinity));
});
test('nested rig keeps both hinges attached, the Fusion mount aligned, and the chassis fixed',()=>{
 const model=new THREE.Group();model.rotation.z=.7;
 const parts=Array.from({length:98},(_,id)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));m.userData.id=id;model.add(m);return m;});
 const before=parts.map(m=>m.getWorldPosition(new THREE.Vector3()).clone());
 const rig=createFoldRig(model,parts);
 for(const progress of [0,.25,.5,.75,1,.4,0]){
  rig.setProgress(progress);model.updateMatrixWorld(true);const pose=foldPose(progress);
  for(const id of [29,46,62,63,64,65,66,67,68,97])vectorNear(parts[id].getWorldPosition(new THREE.Vector3()).toArray(),before[id].toArray());
  const actualElbow=rig.lower.localToWorld(new THREE.Vector3(...FOLD_PIVOT).sub(new THREE.Vector3(...BASE_PIVOT)));
  const expectedElbow=model.localToWorld(new THREE.Vector3(...pose.elbowPivot));near(actualElbow.distanceTo(expectedElbow),0);
  const actualTool=rig.upper.localToWorld(new THREE.Vector3(...TOOL_PIVOT).sub(new THREE.Vector3(...FOLD_PIVOT)));
  const carriedTool=model.localToWorld(new THREE.Vector3(...pose.toolPivot));near(actualTool.distanceTo(carriedTool),0);
  assert.equal(parts[75].parent,rig.lower);assert.equal(parts[78].parent,rig.lower);assert.equal(parts[77].parent,rig.upper);assert.equal(rig.upper.parent,rig.lower);assert.equal(parts[95].parent,rig.tool);
  const q=parts[95].getWorldQuaternion(new THREE.Quaternion());const expected=model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),pose.angle));near(q.angleTo(expected),0);const point=new THREE.Vector3(0,400.096,33.261);near(rig.tool.localToWorld(point.clone()).distanceTo(rig.upper.localToWorld(point.clone().sub(new THREE.Vector3(...FOLD_PIVOT)))) ,0);
 }
});
test('playback pauses, resumes, reverses in place and completes at exact endpoints',()=>{
 const p=new FoldPlayback();p.seek(0);p.animateTo(1);p.advance(1);assert.ok(p.progress>0&&p.progress<1);p.toggle();const paused=p.progress;p.advance(8);near(p.progress,paused);p.toggle();p.advance(20);near(p.progress,1);assert.equal(p.playing,false);p.toggle();p.advance(1);assert.ok(p.progress<1);const before=p.progress;p.animateTo(1);near(p.progress,before);p.advance(20);near(p.progress,1);p.seek(.3);assert.equal(p.playing,false);p.animateTo(0);p.advance(20);near(p.progress,0);
});
test('initial pose is compact with both joints folded and playback stopped',()=>{
 const p=new FoldPlayback();assert.equal(p.progress,1);assert.deepEqual(p.getAngles(),{base:90,upper:180});assert.equal(p.playing,false);p.toggle();p.advance(20);assert.deepEqual(p.getAngles(),{base:0,upper:0});
});
import {measureMotionEnvelope} from '../src/folding.js';
test('camera envelope contains folded, upright and intermediate poses and restores the start pose',()=>{
 const model=new THREE.Group();
 const parts=Array.from({length:98},(_,id)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(20,80,150));m.userData.id=id;model.add(m);return m;});
 const rig=createFoldRig(model,parts),envelope=measureMotionEnvelope(model,rig);
 for(const p of [0,.2,.5,.8,1]){rig.setProgress(p);model.updateMatrixWorld(true);assert.ok(envelope.containsBox(new THREE.Box3().setFromObject(model)));}
 measureMotionEnvelope(model,rig);near(rig.lower.rotation.x,Math.PI/2);
});

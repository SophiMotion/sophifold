import test from 'node:test';
import assert from 'node:assert/strict';
import {AssemblyViewer} from '../src/viewer.js';
import {FoldPlayback} from '../src/folding.js';
const fakeViewer=()=>({foldRig:{},foldPlayback:new FoldPlayback(),controls:{autoRotate:true},cancelled:0,pickupDemo:{onManualJoint(){this.owner.cancelled++;}},setFoldProgress:AssemblyViewer.prototype.setFoldProgress,applyFoldPose(){},dispatchFoldState(){}});
test('internal reduced-motion folding preserves pickup workflow',()=>{
 const v=fakeViewer();v.pickupDemo.owner=v;const previous=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:true});
 try{AssemblyViewer.prototype.animateFold.call(v,0,true);assert.equal(v.cancelled,0);assert.equal(v.foldPlayback.progress,0);AssemblyViewer.prototype.animateFold.call(v,1);assert.equal(v.cancelled,1);}finally{globalThis.matchMedia=previous;}
});
test('manual playback cancels an active pickup before moving folding joints',()=>{
 const v=fakeViewer();v.pickupDemo.owner=v;AssemblyViewer.prototype.toggleFoldPlayback.call(v);assert.equal(v.cancelled,1);assert.equal(v.foldPlayback.playing,true);
});


test('speed changes scale folding and arm playback together without resetting the pose',()=>{for(const speed of [1,1.5,2]){const v={foldRig:{},animationSpeed:1,foldPlayback:{advance(dt){v.foldElapsed=dt;return true;}},pickupDemo:{update(dt){v.armElapsed=dt;}},applyFoldPose(){v.applied=true;}};AssemblyViewer.prototype.setAnimationSpeed.call(v,speed);AssemblyViewer.prototype.advanceMotion.call(v,.02);assert.equal(v.foldElapsed,.02*speed);assert.equal(v.armElapsed,.02*speed);assert.equal(v.applied,true);}assert.throws(()=>AssemblyViewer.prototype.setAnimationSpeed.call({},3));});

test('manual collision rejection restores both last-safe joint angles and stops playback',()=>{const v={loaded:true,foldPlayback:new FoldPlayback(),pickupDemo:{onManualJoint(){},stopLoop(){},phase(state){v.phase=state;}},applyFoldPose(){},hasTableCollision(){return true;},rejectPose:AssemblyViewer.prototype.rejectPose};const before=v.foldPlayback.getAngles();AssemblyViewer.prototype.setJointAngle.call(v,'base',0);assert.deepEqual(v.foldPlayback.getAngles(),before);assert.equal(v.foldPlayback.playing,false);assert.equal(v.phase,'blocked');});

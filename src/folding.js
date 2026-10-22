import * as THREE from 'three';

// Measured hinge axes in the original Fusion frame: Y up, shafts parallel to X.
export const BASE_PIVOT = Object.freeze([0, 328.45, 0]);
export const FOLD_PIVOT = Object.freeze([0, 383.45, -264.8]);
export const TOOL_PIVOT = Object.freeze([0,396.72480640042926,0.3679963684283507]);
export const FOLD_ANGLE = Math.atan2(TOOL_PIVOT[1]-FOLD_PIVOT[1], TOOL_PIVOT[2]-FOLD_PIVOT[2]);
const lowerPartIds = new Set([69,70,71,72,73,74,75,76,78,79,80,83,84]);
const upperPartIds = new Set([77,81,82,98]);
const toolPartIds = new Set(Array.from({length:12},(_,i)=>85+i));
const clamp = value => Math.min(1,Math.max(0,value));
const rotateX=([x,y,z],a)=>[x,y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];
const subtract=(a,b)=>a.map((n,i)=>n-b[i]);
const add=(a,b)=>a.map((n,i)=>n+b[i]);

export function poseFromJointAngles(baseTilt,upperBend) {
 if(!Number.isFinite(baseTilt)||!Number.isFinite(upperBend))throw new TypeError('Joint angles must be finite');
 const lowerAngle=THREE.MathUtils.degToRad(90-baseTilt);
 const upperAngle=FOLD_ANGLE-Math.PI+THREE.MathUtils.degToRad(upperBend);
 const angle=lowerAngle+upperAngle;
 const elbowPivot=add(BASE_PIVOT,rotateX(subtract(FOLD_PIVOT,BASE_PIVOT),lowerAngle));
 const toolPivot=add(elbowPivot,rotateX(subtract(TOOL_PIVOT,FOLD_PIVOT),angle));
 return {baseTilt,upperBend,lowerAngle,upperAngle,angle,elbowPivot,toolPivot,toolTranslation:subtract(toolPivot,TOOL_PIVOT)};
}
export function foldPose(progress) {
 if(!Number.isFinite(progress))throw new TypeError('Fold progress must be finite');
 const p=clamp(progress),eased=p*p*(3-2*p);
 // Reference clip: base leads slightly while the upper shell opens through a Z pose.
 const opening=1-eased,lead=p===0||p===1?0:Math.sin(Math.PI*opening);
 return {...poseFromJointAngles(90*(eased-.08*lead),180*(eased+.10*lead)),progress:p};
}

export function carrierMatrix(pose){return new THREE.Matrix4().makeTranslation(...pose.toolPivot).multiply(new THREE.Matrix4().makeRotationX(pose.angle)).multiply(new THREE.Matrix4().makeTranslation(...TOOL_PIVOT.map(v=>-v)));}

export function createFoldRig(model,parts) {
  const lower=new THREE.Group();lower.name='Base folding hinge';lower.position.fromArray(BASE_PIVOT);model.add(lower);
  const upper=new THREE.Group();upper.name='Upper folding hinge';upper.position.fromArray(subtract(FOLD_PIVOT,BASE_PIVOT));lower.add(upper);
  const tool=new THREE.Group();tool.name='CAD-aligned arm carrier';tool.matrixAutoUpdate=false;model.add(tool);
  for (const part of parts) {
    const id=part.userData.id;
    if (lowerPartIds.has(id)) {lower.add(part);part.position.fromArray(BASE_PIVOT).negate();}
    else if (upperPartIds.has(id)) {upper.add(part);part.position.fromArray(FOLD_PIVOT).negate();}
    else if (toolPartIds.has(id)) tool.add(part);
  }
  let currentPose=foldPose(1);
  const apply=pose=>{currentPose=pose;lower.rotation.x=pose.lowerAngle;upper.rotation.x=pose.upperAngle;tool.matrix.copy(carrierMatrix(pose));return pose;};
  return {lower,upper,tool,get pose(){return currentPose;},setAngles(base,upperAngle){return apply(poseFromJointAngles(base,upperAngle));},setProgress(progress){return apply(foldPose(progress));}};
}

export class FoldPlayback {
 constructor(){this.progress=1;this.target=0;this.playing=false;this.duration=10;this.manual=false;this.jointAngles=null;this.transition=null;}
 getAngles(){if(this.jointAngles)return {...this.jointAngles};const pose=foldPose(this.progress);return {base:pose.baseTilt,upper:pose.upperBend};}
 setJoint(joint,value){if(!['base','upper'].includes(joint)||!Number.isFinite(value))throw new TypeError('Invalid joint angle');const angles=this.getAngles();angles[joint]=Math.max(0,Math.min(joint==='base'?90:180,value));this.jointAngles=angles;this.manual=true;this.playing=false;this.transition=null;}
 seek(value){if(!Number.isFinite(value))throw new TypeError('Fold progress must be finite');this.progress=clamp(value);this.playing=false;this.manual=false;this.jointAngles=null;this.transition=null;}
 animateTo(target){if(!Number.isFinite(target))throw new TypeError('Invalid fold target');this.target=clamp(target);if(this.jointAngles){const end=foldPose(this.target);this.transition={from:this.getAngles(),to:{base:end.baseTilt,upper:end.upperBend},elapsed:0,fromProgress:this.progress};this.manual=false;this.playing=true;}else this.playing=Math.abs(this.target-this.progress)>1e-8;}
 toggle(){if(this.playing){this.playing=false;return;}if(this.transition){this.playing=true;return;}if(this.manual){this.animateTo(this.target);return;}if(Math.abs(this.target-this.progress)<1e-8)this.target=this.progress>=.5?0:1;this.playing=true;}
 advance(seconds){
  if(!this.playing)return false;if(!Number.isFinite(seconds)||seconds<0)throw new TypeError('Invalid elapsed time');
  if(this.transition){const tr=this.transition;tr.elapsed+=seconds;const t=Math.min(1,tr.elapsed/this.duration),s=t*t*(3-2*t);this.jointAngles={base:tr.from.base+(tr.to.base-tr.from.base)*s,upper:tr.from.upper+(tr.to.upper-tr.from.upper)*s};this.progress=tr.fromProgress+(this.target-tr.fromProgress)*t;if(t===1){this.progress=this.target;this.transition=null;this.jointAngles=null;this.playing=false;}return true;}
  const direction=Math.sign(this.target-this.progress),step=seconds/this.duration;this.progress+=direction*Math.min(step,Math.abs(this.target-this.progress));if(Math.abs(this.progress-this.target)<1e-8){this.progress=this.target;this.playing=false;}return true;
 }
}

// Fit once to the whole motion envelope; avoid camera jumps during playback.
export function measureMotionEnvelope(model,rig,restoreProgress=0) {
  const envelope=new THREE.Box3();
  for(let step=0;step<=20;step++){
    rig.setProgress(step/20);model.updateMatrixWorld(true);
    envelope.union(new THREE.Box3().setFromObject(model));
  }
  rig.setProgress(restoreProgress);model.updateMatrixWorld(true);
  return envelope;
}

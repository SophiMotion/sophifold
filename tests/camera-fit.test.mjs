import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {cameraFitDistance} from '../src/camera-fit.js';
test('preset framing keeps every envelope corner in view at desktop and phone aspect ratios',()=>{
 const box=new T.Box3(new T.Vector3(-600,-250,0),new T.Vector3(400,250,1250));
 for(const aspect of [.65,1,2.7])for(const v of [[1,-1.6,1.05],[0,-1,.12],[1,0,.12],[0,-.001,1]]){
  const dir=new T.Vector3(...v).normalize(),distance=cameraFitDistance(box,dir,aspect,34),center=box.getCenter(new T.Vector3());
  const camera=new T.PerspectiveCamera(34,aspect,1,20000);camera.up.set(0,0,1);camera.position.copy(center).addScaledVector(dir,distance);camera.lookAt(center);camera.updateMatrixWorld();
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(p.x)<=.901&&Math.abs(p.y)<=.741);}
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {alignBoundsToX,dimensions,displayPosition,isDefaultVisible} from '../src/model-data.js';

test('video alignment maps Fusion Y up to Z, and chassis Z length to X',()=>{
 const original=[-210,3,-293,210,854,292];
 assert.deepEqual(alignBoundsToX(original),[-293,-210,3,292,210,854]);
 assert.deepEqual(dimensions(alignBoundsToX(original)),[585,420,851]);
 assert.deepEqual(displayPosition([10,20,30]),[30,10,20]);
 assert.deepEqual(original,[-210,3,-293,210,854,292]);
});
test('only the eight detached motor screws are hidden in the default presentation',()=>{
 assert.deepEqual(Array.from({length:98},(_,id)=>id).filter(id=>!isDefaultVisible(id)),[32,33,34,35,38,39,40,41]);
 for(const id of [15,16,17,18,21,22,23,24,51,52,53,54,55,56])assert.equal(isDefaultVisible(id),true);
});

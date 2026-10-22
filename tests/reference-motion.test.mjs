import test from 'node:test';
import assert from 'node:assert/strict';
import {FoldPlayback,foldPose} from '../src/folding.js';
import {CUBE_HOME,TABLE_TOP} from '../src/pickup-demo.js';

test('reference unfolding takes ten seconds and passes through an open Z pose',()=>{
 const c=new FoldPlayback();c.animateTo(0);c.advance(5);assert.equal(c.playing,true);const a=c.getAngles();assert.ok(a.base>25&&a.base<50);assert.ok(a.upper>80&&a.upper<130);c.advance(5);assert.deepEqual(c.getAngles(),{base:0,upper:0});
});
test('pickup platform is raised to the upright arm workspace',()=>{
 assert.ok(TABLE_TOP>750);assert.equal(CUBE_HOME[2],TABLE_TOP+14);const delta=foldPose(0).toolTranslation;assert.ok(delta[1]>450);
});

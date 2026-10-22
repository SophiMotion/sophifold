import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {componentGroups,componentGroup,componentLabel,matchingComponents} from '../src/component-catalog.js';
const meshes=JSON.parse(fs.readFileSync('public/assets/v3-model.json')).meshes;
const t=key=>({'group_arm':'Robotic arm','part_lowerShell':'Lower folding shell','group_fasteners':'Fasteners'}[key]||key);
test('every supplied component belongs to one group, with screws and electronics separated from moving shells',()=>{
 assert.equal(meshes.length,99);
 for(const p of meshes)assert.ok(componentGroups.includes(componentGroup(p)));
 assert.equal(componentGroup(meshes[15]),'fasteners');assert.equal(componentGroup(meshes[51]),'fasteners');
 assert.equal(componentGroup(meshes[71]),'electronics');assert.equal(componentGroup(meshes[75]),'folding');
 assert.equal(componentGroup(meshes[96]),'arm');assert.equal(componentGroup(meshes[98]),'folding');
});
test('component search accepts readable labels, original CAD names and group names',()=>{
 assert.equal(componentLabel(meshes[75],t),'Lower folding shell · 76');
 assert.ok(matchingComponents(meshes,'lower folding',t).some(p=>p.id===75));
 assert.ok(matchingComponents(meshes,'COMPOUND',t).some(p=>p.id===95));
 assert.equal(matchingComponents(meshes,'robotic arm',t).length,12);
 assert.equal(matchingComponents(meshes,'',t).length,99);
});

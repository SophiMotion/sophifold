import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMesh,dimensions,filterComponents} from '../src/model-data.js';
test('CAD buffer rejects out-of-bounds and misaligned geometry',()=>{assert.throws(()=>decodeMesh({position:{offset:2,length:9},index:{offset:0,length:3}},new ArrayBuffer(16)));});
test('millimeter bounds preserve physical dimensions',()=>{assert.deepEqual(dimensions([-10,-20,5,90,180,305]),[100,200,300]);});
test('component names are searchable without case sensitivity',()=>{assert.equal(filterComponents([{name:'Motor mount'},{name:'Lid top'}],'MOTOR').length,1);});
test('CAD arrays share original binary storage',()=>{const b=new ArrayBuffer(84);const m=decodeMesh({position:{offset:0,length:9},normal:{offset:36,length:9},index:{offset:72,length:3}},b);assert.equal(m.position.buffer,b);assert.equal(m.index.length,3);});

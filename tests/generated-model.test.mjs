import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMesh} from '../src/model-data.js';
const meta=JSON.parse(fs.readFileSync('public/assets/v3-model.json','utf8'));const bytes=fs.readFileSync('public/assets/v3-mesh.bin');const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
test('real V3 conversion contains valid triangles and millimeter bounds',()=>{assert.ok(meta.triangles>10000,'Actual CAD must produce substantial surface geometry');assert.ok(meta.meshes.length>50);assert.ok(meta.bounds.every(Number.isFinite));assert.equal(meta.meshBytes,buffer.byteLength);for(let i=0;i<3;i++)assert.ok(meta.bounds[i+3]>meta.bounds[i]);});
test('every generated component has finite coordinates and valid triangle indices',()=>{for(const m of meta.meshes){const d=decodeMesh(m,buffer);assert.ok(d.position.length>0,m.name);assert.equal(d.position.length%3,0);assert.equal(d.index.length%3,0);for(const n of d.position)assert.ok(Number.isFinite(n));for(const i of d.index)assert.ok(i<d.position.length/3,`${m.name}: index ${i}`);}});


import zlib from 'node:zlib';
test('compressed download reproduces exact CAD binary',()=>{assert.deepEqual(zlib.gunzipSync(fs.readFileSync('public/assets/v3-mesh.bin.gz')),bytes);});

import fs from 'node:fs';
import {calibrateArmPoint} from '../src/arm-calibration.js';
const meta=JSON.parse(fs.readFileSync('public/assets/v3-model.json'));const bin=fs.readFileSync('public/assets/v3-mesh.bin');const part=meta.meshes[95];
const pos=new Float32Array(bin.buffer,bin.byteOffset+part.position.offset,part.position.length),index=new Uint32Array(bin.buffer,bin.byteOffset+part.index.offset,part.index.length),n=pos.length/3;
const parent=Int32Array.from({length:n},(_,i)=>i),rank=new Uint8Array(n);
function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i}
function union(a,b){a=find(a);b=find(b);if(a===b)return;if(rank[a]<rank[b])parent[a]=b;else{parent[b]=a;if(rank[a]===rank[b])rank[a]++}}
const weld=new Map();for(let i=0;i<n;i++){const key=[Math.round(pos[i*3]*1000),Math.round(pos[i*3+1]*1000),Math.round(pos[i*3+2]*1000)].join(',');if(weld.has(key))union(i,weld.get(key));else weld.set(key,i);}
for(let i=0;i<index.length;i+=3){union(index[i],index[i+1]);union(index[i],index[i+2]);}
const components=new Map();for(let i=0;i<index.length;i+=3){const root=find(index[i]);let c=components.get(root);if(!c){c={ranges:[],triangles:0,bounds:[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity]};components.set(root,c);}const last=c.ranges.at(-1);if(last&&last.start+last.count===i)last.count+=3;else c.ranges.push({start:i,count:3});c.triangles++;for(let k=0;k<3;k++){const v=index[i+k];for(let a=0;a<3;a++){const p=pos[v*3+a];c.bounds[a]=Math.min(c.bounds[a],p);c.bounds[a+3]=Math.max(c.bounds[a+3],p);}}}
const anchors=[{name:'mount',point:[0,670,-60]},{name:'base',point:[0,699.87,7.3]},{name:'shoulder',point:[0,815.2,18.8]},{name:'elbow',point:[0,839.8,151.5]},{name:'gripper',point:[0,780,161]}];
anchors.forEach(a=>a.point=calibrateArmPoint(a.point));
const segments=Array.from(components.values()).map(c=>{const center=c.bounds.slice(0,3).map((v,i)=>(v+c.bounds[i+3])/2);let closest=anchors[0],dist=Infinity;for(const a of anchors){const d=center.reduce((s,n,i)=>s+(n-a.point[i])**2,0);if(d<dist){dist=d;closest=a;}}return {...c,segment:closest.name};});
fs.writeFileSync('public/assets/arm-segments.json',JSON.stringify({sourcePart:95,sourceHash:meta.sha256,segments}));
console.log({components:segments.length,triangles:segments.reduce((s,c)=>s+c.triangles,0),ranges:segments.reduce((s,c)=>s+c.ranges.length,0),groups:Object.fromEntries(['base','shoulder','elbow','gripper'].map(s=>[s,segments.filter(c=>c.segment===s).reduce((a,c)=>a+c.triangles,0)]))});

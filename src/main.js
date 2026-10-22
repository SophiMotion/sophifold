import './style.css';
import {openingPercent,openingAngles,internalJointAngle} from './motion-display.js';
import {CUBE_HOME} from './pickup-demo.js';
import {AssemblyViewer} from './viewer.js';
import {filterComponents,isScrewComponent} from './model-data.js';
import {t,initLanguage} from './i18n.js';

const $=selector=>document.querySelector(selector);
let viewer,meta,selectedId=null,loadState='loading',theme='system',screwFolderOpen=false;
try{theme=localStorage.getItem('sv3-theme')||'system'}catch{}
$('#theme').value=theme;
const media=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){document.documentElement.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;viewer?.setTheme();}
$('#theme').onchange=e=>{theme=e.target.value;try{localStorage.setItem('sv3-theme',theme)}catch{}applyTheme();};
media.addEventListener('change',applyTheme);applyTheme();

function createPartRow(part){
 const row=document.createElement('div');row.className='component-row'+(part.id===selectedId?' selected':'');row.dataset.id=part.id;
 const check=document.createElement('input');check.type='checkbox';check.checked=viewer.parts[part.id]?.visible??true;
 check.setAttribute('aria-label',`${t('show')} ${part.name}`);check.onchange=()=>viewer.setVisible(part.id,check.checked);
 const button=document.createElement('button');button.textContent=part.name;button.title=part.name;button.setAttribute('aria-pressed',String(part.id===selectedId));button.onclick=()=>viewer.select(part.id);
 row.append(check,button);return row;
}
function createScrewFolder(matchingScrews){
 const allScrews=meta.meshes.filter(isScrewComponent);
 const visibleCount=allScrews.filter(p=>viewer.parts[p.id].visible).length;
 const folder=document.createElement('div');folder.className='component-folder';
 const header=document.createElement('div');header.className='folder-header';
 const toggle=document.createElement('button');toggle.className='folder-label';toggle.dataset.focusKey='screw-folder';toggle.setAttribute('aria-expanded',String(screwFolderOpen));toggle.setAttribute('aria-controls','screw-children');
 toggle.innerHTML='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>';
 const title=document.createElement('span');title.textContent=t('screwFolder');toggle.append(title);
 toggle.onclick=()=>{screwFolderOpen=!screwFolderOpen;renderList();};
 const count=document.createElement('span');count.className='folder-count';count.textContent=`${visibleCount}/${allScrews.length}`;
 const visibility=document.createElement('button');visibility.className='folder-visibility';visibility.dataset.focusKey='screw-visibility';visibility.textContent=t(visibleCount?'hideShort':'showShort');visibility.setAttribute('aria-label',t(visibleCount?'hideGroup':'showGroup'));
 visibility.onclick=()=>viewer.setGroupVisible(allScrews.map(p=>p.id),visibleCount===0);
 header.append(toggle,count,visibility);folder.append(header);
 const children=document.createElement('div');children.id='screw-children';children.className='folder-children';children.hidden=!screwFolderOpen;
 if(screwFolderOpen)matchingScrews.forEach(p=>children.append(createPartRow(p)));
 folder.append(children);return folder;
}
function renderList(){
 if(!meta)return;
 const list=$('#component-list'),scrollTop=list.scrollTop,focused=document.activeElement;
 const focusedId=focused?.closest('.component-row')?.dataset.id,focusKey=focused?.dataset.focusKey;
 const focusedType=focused?.tagName==='INPUT'?'input':'button';
 const query=$('#search').value;
 const folderMatches=query.trim()&&t('screwFolder').toLowerCase().includes(query.trim().toLowerCase());
 const parts=meta.meshes.filter(p=>filterComponents([p],query).length||(folderMatches&&isScrewComponent(p)));
 $('#component-count').textContent=parts.length===meta.meshes.length?parts.length:`${parts.length} / ${meta.meshes.length}`;
 list.replaceChildren();
 if(!parts.length){const empty=document.createElement('p');empty.className='list-empty';empty.textContent=t('empty');list.append(empty);return;}
 const fragment=document.createDocumentFragment(),screws=parts.filter(isScrewComponent);
 if(screws.length)fragment.append(createScrewFolder(screws));
 parts.filter(p=>!isScrewComponent(p)).forEach(p=>fragment.append(createPartRow(p)));
 list.append(fragment);list.scrollTop=scrollTop;
 if(focusedId!==undefined)list.querySelector(`[data-id="${focusedId}"] ${focusedType}`)?.focus({preventScroll:true});
 else if(focusKey)list.querySelector(`[data-focus-key="${focusKey}"]`)?.focus({preventScroll:true});
}
function updateStatus(){
 if(!meta)return;
 $('#model-status').textContent=t('ready');$('#mesh-status').textContent=`${viewer.parts.filter(p=>p.visible).length} / ${meta.meshes.length} ${t('parts')}`;
 $('#selected-name').textContent=selectedId===null?t('noSelection'):meta.meshes.find(m=>m.id===selectedId).name;
}
function updateFoldUI(){
 if(!viewer)return;
 const state=viewer.foldPlayback;
 $('#fold-progress').value=openingPercent(state.progress);
 $('#fold-percent').textContent=state.manual?t('manual'):`${openingPercent(state.progress)}%`;const angles=openingAngles(state.getAngles());for(const [key,id] of [['base','base-angle'],['upper','upper-angle']]){document.getElementById(id).value=angles[key];document.getElementById(id+'-value').textContent=Math.round(angles[key])+'°';}
 $('#fold-progress').setAttribute('aria-valuetext',`${openingPercent(state.progress)}% ${t('unfold')}`);
 if(viewer.poseSpans)viewer.poseSpans.forEach((d,i)=>{$(['#dim-x','#dim-y','#dim-z'][i]).innerHTML=`${d.toLocaleString(undefined,{maximumFractionDigits:1})}<small>mm</small>`;});
}
function updatePickupUI(){const demo=viewer?.pickupDemo;if(!demo)return;const from=demo.sourcePoint===CUBE_HOME?'right':'left',to=from==='right'?'left':'right';$('#transfer-route').textContent=`${t(from)} → ${t(to)}`;$('#pick-cube').textContent=`${t('pickAt')} ${t(from)}`;$('#place-cube').textContent=`${t('placeAt')} ${t(to)}`;document.querySelector('[data-step=pick]').textContent=`3 · ${t('pickAt')} ${t(from)}`;document.querySelector('[data-step=place]').textContent=`4 · ${t('placeAt')} ${t(to)}`;$('#pickup-status').textContent=t(demo.loopPaused?'loopPaused':'pickupState_'+demo.state);$('#loop-demo').textContent=t(!demo.looping?'startLoop':demo.loopPaused?'resumeLoop':'pauseLoop');$('#loop-demo').setAttribute('aria-pressed',String(demo.looping&&!demo.loopPaused));$('#loop-demo').disabled=loadState!=='ready';$('#pick-cube').disabled=loadState!=='ready'||demo.looping||demo.active||demo.state==='holding';$('#place-cube').disabled=loadState!=='ready'||demo.looping||demo.state!=='holding';$('#reset-pickup').disabled=loadState!=='ready';const stage=['driving','parking','cycleWaiting'].includes(demo.state)?'drive':demo.state==='preparing'?'unfold':['reaching','lowering','gripping','lifting','holding'].includes(demo.state)?'pick':['preparingPlace','returning','placing','releasing','retreating','retracting','stowing','complete'].includes(demo.state)?'place':demo.state==='cycleFolding'?'fold':demo.state==='returningHome'?'return':null;document.querySelectorAll('[data-step]').forEach(el=>{el.classList.toggle('active',el.dataset.step===stage);if(el.dataset.step===stage)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}
$('#base-angle').oninput=e=>{stopAutoRotate();viewer?.setJointAngle('base',internalJointAngle('base',Number(e.target.value)));};
$('#upper-angle').oninput=e=>{stopAutoRotate();viewer?.setJointAngle('upper',internalJointAngle('upper',Number(e.target.value)));};
$('#restart-demo').onclick=()=>{stopAutoRotate();viewer?.pickupDemo.startLoop();};
$('#loop-demo').onclick=()=>{stopAutoRotate();viewer?.pickupDemo.toggleLoop();};
$('#pick-cube').onclick=()=>{stopAutoRotate();viewer?.startPickup();};
$('#place-cube').onclick=()=>viewer?.placeCube();
$('#reset-pickup').onclick=()=>viewer?.resetPickup();
function stopAutoRotate(){ $('#rotate').checked=false;if(viewer)viewer.controls.autoRotate=false; }
$('#fold').onclick=()=>{stopAutoRotate();viewer?.animateFold(1);};
$('#unfold').onclick=()=>{stopAutoRotate();viewer?.animateFold(0);};
$('#animation-speed').onchange=e=>viewer?.setAnimationSpeed(Number(e.target.value));

$('#fold-progress').oninput=e=>viewer?.setFoldProgress(1-Number(e.target.value)/100);
$('#search').oninput=renderList;
$('#isolate').onclick=()=>viewer?.isolate();$('#show-all').onclick=()=>viewer?.showAll();
$('#grid').onchange=e=>{if(viewer?.grid)viewer.grid.visible=e.target.checked};
$('#rotate').onchange=e=>{if(viewer)viewer.controls.autoRotate=e.target.checked};
$('#edges').onchange=e=>viewer?.setEdges(e.target.checked);$('#snapshot').onclick=()=>viewer?.snapshot();
function setView(name){viewer?.setView(name);document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-pressed',String(b.dataset.view===name));});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#reset').onclick=()=>{viewer?.resetPickup();viewer?.setFoldProgress(1);viewer?.restoreDefaultVisibility();viewer?.select(null);stopAutoRotate();setView('iso');};
document.addEventListener('languagechange',()=>{renderList();updateStatus();updateFoldUI();updatePickupUI();if(loadState==='error'){$('#loading-title').textContent=t('error');$('#loading-detail').textContent=t('errorDetail');$('#model-status').textContent=t('error');}});
initLanguage();
async function start(){
 loadState='loading';meta=null;selectedId=null;$('#isolate').disabled=true;$('#status-dot').className='';$('#loading').hidden=false;$('#loading').classList.remove('error');$('#retry').hidden=true;$('#progress').value=0;$('#loading-title').textContent=t('loading');$('#loading-detail').textContent=t('loadingDetail');
 document.querySelectorAll('.demo-controls button,.demo-controls select,.motion-controls button,.motion-controls input,.motion-controls select,.joint-controls input,.pickup-controls button').forEach(c=>c.disabled=true);
 try{
  viewer?.dispose();viewer=new AssemblyViewer($('#viewport'));
  viewer.addEventListener('selection',e=>{if(!meta)return;selectedId=e.detail?.id??null;if(selectedId!==null&&isScrewComponent(meta.meshes[selectedId]))screwFolderOpen=true;$('#isolate').disabled=selectedId===null;renderList();updateStatus();});
  viewer.addEventListener('visibility',()=>{renderList();updateStatus();});
  viewer.addEventListener('foldchange',updateFoldUI);viewer.addEventListener('pickupchange',updatePickupUI);
  viewer.addEventListener('orbit',()=>{document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});});
  meta=await viewer.load(p=>{$('#progress').value=p;$('#loading-detail').textContent=`${t('downloading')} · ${Math.round(p)}%`;});
  viewer.setAnimationSpeed(Number($('#animation-speed').value));loadState='ready';renderList();updateStatus();updateFoldUI();$('#status-dot').className='ready';$('#loading').hidden=true;setView('iso');viewer.grid.visible=$('#grid').checked;viewer.controls.autoRotate=$('#rotate').checked;
  document.querySelectorAll('.demo-controls button,.demo-controls select,.motion-controls button,.motion-controls input,.motion-controls select,.joint-controls input,.pickup-controls button').forEach(c=>c.disabled=false);updatePickupUI();
  await viewer.setEdges($('#edges').checked);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)viewer.pickupDemo.startLoop();
 }catch(error){loadState='error';console.error('V3 model load failed',error);$('#loading').hidden=false;$('#loading').classList.add('error');$('#loading-title').textContent=t('error');$('#loading-detail').textContent=t('errorDetail');$('#model-status').textContent=t('error');$('#retry').hidden=false;}
}
$('#retry').onclick=start;start();

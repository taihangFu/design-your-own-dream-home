import {
  COLORS, furnitureCatalog, createProject, migrateProject, addItem, updateItem, removeItem,
  addWall, updateWall, removeWall, wallBounds, roomArea, calibrationScale
} from './project.js';

const $ = s => document.querySelector(s);
const canvas = $('#roomCanvas'), ctx = canvas.getContext('2d');
let project;
try { project = migrateProject(JSON.parse(localStorage.getItem('roomplay-project'))); } catch { project = createProject(); }
let selectedId = null, selectedWallId = null, view = '3d', zoom = 1, drag = null, tool = null;
let history = [], future = [], saveTimer, cw = 800, ch = 600, transform, floorPlanImage = null, wallStart = null, calibrationPoints = [];

function snapshot() { history.push(JSON.stringify(project)); if (history.length > 40) history.shift(); future = []; updateButtons(); }
function persist() {
  $('#saveState').innerHTML = '<span></span> Saving…'; clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem('roomplay-project', JSON.stringify(project)); $('#saveState').innerHTML = '<span></span> Saved'; } catch { showPlanError('Project settings could not be saved. Browser storage may be full.'); } }, 250);
}
function commit(next) { snapshot(); project = next; persist(); renderAll(); }
function undo() { if (!history.length) return; future.push(JSON.stringify(project)); project = migrateProject(JSON.parse(history.pop())); clearSelection(); persist(); renderAll(); }
function redo() { if (!future.length) return; history.push(JSON.stringify(project)); project = migrateProject(JSON.parse(future.pop())); clearSelection(); persist(); renderAll(); }
function updateButtons() { $('#undoBtn').disabled = !history.length; $('#redoBtn').disabled = !future.length; }
function clearSelection() { selectedId = selectedWallId = null; }

function boundsWithMargin() {
  const b = wallBounds(project.walls), pad = Math.max(1, Math.max(b.width, b.height) * .12);
  return { ...b, minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad, width: b.width + pad * 2, height: b.height + pad * 2 };
}
function updateTransform() {
  const b = boundsWithMargin(), scale = Math.max(12, Math.min((cw - 60) / b.width, (ch - 60) / b.height)) * zoom;
  transform = { b, scale, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 };
}
function plan(x, y) { return { x: cw / 2 + (x - transform.cx) * transform.scale, y: ch / 2 + (y - transform.cy) * transform.scale }; }
function unplan(x, y) { return { x: transform.cx + (x - cw / 2) / transform.scale, y: transform.cy + (y - ch / 2) / transform.scale }; }
function iso(x, y, z = 0) { const s = Math.min(cw / Math.max(8, transform.b.width), ch / Math.max(6, transform.b.height)) * .62 * zoom; return { x: cw / 2 + ((x - transform.cx) - (y - transform.cy)) * s * .72, y: ch * .54 + ((x - transform.cx) + (y - transform.cy)) * s * .33 - z * s }; }
function poly(points, fill, stroke = '#00000018') { if (!points.length) return; ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.stroke(); }
function shade(hex, amt) { const n = parseInt(hex.slice(1), 16), c = s => Math.max(0, Math.min(255, s)); return `rgb(${c((n >> 16) + amt)},${c(((n >> 8) & 255) + amt)},${c((n & 255) + amt)})`; }
function wallLength(w) { return Math.hypot(w.x2 - w.x1, w.y2 - w.y1); }

function drawWall3d(w) {
  const len = wallLength(w); if (!len) return;
  const nx = -(w.y2 - w.y1) / len * w.thickness / 2, ny = (w.x2 - w.x1) / len * w.thickness / 2;
  const base = [[w.x1 + nx, w.y1 + ny], [w.x2 + nx, w.y2 + ny], [w.x2 - nx, w.y2 - ny], [w.x1 - nx, w.y1 - ny]];
  const bottom = base.map(([x, y]) => iso(x, y)), top = base.map(([x, y]) => iso(x, y, w.height));
  poly([bottom[0], bottom[1], top[1], top[0]], shade(project.wallColor, -12));
  poly([bottom[1], bottom[2], top[2], top[1]], shade(project.wallColor, -24));
  poly(top, project.wallColor, w.id === selectedWallId ? '#c26343' : '#00000022');
}
function drawBox(item, selected = false) { let { x, y, w, d, h, color } = item; const r = ((item.rotation || 0) / 90) % 2; if (r) [w, d] = [d, w]; const p = [iso(x - w / 2, y - d / 2), iso(x + w / 2, y - d / 2), iso(x + w / 2, y + d / 2), iso(x - w / 2, y + d / 2)], t = [iso(x - w / 2, y - d / 2, h), iso(x + w / 2, y - d / 2, h), iso(x + w / 2, y + d / 2, h), iso(x - w / 2, y + d / 2, h)]; poly([p[0], p[1], t[1], t[0]], shade(color, -18)); poly([p[1], p[2], t[2], t[1]], shade(color, -35)); poly(t, color, selected ? '#c26343' : '#00000022'); }
function floorVertices() { return project.walls.map(w => iso(w.x1, w.y1)); }
function draw3d() {
  ctx.fillStyle = '#edeae4'; ctx.fillRect(0, 0, cw, ch);
  if (project.walls.length >= 3) poly(floorVertices(), project.floorColor, '#b8ab99');
  [...project.walls].sort((a, b) => (a.x1 + a.y1) - (b.x1 + b.y1)).forEach(drawWall3d);
  [...project.items].sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(i => drawBox(i, i.id === selectedId));
}
function drawGrid() {
  ctx.fillStyle = '#f8f6f1'; ctx.fillRect(0, 0, cw, ch); ctx.strokeStyle = '#e7e3dc'; ctx.lineWidth = 1;
  const step = transform.scale < 30 ? 1 : .5;
  for (let x = Math.floor(transform.b.minX / step) * step; x <= transform.b.maxX; x += step) { const p = plan(x, 0); ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, ch); ctx.stroke(); }
  for (let y = Math.floor(transform.b.minY / step) * step; y <= transform.b.maxY; y += step) { const p = plan(0, y); ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(cw, p.y); ctx.stroke(); }
}
function floorImageCorners(fp, image = floorPlanImage) {
  if (!image) return [];
  const w = image.naturalWidth * fp.scale, h = image.naturalHeight * fp.scale, a = fp.rotation * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y]) => ({ x: fp.x + x*ca-y*sa, y: fp.y+x*sa+y*ca }));
}
function drawFloorPlan() {
  const fp = project.floorPlan; if (!floorPlanImage || !fp.visible) return;
  const c = plan(fp.x, fp.y), w = floorPlanImage.naturalWidth * fp.scale * transform.scale, h = floorPlanImage.naturalHeight * fp.scale * transform.scale;
  ctx.save(); ctx.globalAlpha = fp.opacity; ctx.translate(c.x, c.y); ctx.rotate(fp.rotation * Math.PI / 180); ctx.drawImage(floorPlanImage, -w / 2, -h / 2, w, h); ctx.restore();
}
function drawCalibration() {
  const c = project.floorPlan.calibration; if (!c) return;
  const a = imagePixelToWorld(c.a), b = imagePixelToWorld(c.b), pa = plan(a.x, a.y), pb = plan(b.x, b.y);
  ctx.strokeStyle = '#c26343'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#9d4e35'; ctx.font = '600 11px DM Sans'; ctx.textAlign = 'center'; ctx.fillText(`${c.distance.toFixed(2)} m · ${(c.metersPerPixel * 100).toFixed(2)} cm/px`, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2 - 9);
}
function draw2d() {
  drawGrid(); drawFloorPlan();
  if (project.walls.length >= 3) poly(project.walls.map(w => plan(w.x1, w.y1)), project.floorColor + '99', 'transparent');
  project.walls.forEach(w => { const a = plan(w.x1, w.y1), b = plan(w.x2, w.y2); ctx.strokeStyle = w.id === selectedWallId ? '#c26343' : project.wallColor; ctx.lineWidth = Math.max(4, w.thickness * transform.scale); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.strokeStyle = w.id === selectedWallId ? '#8d412c' : '#5f625f'; ctx.lineWidth = 1; ctx.stroke(); if (w.id === selectedWallId) { [a,b].forEach(p => { ctx.fillStyle='#fff';ctx.strokeStyle='#c26343';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();ctx.stroke(); }); } });
  project.items.forEach(i => { let { w, d } = i; if (((i.rotation || 0) / 90) % 2) [w, d] = [d, w]; const p = plan(i.x - w / 2, i.y - d / 2); ctx.fillStyle = i.color; ctx.strokeStyle = i.id === selectedId ? '#c26343' : '#ffffffaa'; ctx.lineWidth = i.id === selectedId ? 3 : 1; ctx.fillRect(p.x, p.y, w * transform.scale, d * transform.scale); ctx.strokeRect(p.x, p.y, w * transform.scale, d * transform.scale); ctx.fillStyle = '#fff'; ctx.font = '600 9px DM Sans'; ctx.textAlign = 'center'; ctx.fillText(i.name, p.x + w * transform.scale / 2, p.y + d * transform.scale / 2 + 3); });
  if (wallStart) { const a = plan(wallStart.x, wallStart.y), b = plan(wallStart.previewX ?? wallStart.x, wallStart.previewY ?? wallStart.y); ctx.strokeStyle='#c26343';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]); const length=Math.hypot((wallStart.previewX??wallStart.x)-wallStart.x,(wallStart.previewY??wallStart.y)-wallStart.y);ctx.fillStyle='#733b2a';ctx.fillText(`${length.toFixed(2)} m`,(a.x+b.x)/2,(a.y+b.y)/2-10); }
  drawCalibration();
}
function resize() { const rect = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1; cw = rect.width; ch = rect.height; canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); updateTransform(); view === '3d' ? draw3d() : draw2d(); }

function renderInspector() {
  const item = project.items.find(i => i.id === selectedId), wall = project.walls.find(w => w.id === selectedWallId);
  $('#noSelection').classList.toggle('hidden', !!item || !!wall); $('#selectionEditor').classList.toggle('hidden', !item); $('#wallEditor').classList.toggle('hidden', !wall);
  if (item) { $('#selectedName').textContent = item.name; $('#rotation').value = item.rotation; $('#rotationValue').value = `${item.rotation}°`; $('#itemWidth').textContent = `${item.w.toFixed(2)} m`; $('#itemDepth').textContent = `${item.d.toFixed(2)} m`; renderSwatches('#itemSwatches', item.color, c => commit(updateItem(project, item.id, { color: c }))); }
  if (wall) { $('#wallLength').value = `${wallLength(wall).toFixed(2)} m`; $('#wallThickness').value = wall.thickness; $('#wallThicknessValue').value = `${wall.thickness.toFixed(2)} m`; $('#wallHeight').value = wall.height; $('#wallHeightValue').value = `${wall.height.toFixed(1)} m`; }
}
function renderPlanControls() { const fp = project.floorPlan, has = !!fp.imageKey; $('#planSettings').classList.toggle('hidden', !has); $('#togglePlanBtn').textContent = fp.visible ? 'Hide' : 'Show'; $('#planOpacity').value = fp.opacity * 100; $('#opacityValue').value = `${Math.round(fp.opacity * 100)}%`; $('#planRotation').value = fp.rotation; $('#planRotationValue').value = `${fp.rotation}°`; if (has && floorPlanImage) $('#calibrationResult').textContent = fp.calibration ? `Calibrated: ${fp.calibration.distance.toFixed(2)} m = ${(fp.calibration.metersPerPixel * 100).toFixed(2)} cm/px` : 'Not calibrated yet'; }
function renderAll() { $('#projectName').value = project.name; renderInspector(); renderPlanControls(); updateButtons(); updateRoomStats(); resize(); }
function updateRoomStats() { const b = wallBounds(project.walls), area = roomArea(project.walls); $('.room-size').innerHTML = `${b.width.toFixed(1)} × ${b.height.toFixed(1)} m <i></i> ${area.toFixed(1)} m²`; const heights=project.walls.map(w=>w.height); $('#heightStatus').textContent=heights.length?`Wall height ${Math.max(...heights).toFixed(1)} m`:'No walls'; }
function renderSwatches(selector, active, onClick) { const el = $(selector); el.innerHTML = ''; COLORS.forEach(c => { const b = document.createElement('button'); b.className = 'swatch' + (c === active ? ' active' : ''); b.style.background = c; b.ariaLabel = `Set color ${c}`; b.onclick = () => onClick(c); el.append(b); }); }
function buildCatalog() { const q = $('#search').value.toLowerCase(); $('#catalog').innerHTML = ''; furnitureCatalog.filter(x => x.name.toLowerCase().includes(q)).forEach(item => { const b = document.createElement('button'); b.className = 'catalog-item'; b.style.setProperty('--item-color', item.color); b.innerHTML = `<span class="catalog-icon">${item.icon}</span><strong>${item.name}</strong><small>${item.w} × ${item.d} m</small>`; b.onclick = () => { const bounds=wallBounds(project.walls); const next = addItem(project, item, { x:(bounds.minX+bounds.maxX)/2, y:(bounds.minY+bounds.maxY)/2 }); clearSelection(); selectedId = next.items.at(-1).id; commit(next); }; $('#catalog').append(b); }); }

function canvasPoint(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function distanceToSegment(p, a, b) { const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;if(!l)return Math.hypot(p.x-a.x,p.y-a.y);const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy); }
function hitWall(p) { return project.walls.find(w => distanceToSegment(p, plan(w.x1,w.y1), plan(w.x2,w.y2)) < Math.max(9,w.thickness*transform.scale/2+5)); }
function hitItem(p) { return [...project.items].reverse().find(item => { if (view === '2d') { const c = plan(item.x, item.y); return Math.abs(p.x-c.x)<item.w*transform.scale/2+8&&Math.abs(p.y-c.y)<item.d*transform.scale/2+8; } const c=iso(item.x,item.y,item.h);return Math.hypot(p.x-c.x,p.y-c.y)<55; }); }
function snapPoint(world, excludeWall) { let result={x:Math.round(world.x*4)/4,y:Math.round(world.y*4)/4}, best=10/transform.scale; project.walls.forEach(w=>{if(w.id===excludeWall)return;[[w.x1,w.y1],[w.x2,w.y2]].forEach(([x,y])=>{const d=Math.hypot(world.x-x,world.y-y);if(d<best){best=d;result={x,y};}})});return result; }
function imagePixelToWorld(p) { const fp=project.floorPlan,a=fp.rotation*Math.PI/180,dx=(p.x-floorPlanImage.naturalWidth/2)*fp.scale,dy=(p.y-floorPlanImage.naturalHeight/2)*fp.scale;return{x:fp.x+dx*Math.cos(a)-dy*Math.sin(a),y:fp.y+dx*Math.sin(a)+dy*Math.cos(a)}; }
function worldToImagePixel(p) { const fp=project.floorPlan,a=-fp.rotation*Math.PI/180,dx=p.x-fp.x,dy=p.y-fp.y;return{x:(dx*Math.cos(a)-dy*Math.sin(a))/fp.scale+floorPlanImage.naturalWidth/2,y:(dx*Math.sin(a)+dy*Math.cos(a))/fp.scale+floorPlanImage.naturalHeight/2}; }

canvas.addEventListener('pointerdown', e => {
  const p=canvasPoint(e), world=unplan(p.x,p.y);
  if(view==='2d'&&tool==='draw'){const s=snapPoint(world);if(!wallStart){wallStart={...s};}else if(Math.hypot(s.x-wallStart.x,s.y-wallStart.y)>.05){const next=addWall(project,{x1:wallStart.x,y1:wallStart.y,x2:s.x,y2:s.y});selectedWallId=next.walls.at(-1).id;selectedId=null;commit(next);wallStart=null;}resize();return;}
  if(view==='2d'&&tool==='calibrate'&&floorPlanImage){calibrationPoints.push(worldToImagePixel(world));if(calibrationPoints.length===2){const value=prompt('Known distance between these points (metres), e.g. 4.2');const distance=Number.parseFloat(value);try{const metersPerPixel=calibrationScale(calibrationPoints[0],calibrationPoints[1],distance), ratio=metersPerPixel/project.floorPlan.scale;commit({...project,floorPlan:{...project.floorPlan,scale:metersPerPixel,calibration:{a:calibrationPoints[0],b:calibrationPoints[1],distance,metersPerPixel}}});$('#planScaleValue').value=`${Math.round(ratio*100)}%`;setTool(null);}catch(err){showPlanError(err.message);calibrationPoints=[];}}return;}
  if(view==='2d'&&tool==='move-plan'&&floorPlanImage){snapshot();drag={kind:'plan',start:p,original:{x:project.floorPlan.x,y:project.floorPlan.y}};canvas.setPointerCapture(e.pointerId);return;}
  const wall=view==='2d'?hitWall(p):null,item=wall?null:hitItem(p);clearSelection();
  if(wall){selectedWallId=wall.id;const a=plan(wall.x1,wall.y1),b=plan(wall.x2,wall.y2),endpoint=Math.hypot(p.x-a.x,p.y-a.y)<10?'start':Math.hypot(p.x-b.x,p.y-b.y)<10?'end':null;if(endpoint){snapshot();drag={kind:'wall',id:wall.id,endpoint};canvas.setPointerCapture(e.pointerId);}}
  else if(item){selectedId=item.id;snapshot();drag={kind:'item',id:item.id,start:p,original:{x:item.x,y:item.y}};canvas.setPointerCapture(e.pointerId);}renderAll();
});
canvas.addEventListener('pointermove', e => {const p=canvasPoint(e);if(wallStart){const s=snapPoint(unplan(p.x,p.y));wallStart.previewX=s.x;wallStart.previewY=s.y;resize();}if(!drag)return;if(drag.kind==='item'){const dx=p.x-drag.start.x,dy=p.y-drag.start.y;let x,y;if(view==='2d'){x=drag.original.x+dx/transform.scale;y=drag.original.y+dy/transform.scale;}else{x=drag.original.x+dx/(transform.scale*.9);y=drag.original.y+dy/(transform.scale*.5);}project=updateItem(project,drag.id,{x,y});}else if(drag.kind==='wall'){const s=snapPoint(unplan(p.x,p.y),drag.id);project=updateWall(project,drag.id,drag.endpoint==='start'?{x1:s.x,y1:s.y}:{x2:s.x,y2:s.y});}else{project={...project,floorPlan:{...project.floorPlan,x:drag.original.x+(p.x-drag.start.x)/transform.scale,y:drag.original.y+(p.y-drag.start.y)/transform.scale}};}resize();renderInspector();});
canvas.addEventListener('pointerup',()=>{if(drag){drag=null;future=[];persist();renderAll();}});

function setTool(next){tool=next;wallStart=null;calibrationPoints=[];$('#drawWallBtn').classList.toggle('active',tool==='draw');$('#movePlanBtn').classList.toggle('active',tool==='move-plan');$('#calibrateBtn').classList.toggle('active',tool==='calibrate');$('#interactionStatus').textContent=tool==='draw'?'Click two points to draw a wall':tool==='calibrate'?'Click two points with a known distance':tool==='move-plan'?'Drag to position the floor plan':'Drag objects to move';if(tool&&view!=='2d')setView('2d');resize();}
function setView(next){view=next;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));resize();}
$('.viewbar').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view);});
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));$(`#${b.dataset.panel}Panel`).classList.remove('hidden');});

function openDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('roomplay-assets',1);request.onupgradeneeded=()=>request.result.createObjectStore('floorPlans');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function putImage(key,blob){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('floorPlans','readwrite');tx.objectStore('floorPlans').put(blob,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function getImage(key){const db=await openDb();return new Promise((resolve,reject)=>{const request=db.transaction('floorPlans').objectStore('floorPlans').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function deleteImage(key){if(!key)return;const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('floorPlans','readwrite');tx.objectStore('floorPlans').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function decodeImage(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('The selected image could not be read.'));reader.onload=()=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('The selected image could not be decoded.'));img.src=reader.result;};reader.readAsDataURL(blob);});}
function showPlanError(message){$('#planError').textContent=message;}
async function loadSavedImage(){if(!project.floorPlan.imageKey)return;try{const blob=await getImage(project.floorPlan.imageKey);if(!blob)throw new Error('The saved floor plan is no longer available in browser storage.');floorPlanImage=await decodeImage(blob);renderAll();}catch(err){showPlanError(err.message);}}
async function importFloorPlan(file){showPlanError('');if(!file||!['image/png','image/jpeg'].includes(file.type)){showPlanError('Please choose a PNG or JPEG image. PDF support is planned for a later release.');return;}try{const image=await decodeImage(file),key=`floor-plan-${Date.now()}`;await putImage(key,file);await deleteImage(project.floorPlan.imageKey);floorPlanImage=image;const b=wallBounds(project.walls),fit=Math.min(b.width*.9/image.naturalWidth,b.height*.9/image.naturalHeight);commit({...project,floorPlan:{...project.floorPlan,imageKey:key,x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,scale:fit,rotation:0,visible:true,calibration:null}});setView('2d');}catch(err){showPlanError(`Floor plan could not be stored: ${err.message}`);}}

$('#floorPlanInput').onchange=e=>{importFloorPlan(e.target.files[0]);e.target.value='';};$('#uploadPlanBtn').onclick=$('#replacePlanBtn').onclick=()=>$('#floorPlanInput').click();
$('#togglePlanBtn').onclick=()=>commit({...project,floorPlan:{...project.floorPlan,visible:!project.floorPlan.visible}});
$('#deletePlanBtn').onclick=async()=>{await deleteImage(project.floorPlan.imageKey);floorPlanImage=null;commit({...project,floorPlan:{...createProject().floorPlan}});setTool(null);};
$('#planOpacity').oninput=e=>{project={...project,floorPlan:{...project.floorPlan,opacity:+e.target.value/100}};$('#opacityValue').value=`${e.target.value}%`;resize();};$('#planOpacity').onpointerdown=snapshot;$('#planOpacity').onchange=persist;
$('#planRotation').oninput=e=>{project={...project,floorPlan:{...project.floorPlan,rotation:+e.target.value}};$('#planRotationValue').value=`${e.target.value}°`;resize();};$('#planRotation').onpointerdown=snapshot;$('#planRotation').onchange=persist;
$('#planScale').oninput=e=>{if(!floorPlanImage)return;const base=project.floorPlan.calibration?.metersPerPixel||Math.min(wallBounds(project.walls).width*.9/floorPlanImage.naturalWidth,wallBounds(project.walls).height*.9/floorPlanImage.naturalHeight);project={...project,floorPlan:{...project.floorPlan,scale:base*(+e.target.value/100)}};$('#planScaleValue').value=`${e.target.value}%`;resize();};$('#planScale').onpointerdown=snapshot;$('#planScale').onchange=persist;
$('#drawWallBtn').onclick=()=>setTool(tool==='draw'?null:'draw');$('#movePlanBtn').onclick=()=>setTool(tool==='move-plan'?null:'move-plan');$('#calibrateBtn').onclick=()=>setTool(tool==='calibrate'?null:'calibrate');
$('#search').oninput=buildCatalog;$('#projectName').onchange=e=>commit({...project,name:e.target.value});$('#undoBtn').onclick=undo;$('#redoBtn').onclick=redo;
$('#rotation').oninput=e=>{const item=project.items.find(i=>i.id===selectedId);commit(updateItem(project,item.id,{rotation:+e.target.value}));};
$('#deleteBtn').onclick=()=>{commit(removeItem(project,selectedId));clearSelection();renderAll();};$('#deleteWallBtn').onclick=()=>{commit(removeWall(project,selectedWallId));clearSelection();renderAll();};
$('#wallThickness').oninput=e=>commit(updateWall(project,selectedWallId,{thickness:+e.target.value}));$('#wallHeight').oninput=e=>commit(updateWall(project,selectedWallId,{height:+e.target.value}));
$('#duplicateBtn').onclick=()=>{const item=project.items.find(i=>i.id===selectedId),next=addItem(project,item,{x:item.x+.35,y:item.y+.35});selectedId=next.items.at(-1).id;commit(next);};
$('#resetBtn').onclick=()=>{clearSelection();setTool(null);commit(createProject());};$('#zoomIn').onclick=()=>{zoom=Math.min(1.5,zoom+.1);$('#zoomLabel').textContent=Math.round(zoom*100)+'%';resize();};$('#zoomOut').onclick=()=>{zoom=Math.max(.5,zoom-.1);$('#zoomLabel').textContent=Math.round(zoom*100)+'%';resize();};
$('#shareBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);}catch{}$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800);};
renderSwatches('#wallSwatches',project.wallColor,c=>commit({...project,wallColor:c}));renderSwatches('#floorSwatches',project.floorColor,c=>commit({...project,floorColor:c}));buildCatalog();new ResizeObserver(resize).observe($('.canvas-wrap'));renderAll();loadSavedImage();

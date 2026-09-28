import { COLORS, furnitureCatalog, createProject, migrateProject, addItem, updateItem, removeItem, addWall, wallBounds } from './project.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#roomCanvas');
const ctx = canvas.getContext('2d');
let project;
try { project = migrateProject(JSON.parse(localStorage.getItem('roomplay-project'))); } catch { project = createProject(); }
let selectedId = null, view = '3d', zoom = 1, drag = null, drawStart = null, drawingWalls = false;
let history = [], future = [], saveTimer, cw = 800, ch = 600, floorImage = null;

function snapshot() { history.push(JSON.stringify(project)); if (history.length > 40) history.shift(); future = []; updateButtons(); }
function persist() { $('#saveState').innerHTML = '<span></span> Saving…'; clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem('roomplay-project', JSON.stringify(project)); $('#saveState').innerHTML = '<span></span> Saved'; } catch { $('#saveState').textContent = 'Image too large to save'; } }, 250); }
function commit(next) { snapshot(); project = next; persist(); renderAll(); }
function undo() { if (!history.length) return; future.push(JSON.stringify(project)); project = JSON.parse(history.pop()); selectedId = null; loadFloorImage(); persist(); renderAll(); }
function redo() { if (!future.length) return; history.push(JSON.stringify(project)); project = JSON.parse(future.pop()); selectedId = null; loadFloorImage(); persist(); renderAll(); }
function updateButtons() { $('#undoBtn').disabled = !history.length; $('#redoBtn').disabled = !future.length; }

function bounds() { return wallBounds(project.walls); }
function worldScale() { const b = bounds(); return Math.min(cw / Math.max(12, b.width + 3), ch / Math.max(9, b.height + 3)) * zoom; }
function center() { const b = bounds(); return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }; }
function iso(x, y, z = 0) { const s = Math.min(52, worldScale()) * zoom, c = center(); return { x: cw / 2 + ((x-c.x)-(y-c.y))*s*.72, y: ch*.28+((x-c.x)+(y-c.y))*s*.33-z*s }; }
function plan(x, y) { const s = worldScale(), c = center(); return { x: cw/2+(x-c.x)*s, y: ch/2+(y-c.y)*s }; }
function unplan(x, y) { const s = worldScale(), c = center(); return { x: c.x+(x-cw/2)/s, y: c.y+(y-ch/2)/s }; }
function poly(points, fill, stroke='#00000018') { if (!points.length) return; ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y); points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y)); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=stroke; ctx.stroke(); }
function shade(hex, amt) { const n=parseInt(hex.slice(1),16), r=Math.max(0,Math.min(255,(n>>16)+amt)), g=Math.max(0,Math.min(255,((n>>8)&255)+amt)), b=Math.max(0,Math.min(255,(n&255)+amt)); return `rgb(${r},${g},${b})`; }
function floorPoints() { return project.walls.length >= 3 ? project.walls.map(w => iso(w.x1,w.y1)) : []; }
function drawWall3d(wall) { const a=iso(wall.x1,wall.y1), b=iso(wall.x2,wall.y2), h=(wall.height||2.7)*Math.min(52,worldScale())*zoom; poly([a,b,{x:b.x,y:b.y-h},{x:a.x,y:a.y-h}],project.wallColor,'#b8b3aa'); }
function drawBox(item, selected=false) { let {x,y,w,d,h,color}=item; if (((item.rotation||0)/90)%2) [w,d]=[d,w]; const p=[iso(x-w/2,y-d/2),iso(x+w/2,y-d/2),iso(x+w/2,y+d/2),iso(x-w/2,y+d/2)], lift=h*Math.min(52,worldScale())*zoom, t=p.map(q=>({x:q.x,y:q.y-lift})); poly([p[0],p[1],t[1],t[0]],shade(color,-18)); poly([p[1],p[2],t[2],t[1]],shade(color,-35)); poly(t,color,selected?'#c26343':'#00000022'); if(selected){ctx.setLineDash([4,3]);poly(t,'transparent','#c26343');ctx.setLineDash([]);} }
function draw3d() { poly(floorPoints(),project.floorColor,'#b8ab99'); project.walls.forEach(drawWall3d); [...project.items].sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(i=>drawBox(i,i.id===selectedId)); }
function drawFloorPlan() { if (!floorImage || !project.floorPlan?.visible) return; const b=bounds(), width=project.floorPlan.widthMeters||Math.max(8,b.width), ratio=floorImage.height/floorImage.width, p=plan(b.minX,b.minY), s=worldScale(); ctx.save(); ctx.globalAlpha=project.floorPlan.opacity??.45; ctx.drawImage(floorImage,p.x,p.y,width*s,width*ratio*s); ctx.restore(); }
function draw2d() {
  ctx.fillStyle='#f8f6f1'; ctx.fillRect(0,0,cw,ch); const s=worldScale();
  ctx.strokeStyle='#e7e3dc'; ctx.lineWidth=1; const c=center();
  for(let x=Math.floor(c.x-cw/s/2);x<=c.x+cw/s/2;x++){const p=plan(x,0);ctx.beginPath();ctx.moveTo(p.x,0);ctx.lineTo(p.x,ch);ctx.stroke();}
  for(let y=Math.floor(c.y-ch/s/2);y<=c.y+ch/s/2;y++){const p=plan(0,y);ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(cw,p.y);ctx.stroke();}
  drawFloorPlan();
  if(project.walls.length>=3) poly(project.walls.map(w=>plan(w.x1,w.y1)),`${project.floorColor}55`,'transparent');
  project.walls.forEach(w=>{const a=plan(w.x1,w.y1),b=plan(w.x2,w.y2);ctx.strokeStyle=project.wallColor;ctx.lineWidth=Math.max(5,(w.thickness||.15)*s);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#3d4542';ctx.beginPath();ctx.arc(a.x,a.y,3,0,Math.PI*2);ctx.fill();});
  if(drawStart){const p=plan(drawStart.x,drawStart.y);ctx.fillStyle='#c8764d';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();}
  project.items.forEach(i=>{let {w,d}=i;if(((i.rotation||0)/90)%2)[w,d]=[d,w];const p=plan(i.x-w/2,i.y-d/2);ctx.fillStyle=i.color;ctx.strokeStyle=i.id===selectedId?'#c26343':'#ffffffaa';ctx.lineWidth=i.id===selectedId?3:1;ctx.fillRect(p.x,p.y,w*s,d*s);ctx.strokeRect(p.x,p.y,w*s,d*s);ctx.fillStyle='#fff';ctx.font='600 9px DM Sans';ctx.textAlign='center';ctx.fillText(i.name,p.x+w*s/2,p.y+d*s/2+3);});
}
function resize() { const r=canvas.getBoundingClientRect(), d=devicePixelRatio||1; cw=r.width;ch=r.height;canvas.width=Math.round(cw*d);canvas.height=Math.round(ch*d);ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,cw,ch);view==='3d'?draw3d():draw2d(); }
function renderInspector() { const item=project.items.find(i=>i.id===selectedId);$('#noSelection').classList.toggle('hidden',!!item);$('#selectionEditor').classList.toggle('hidden',!item);if(!item)return;$('#selectedName').textContent=item.name;$('#rotation').value=item.rotation;$('#rotationValue').value=`${item.rotation}°`;$('#itemWidth').textContent=`${item.w.toFixed(2)} m`;$('#itemDepth').textContent=`${item.d.toFixed(2)} m`;renderSwatches('#itemSwatches',item.color,c=>commit(updateItem(project,item.id,{color:c}))); }
function renderAll() { const b=bounds();$('#projectName').value=project.name;$('#roomSize').innerHTML=`${b.width.toFixed(1)} × ${b.height.toFixed(1)} m <i></i> ${(b.width*b.height).toFixed(0)} m²`;$('#planControls').classList.toggle('hidden',!project.floorPlan);if(project.floorPlan){$('#planOpacity').value=(project.floorPlan.opacity??.45)*100;$('#opacityValue').value=`${Math.round((project.floorPlan.opacity??.45)*100)}%`;$('#planWidth').value=project.floorPlan.widthMeters||8;} renderInspector();updateButtons();resize(); }
function renderSwatches(selector,active,onClick){const el=$(selector);el.innerHTML='';COLORS.forEach(c=>{const b=document.createElement('button');b.className='swatch'+(c===active?' active':'');b.style.background=c;b.ariaLabel=`Set color ${c}`;b.onclick=()=>onClick(c);el.append(b);});}
function buildCatalog(){const q=$('#search').value.toLowerCase();$('#catalog').innerHTML='';furnitureCatalog.filter(x=>x.name.toLowerCase().includes(q)).forEach(item=>{const b=document.createElement('button');b.className='catalog-item';b.style.setProperty('--item-color',item.color);b.innerHTML=`<span class="catalog-icon">${item.icon}</span><strong>${item.name}</strong><small>${item.w} × ${item.d} m</small>`;b.onclick=()=>{const c=center(),next=addItem(project,item,{x:c.x,y:c.y});selectedId=next.items.at(-1).id;commit(next);};$('#catalog').append(b);});}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function hitTest(p){return [...project.items].reverse().find(item=>{if(view==='2d'){const c=plan(item.x,item.y),s=worldScale();return Math.abs(p.x-c.x)<item.w*s/2+8&&Math.abs(p.y-c.y)<item.d*s/2+8;}const c=iso(item.x,item.y,item.h);return Math.hypot(p.x-c.x,p.y-c.y)<55;});}
function switchView(next){view=next;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===view));resize();}
function setDrawing(on){drawingWalls=on;drawStart=null;$('#drawWallBtn').classList.toggle('active',on);$('#drawHint').classList.toggle('hidden',!on);$('.canvas-wrap').classList.toggle('drawing',on);if(on)switchView('2d');resize();}
function loadFloorImage(){floorImage=null;if(project.floorPlan?.src){floorImage=new Image();floorImage.onload=resize;floorImage.src=project.floorPlan.src;}}
function compressImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1600,scale=Math.min(1,max/img.width),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.8));};img.onerror=reject;img.src=url;});}

canvas.addEventListener('pointerdown',e=>{const p=canvasPoint(e);if(drawingWalls&&view==='2d'){const w=unplan(p.x,p.y),point={x:Math.round(w.x*4)/4,y:Math.round(w.y*4)/4};if(!drawStart){drawStart=point;resize();}else{commit(addWall(project,{x1:drawStart.x,y1:drawStart.y,x2:point.x,y2:point.y}));drawStart=point;}return;}const item=hitTest(p);selectedId=item?.id||null;if(item){snapshot();drag={id:item.id,start:p,original:{x:item.x,y:item.y}};canvas.setPointerCapture(e.pointerId);}renderAll();});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=canvasPoint(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;let x,y;if(view==='2d'){const s=worldScale();x=drag.original.x+dx/s;y=drag.original.y+dy/s;}else{const s=Math.min(52,worldScale())*zoom;x=drag.original.x+(dx/1.44+dy/.66)/s;y=drag.original.y+(-dx/1.44+dy/.66)/s;}project=updateItem(project,drag.id,{x,y});resize();});
canvas.addEventListener('pointerup',()=>{if(drag){drag=null;future=[];persist();renderInspector();updateButtons();}});
window.addEventListener('keydown',e=>{if(e.key==='Escape')setDrawing(false);});
$('.viewbar').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)switchView(b.dataset.view);});
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));$(`#${b.dataset.panel}Panel`).classList.remove('hidden');});
$('#search').oninput=buildCatalog;$('#projectName').onchange=e=>commit({...project,name:e.target.value});$('#undoBtn').onclick=undo;$('#redoBtn').onclick=redo;
$('#rotation').onchange=e=>{const item=project.items.find(i=>i.id===selectedId);commit(updateItem(project,item.id,{rotation:+e.target.value}));};
$('#deleteBtn').onclick=()=>{commit(removeItem(project,selectedId));selectedId=null;renderAll();};
$('#duplicateBtn').onclick=()=>{const item=project.items.find(i=>i.id===selectedId),next=addItem(project,item,{x:item.x+.35,y:item.y+.35});selectedId=next.items.at(-1).id;commit(next);};
$('#floorPlanInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;const src=await compressImage(file);commit({...project,floorPlan:{src,opacity:.45,widthMeters:Math.max(1,bounds().width),visible:true}});loadFloorImage();};
$('#planOpacity').oninput=e=>{$('#opacityValue').value=`${e.target.value}%`;project={...project,floorPlan:{...project.floorPlan,opacity:+e.target.value/100}};persist();resize();};
$('#planWidth').onchange=e=>commit({...project,floorPlan:{...project.floorPlan,widthMeters:+e.target.value}});
$('#removePlanBtn').onclick=()=>{commit({...project,floorPlan:null});loadFloorImage();};
$('#drawWallBtn').onclick=()=>setDrawing(!drawingWalls);$('#clearWallsBtn').onclick=()=>{if(confirm('Clear all walls?'))commit({...project,walls:[]});};
$('#resetBtn').onclick=()=>{selectedId=null;setDrawing(false);commit(createProject());loadFloorImage();};
$('#zoomIn').onclick=()=>{zoom=Math.min(1.5,zoom+.1);$('#zoomLabel').textContent=Math.round(zoom*100)+'%';resize();};$('#zoomOut').onclick=()=>{zoom=Math.max(.6,zoom-.1);$('#zoomLabel').textContent=Math.round(zoom*100)+'%';resize();};
$('#shareBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);}catch{}$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800);};
renderSwatches('#wallSwatches',project.wallColor,c=>commit({...project,wallColor:c}));renderSwatches('#floorSwatches',project.floorColor,c=>commit({...project,floorColor:c}));buildCatalog();loadFloorImage();new ResizeObserver(resize).observe($('.canvas-wrap'));renderAll();

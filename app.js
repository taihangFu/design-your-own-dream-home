import { COLORS, furnitureCatalog, createProject, addItem, updateItem, removeItem } from './project.js';

const $ = s => document.querySelector(s);
const canvas = $('#roomCanvas'); const ctx = canvas.getContext('2d');
let project; try { project = JSON.parse(localStorage.getItem('roomplay-project')) || createProject(); } catch { project = createProject(); }
let selectedId = null, view = '3d', zoom = 1, drag = null, history = [], future = [], saveTimer, cw = 800, ch = 600;

function snapshot() { history.push(JSON.stringify(project)); if (history.length > 40) history.shift(); future = []; updateButtons(); }
function persist() { $('#saveState').innerHTML = '<span></span> Saving…'; clearTimeout(saveTimer); saveTimer = setTimeout(() => { localStorage.setItem('roomplay-project', JSON.stringify(project)); $('#saveState').innerHTML = '<span></span> Saved'; }, 250); }
function commit(next) { snapshot(); project = next; persist(); renderAll(); }
function undo() { if (!history.length) return; future.push(JSON.stringify(project)); project = JSON.parse(history.pop()); selectedId = null; persist(); renderAll(); }
function redo() { if (!future.length) return; history.push(JSON.stringify(project)); project = JSON.parse(future.pop()); selectedId = null; persist(); renderAll(); }
function updateButtons() { $('#undoBtn').disabled = !history.length; $('#redoBtn').disabled = !future.length; }

function iso(x,y,z=0){ const scale=48*zoom; return {x:cw/2+(x-y)*scale*.72, y:ch*.18+(x+y)*scale*.33-z*scale}; }
function plan(x,y){ const scale=Math.min(cw/11,ch/8)*zoom; return {x:cw/2+(x-5)*scale,y:ch/2+(y-3.75)*scale}; }
function poly(points,fill,stroke='#00000018'){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.stroke()}
function shade(hex,amt){const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,(n>>16)+amt)),g=Math.max(0,Math.min(255,((n>>8)&255)+amt)),b=Math.max(0,Math.min(255,(n&255)+amt));return `rgb(${r},${g},${b})`}
function drawBox(item, selected=false){let {x,y,w,d,h,color}=item; const rot=((item.rotation||0)/90)%2;if(rot){[w,d]=[d,w]} const p=[iso(x-w/2,y-d/2),iso(x+w/2,y-d/2),iso(x+w/2,y+d/2),iso(x-w/2,y+d/2)],t=p.map(q=>({x:q.x,y:q.y-h*48*zoom})); poly([p[0],p[1],t[1],t[0]],shade(color,-18));poly([p[1],p[2],t[2],t[1]],shade(color,-35));poly(t,color,selected?'#c26343':'#00000022');if(selected){ctx.strokeStyle='#c26343';ctx.lineWidth=2;ctx.setLineDash([4,3]);poly(t,'transparent','#c26343');ctx.setLineDash([])}}
function draw3d(){const floor=[iso(1,1),iso(9,1),iso(9,6.5),iso(1,6.5)];poly(floor,project.floorColor,'#b8ab99');for(let i=0;i<9;i++){const a=iso(1+i,1),b=iso(1+i,6.5);ctx.strokeStyle='#ffffff28';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}const wallH=2.7*48*zoom; const back=[iso(1,1),iso(9,1)];poly([back[0],back[1],{x:back[1].x,y:back[1].y-wallH},{x:back[0].x,y:back[0].y-wallH}],project.wallColor);const side=[iso(1,1),iso(1,6.5)];poly([side[0],side[1],{x:side[1].x,y:side[1].y-wallH},{x:side[0].x,y:side[0].y-wallH}],shade(project.wallColor,-12));[...project.items].sort((a,b)=>(a.x+a.y)-(b.x+b.y)).forEach(i=>drawBox(i,i.id===selectedId))}
function draw2d(){ctx.fillStyle='#f8f6f1';ctx.fillRect(0,0,cw,ch);const sc=Math.min(cw/11,ch/8)*zoom;ctx.strokeStyle='#e7e3dc';ctx.lineWidth=1;for(let x=0;x<=11;x++){let p=plan(x,0);ctx.beginPath();ctx.moveTo(p.x,0);ctx.lineTo(p.x,ch);ctx.stroke()}for(let y=0;y<=8;y++){let p=plan(0,y);ctx.beginPath();ctx.moveTo(0,p.y);ctx.lineTo(cw,p.y);ctx.stroke()}const room=[plan(1,1),plan(9,1),plan(9,6.5),plan(1,6.5)];poly(room,project.floorColor,'#333');ctx.lineWidth=8;ctx.strokeStyle=project.wallColor;ctx.stroke();project.items.forEach(i=>{let {w,d}=i;if(((i.rotation||0)/90)%2)[w,d]=[d,w];const p=plan(i.x-w/2,i.y-d/2);ctx.fillStyle=i.color;ctx.strokeStyle=i.id===selectedId?'#c26343':'#ffffffaa';ctx.lineWidth=i.id===selectedId?3:1;ctx.fillRect(p.x,p.y,w*sc,d*sc);ctx.strokeRect(p.x,p.y,w*sc,d*sc);ctx.fillStyle='#ffffff';ctx.font='600 9px DM Sans';ctx.textAlign='center';ctx.fillText(i.name,p.x+w*sc/2,p.y+d*sc/2+3)})}
function resize(){
  const rect=canvas.getBoundingClientRect(), dpr=devicePixelRatio||1;
  cw=rect.width; ch=rect.height;
  canvas.width=Math.round(cw*dpr); canvas.height=Math.round(ch*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cw,ch);
  view==='3d'?draw3d():draw2d();
}
function renderInspector(){const item=project.items.find(i=>i.id===selectedId);$('#noSelection').classList.toggle('hidden',!!item);$('#selectionEditor').classList.toggle('hidden',!item);if(!item)return;$('#selectedName').textContent=item.name;$('#rotation').value=item.rotation;$('#rotationValue').value=`${item.rotation}°`;$('#itemWidth').textContent=`${item.w.toFixed(2)} m`;$('#itemDepth').textContent=`${item.d.toFixed(2)} m`;renderSwatches('#itemSwatches',item.color,c=>commit(updateItem(project,item.id,{color:c})))}
function renderAll(){ $('#projectName').value=project.name; renderInspector(); updateButtons(); resize(); }
function renderSwatches(selector,active,onClick){const el=$(selector);el.innerHTML='';COLORS.forEach(c=>{const b=document.createElement('button');b.className='swatch'+(c===active?' active':'');b.style.background=c;b.ariaLabel=`Set color ${c}`;b.onclick=()=>onClick(c);el.append(b)})}
function buildCatalog(){const q=$('#search').value.toLowerCase();$('#catalog').innerHTML='';furnitureCatalog.filter(x=>x.name.toLowerCase().includes(q)).forEach(item=>{const b=document.createElement('button');b.className='catalog-item';b.style.setProperty('--item-color',item.color);b.innerHTML=`<span class="catalog-icon">${item.icon}</span><strong>${item.name}</strong><small>${item.w} × ${item.d} m</small>`;b.onclick=()=>{const next=addItem(project,item,{x:5+Math.random()*.5,y:3.5+Math.random()*.5});selectedId=next.items.at(-1).id;commit(next)};$('#catalog').append(b)})}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function hitTest(p){return [...project.items].reverse().find(item=>{if(view==='2d'){const c=plan(item.x,item.y),sc=Math.min(cw/11,ch/8)*zoom;return Math.abs(p.x-c.x)<item.w*sc/2+8&&Math.abs(p.y-c.y)<item.d*sc/2+8}const c=iso(item.x,item.y,item.h);return Math.hypot(p.x-c.x,p.y-c.y)<55})}
canvas.addEventListener('pointerdown',e=>{const p=canvasPoint(e),item=hitTest(p);selectedId=item?.id||null;if(item){snapshot();drag={id:item.id,start:p,original:{x:item.x,y:item.y}};canvas.setPointerCapture(e.pointerId)}renderAll()});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=canvasPoint(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;let x,y;if(view==='2d'){const sc=Math.min(cw/11,ch/8)*zoom;x=drag.original.x+dx/sc;y=drag.original.y+dy/sc}else{const sc=48*zoom;x=drag.original.x+(dx/1.44+dy/0.66)/sc;y=drag.original.y+(-dx/1.44+dy/0.66)/sc}x=Math.max(1.35,Math.min(8.65,x));y=Math.max(1.35,Math.min(6.15,y));project=updateItem(project,drag.id,{x,y});resize()});
canvas.addEventListener('pointerup',()=>{if(drag){drag=null;future=[];persist();renderInspector();updateButtons()}});

$('.viewbar').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));resize()});
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.add('hidden'));$(`#${b.dataset.panel}Panel`).classList.remove('hidden')});
$('#search').oninput=buildCatalog;$('#projectName').onchange=e=>commit({...project,name:e.target.value});$('#undoBtn').onclick=undo;$('#redoBtn').onclick=redo;
$('#rotation').oninput=e=>{const item=project.items.find(i=>i.id===selectedId);commit(updateItem(project,item.id,{rotation:+e.target.value}))};
$('#deleteBtn').onclick=()=>{commit(removeItem(project,selectedId));selectedId=null;renderAll()};
$('#duplicateBtn').onclick=()=>{const item=project.items.find(i=>i.id===selectedId);const next=addItem(project,item,{x:item.x+.35,y:item.y+.35});selectedId=next.items.at(-1).id;commit(next)};
$('#resetBtn').onclick=()=>{selectedId=null;commit(createProject())};
$('#zoomIn').onclick=()=>{zoom=Math.min(1.35,zoom+.1);$('#zoomLabel').textContent=Math.round(zoom*100)+'%';resize()};$('#zoomOut').onclick=()=>{zoom=Math.max(.65,zoom-.1);$('#zoomLabel').textContent=Math.round(zoom*100)+'%';resize()};
$('#shareBtn').onclick=async()=>{try{await navigator.clipboard.writeText(location.href)}catch{}$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800)};
renderSwatches('#wallSwatches',project.wallColor,c=>commit({...project,wallColor:c}));renderSwatches('#floorSwatches',project.floorColor,c=>commit({...project,floorColor:c}));buildCatalog();new ResizeObserver(resize).observe($('.canvas-wrap'));renderAll();

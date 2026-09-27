import {displayContour,humanField} from './optics.js';
import {DEVICES,deviceFov} from './device-catalog.js';
const $=s=>document.querySelector(s);
export function createFovComparison(state){
 let selected=new Set(DEVICES.filter(d=>d.initial).map(d=>d.id)),focus=null;
 try{const saved=JSON.parse(localStorage.getItem('xr-fov-devices-v5'));if(Array.isArray(saved))selected=new Set(saved.filter(id=>DEVICES.some(d=>d.id===id)));}catch{}
 const list=$('#device-list');
 const profile=d=>deviceFov(d,state.assumption,state.allowUnknownAxes);
 // Retired binocular links now open the angular overview.
 const url=new URL(location.href);if(url.searchParams.has('chart')){url.searchParams.delete('chart');history.replaceState({},'',url);}
 $('#allow-unknown-axes').addEventListener('change',e=>{state.allowUnknownAxes=e.target.checked;rows();render();});
 function save(){try{localStorage.setItem('xr-fov-devices-v5',JSON.stringify([...selected]));}catch{}}
 function rows(){list.innerHTML=DEVICES.map(d=>{
  const f=profile(d),approx=f?.status==='derived'||d.estimated,raw=d.fov;
  const rawText=typeof raw.value==='number'?`${raw.value}° · ${raw.axis==='unknown'?'轴向未知':'对角'}`:`${raw.value.h}° H × ${raw.value.v}° V`;
  const value=f?`${approx?'≈ ':''}${f.h.toFixed(approx?1:0)}° <em>H</em> × ${f.v.toFixed(approx?1:0)}° <em>V</em>`:'H / V 未知 · 不绘制';
  const basis=f?.axisAssumed?`${state.assumption==='horizontal'&&d.id==='aura'?'水平':'对角'}假设 · ${d.shape.ratio===1.6?'16:10':'16:9'} 画幅假设`:d.estimated?'建模估计区间':f?.status==='derived'?'官方对角 + 理想矩形换算':'来源 H / V';
  return `<div class="device-row" style="--device:${d.color}" data-device-row="${d.id}"><label><input type="checkbox" data-fov-device="${d.id}" ${selected.has(d.id)?'checked':''}><span class="device-swatch"></span><span><b>${d.name}</b><small>${d.kind} · ${d.basis}</small></span></label><button class="fov-value" data-focus-device="${d.id}" aria-label="突出 ${d.name}" aria-pressed="${focus===d.id}">${value}<span>${f?basis:rawText}</span></button>${d.id==='aura'?'<p class="device-assumption">16:10 为面板像素比例；光学可见画幅未确认。</p>':''}<details class="device-evidence"><summary>参数与证据 ↗</summary><p>${d.note}</p><dl><dt>原始参数</dt><dd>${rawText}</dd><dt>原始状态</dt><dd>${raw.status} · ${raw.confidence} 可信度</dd><dt>绘图状态</dt><dd>${f?.status||'unknown'}${f?.axisAssumed?' + assumed 轴向':''}</dd><dt>单/双眼范围</dt><dd>unknown · 来源未明确</dd><dt>可见形状</dt><dd>assumed · 对称直线投影矩形</dd><dt>核验日期</dt><dd>${raw.verifiedAt}</dd></dl><a href="${d.url}" target="_blank" rel="noreferrer">${d.source} ↗</a>${d.shape.axisEvidence?` · <a href="${d.shape.axisEvidence.source}" target="_blank" rel="noreferrer">对角记载（非实测）↗</a>`:''}</details></div>`;
 }).join('');}
 function render(){
  const human=humanField(state.eye),s=3.35,cx=400-(human.right-human.left)*s/2,cy=277+(human.up-human.down)*s/2;
  const path=points=>'M'+points.map(([x,y])=>`${(cx+x*s).toFixed(2)} ${(cy-y*s).toFixed(2)}`).join('L')+'Z';
  const outline=[];for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,x=Math.cos(a),y=Math.sin(a);outline.push([x*(x<0?human.left:human.right),y*(y>0?human.up:human.down)]);}
  const enabled=DEVICES.filter(d=>selected.has(d.id)),devices=enabled.filter(d=>profile(d)).sort((a,b)=>{const fa=profile(a),fb=profile(b);return fb.h*fb.v-fa.h*fa.v;});
  let svg=`<title>勾选设备的 FOV 叠加比较</title><desc>${devices.map(d=>{const f=profile(d);return `${d.name}：${f.h.toFixed(1)}° 水平、${f.v.toFixed(1)}° 垂直，${d.basis}`}).join('；')}</desc><defs><clipPath id="human-chart-clip"><path d="${path(outline)}"/></clipPath></defs><path d="${path(outline)}" fill="#e0e3d9" stroke="#b3bba9" stroke-width="1.5"/><g clip-path="url(#human-chart-clip)">`;
  for(let deg=-100;deg<=100;deg+=10){const x=cx+deg*s;svg+=`<path d="M${x} 30V535" stroke="#b5bfac" stroke-width="${deg===0?1:.4}"/>`;if(deg%20===0)svg+=`<text x="${x+4}" y="${cy+15}" fill="#7b8872" font-size="10">${deg}°</text>`;}
  for(let deg=-70;deg<=60;deg+=10){const y=cy-deg*s;svg+=`<path d="M35 ${y}H770" stroke="#b5bfac" stroke-width="${deg===0?1:.4}"/>`;}
  svg+='</g>';
  for(const d of devices){const f=profile(d),opacity=focus&&focus!==d.id?.16:1;
   if(d.rangeH){const outer=profile({...d,fov:{...d.fov,value:{...d.fov.value,h:d.rangeH[1]}}}),inner=profile({...d,fov:{...d.fov,value:{...d.fov.value,h:d.rangeH[0]}}});svg+=`<path d="${path(displayContour(outer))+path(displayContour(inner))}" fill="${d.color}" fill-opacity="${.17*opacity}" fill-rule="evenodd"/>`;}
   svg+=`<path data-fov-shape="${d.id}" d="${path(displayContour(f))}" fill="${d.color}" fill-opacity="${.035*opacity}" stroke="${d.color}" stroke-opacity="${opacity}" stroke-width="${focus===d.id?4:2}" ${d.estimated||f.axisAssumed?'stroke-dasharray="6 4"':''}/>`;
  }
  svg+=`<circle cx="${cx}" cy="${cy}" r="3" fill="#435340"/><path d="M${cx-8} ${cy}H${cx+8}M${cx} ${cy-8}V${cy+8}" stroke="#435340"/><text x="${cx-human.left*s-10}" y="${cy-12}" text-anchor="end" fill="#87937d" font-size="11">${human.left}°</text><text x="${cx+human.right*s+10}" y="${cy-12}" fill="#87937d" font-size="11">${human.right}°</text><text x="400" y="546" text-anchor="middle" fill="#7c8a72" font-size="12">${state.eye==='right'?'右':'左'}眼周边视野参考 · 上 60° / 下 75°</text>`;
  if(!devices.length)svg+='<text x="400" y="125" text-anchor="middle" fill="#66775a" font-size="18">勾选有足够角度数据的设备</text>';
  $('#fov-svg').innerHTML=svg;
  $('#fov-count').textContent=`${devices.length} 款已绘制${enabled.length>devices.length?` · ${enabled.length-devices.length} 款轴向未知`:""}`;
  $('#fov-legend').innerHTML=devices.map(d=>`<button data-focus-device="${d.id}" style="--device:${d.color}" aria-pressed="${focus===d.id}" aria-label="突出 ${d.name}"><i></i>${d.short}${d.estimated?' ≈':''}</button>`).join('');
  list.querySelectorAll('[data-device-row]').forEach(el=>{el.classList.toggle('selected',selected.has(el.dataset.deviceRow));el.classList.toggle('focused',focus===el.dataset.deviceRow);});
  list.querySelectorAll('[data-focus-device]').forEach(el=>el.setAttribute('aria-pressed',focus===el.dataset.focusDevice));
 }
 list.addEventListener('change',e=>{const id=e.target.dataset.fovDevice;if(!id)return;e.target.checked?selected.add(id):selected.delete(id);if(focus===id&&!selected.has(id))focus=null;save();render();});
 $('#fov').addEventListener('click',e=>{const focusButton=e.target.closest('[data-focus-device]'),preset=e.target.closest('[data-fov-preset]');if(focusButton){const id=focusButton.dataset.focusDevice;focus=focus===id?null:id;if(!selected.has(id)){selected.add(id);save();rows();}render();}if(preset){selected=new Set(preset.dataset.fovPreset==='all'?DEVICES.map(d=>d.id):preset.dataset.fovPreset==='glasses'?['meta','aura']:[]);focus=null;save();rows();render();}});
 rows();render();return {update(){rows();render();}};
}

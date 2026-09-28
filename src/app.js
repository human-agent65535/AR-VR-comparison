import './i18n.js';
import {readTint,saveTint} from './display-prefs.js';
import {readRoomTime,saveRoomTime,ROOM_TIME_LABELS} from './room-lighting.js';
import {createControlsLayout} from './controls-layout.js';
import {createExperience} from './engine.js';
import {createProductViewer} from './product.js';
import {getProfile} from './optics.js';
import {createFovComparison} from './fov-chart.js';
import {COMPONENTS} from './headsets.js';
import {RENDER_ASSUMPTIONS,SOURCES} from './device-data.js';
const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
const params=new URLSearchParams(location.search),deep=location.pathname.endsWith('room.html');
const state={mode:['meta','aura','quest3','split','room'].includes(params.get('mode'))?params.get('mode'):deep?'meta':'split',content:['cinema','work','earth','fov','vision','black'].includes(params.get('content'))?params.get('content'):'earth',comparePair:'quest3-meta',framing:'wearing',earthPlace:'newyork',earthZoom:RENDER_ASSUMPTIONS.earthApp.initialZoom,earthLayout:'compact',showVirtual:true,wearEdges:true,lensTint:true,allowUnknownAxes:true,pass:true,guides:true,eyeFilter:true,eye:'right',dim:readTint(params),timeOfDay:readRoomTime(params),assumption:'diagonal',quality:'auto',modelRx:false,rxMode:'off',rxLink:true,rxStrength:4,rx:{left:{sphere:3,cylinder:1,axis:90},right:{sphere:3,cylinder:1,axis:90}}};
document.body.classList.toggle('deep',deep);document.body.dataset.mode=state.mode;
createControlsLayout(state.mode);
if(deep)$('h1').textContent='从人眼出发，比较三款设备的视野。';
let toastTimer,experience,product,previousReadout='';
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function renderLabels(views) {
  const hasVR=views.some(v=>v.type==='meta'||v.type==='quest3');
  $('.pass-controls').hidden=state.content==='earth'||!hasVR;
  $('#meta-view-settings').hidden=state.content==='earth'||!hasVR;
  $('#aura-view-settings').hidden=!views.some(v=>v.type==='aura');
  $('#room-view-settings').hidden=state.content==='earth'&&views.every(v=>v.type==='quest3');
  const pass=state.content!=='earth'&&state.pass;
  let names='',labels='';
  for(const v of views) {
    const room=v.type==='room',meta=v.type==='meta',quest=v.type==='quest3',p=v.profile,b=v.bounds,s=v.projection.scale;
    const cx=v.x+v.projection.origin[0],cy=v.y+v.projection.origin[1];
    names+=`<div class="view-name ${v.type}" style="left:${v.x+17}px;top:${v.cellY+18}px"><i class="dot"></i><strong>${room?'裸眼 · 同一人眼窗口':meta?'VR Glasses':quest?'Meta Quest 3':'XREAL AURA'}</strong><span class="tag">${room?'ROOM':(meta||quest)?pass?'视频透视示意':'VR 黑底':`光学透视 · ${state.lensTint?'调光 '+state.dim+' / 5':'调光关闭'}`}</span></div>`;
    names+=`<div class="eye-caption" style="left:${v.x+17}px;top:${v.cellY+42}px">${state.eye==='right'?'右眼':'左眼'} · ${state.framing==='peripheral'?'固定注视全景':'聚焦预览'} · ${state.eyeFilter?'固定注视参考':'视野参考关闭'}</div>`;
    if(!room&&state.guides) {
      const label=(text,x,y)=>`<div class="layer-label" style="left:${Math.max(v.x+12,Math.min(x,v.x+v.w-135))}px;top:${y}px">${text}</div>`;
      labels+=`<div class="display-measure ${v.type}" data-fov-h="${p.h}" data-fov-v="${p.v}" data-display-width="${b.width}" data-display-height="${b.height}" style="left:${v.x+b.x}px;top:${v.y+b.y-24}px;width:${b.width}px">${p.h.toFixed(meta||quest?0:1)}° H${!meta&&!quest?' ≈':''}</div>`;
      labels+=`<div class="vertical-measure ${v.type}" style="left:${v.x+b.x+b.width+9}px;top:${v.y+b.y}px;height:${b.height}px"><span>${p.v.toFixed(meta||quest?0:1)}° V</span></div>`;
      labels+=label(meta||quest?'显示窗 · 视频透视 / VR':'显示范围 · 叠加在现实上',cx-40*s,cy+Math.min(42,p.v/2+9)*s);
      if(state.wearEdges&&state.framing==='peripheral')labels+=label(quest?'封闭面罩 · 不直视现实':meta?'边缘开口 · 直接看现实':'外层变色片 · 光学透视',cx+4*s,cy+64*s);

    }
  }
  for(const v of views.slice(1)) {const vertical=v.cellY>0;names+=`<div class="split-separator" style="${vertical?`top:${v.cellY-1}px;left:0;width:100%;height:1px`:`left:${v.x-1}px;top:0;height:100%;width:1px`}"></div>`;}
  const all=views.length===3;$('#compare-pairs').hidden=all;
  $('#compare-status').textContent=all?'宽屏 · 三款同屏':'空间有限 · 三选二';
  $('#viewport').dataset.viewCount=views.length;
  $('#view-labels').innerHTML=names;$('#optics-labels').innerHTML=labels;
}
function renderVisibility(result) {
  const key=JSON.stringify(result);if(key===previousReadout)return;previousReadout=key;
  for(const device of ['meta','aura','quest3']) {
    const visible=result[device];$('#readout-'+device).innerHTML=['C','A','B'].map(id=>`<span class="test-point ${visible.includes(id)?'visible':'clipped'}" title="${id}：${visible.includes(id)?'显示范围内':'被 FOV 裁掉'}">${id}<small>${visible.includes(id)?'可见':'裁掉'}</small></span>`).join('');
    $('#readout-'+device).setAttribute('aria-label',device+'：'+['C','A','B'].map(id=>id+(visible.includes(id)?'可见':'被裁掉')).join('，'));
  }
}
function updateUI() {
  document.body.dataset.mode=state.mode;
  const url=new URL(location.href);if(url.searchParams.get('mode')!==state.mode){url.searchParams.set('mode',state.mode);history.replaceState({},'',url);}
  $$('button[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));
  $$('[data-content]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.content===state.content));
  $$('[data-pass]').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.pass==='on')===state.pass));
  $('#compare-controls').hidden=state.mode!=='split';
  $$('[data-compare-pair]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.comparePair===state.comparePair));
  $('#earth-controls').hidden=state.content!=='earth';$$('[data-earth-place]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.earthPlace===state.earthPlace));
  $('#content-context').textContent=state.content==='earth'?(state.earthLayout==='compact'?'完整应用界面 · 三款共用中央布局；世界内容仍按各自 FOV 可见':'周边展开 · 工具栏放到视野之外，转头查看'):'相同世界位置、相同大小的虚拟内容';
  $('#calibration-readout').hidden=state.content!=='fov'||!state.showVirtual;
  experience?.update();
  $('#dimming').value=state.dim;$('#dim-value').textContent=state.dim+' / 5';
  $('#room-time').value=state.timeOfDay;$('#scene-time').textContent='高层公寓 · '+ROOM_TIME_LABELS[state.timeOfDay];
  $('#show-virtual').checked=state.showVirtual;$('#wear-edges').checked=state.wearEdges;$('#lens-tint').checked=state.lensTint;$('#display-state').textContent=state.showVirtual?'虚拟显示开启':!(state.content!=='earth'&&state.pass)&&['meta','quest3','split'].includes(state.mode)?'虚拟显示关闭 · VR 窗内黑底，外围由设备结构决定':'虚拟显示关闭 · 保留现实 / 透视背景';product?.setPrescription(state.modelRx);$('#model-rx').checked=state.modelRx;
}
let comparison;
function fovChart(){comparison?.update();}
try {
  experience=createExperience($('#viewport'),state,notify,renderLabels,status=>{const b=$('#gyro');b.dataset.status=status;b.textContent=status==='on'?'◎ 转动已开启':status==='waiting'?'◎ 等待方向数据…':'◎ 手机转动';b.setAttribute('aria-pressed',status==='on');},renderVisibility);
} catch(error){console.error(error);$('#fatal').hidden=false;$('#loading').hidden=true;}
$$('button[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;const u=new URL(location.href);u.searchParams.set('mode',state.mode);history.replaceState({},'',u);updateUI();}));
$$('[data-content]').forEach(b=>b.addEventListener('click',()=>{state.content=b.dataset.content;experience?.anchor();experience?.recenter(true);updateUI();}));
$$('[data-compare-pair]').forEach(b=>b.addEventListener('click',()=>{state.comparePair=b.dataset.comparePair;updateUI();}));
$('#framing').addEventListener('change',e=>{state.framing=e.target.value;updateUI();});
$$('[data-earth-place]').forEach(b=>b.addEventListener('click',()=>{state.earthPlace=b.dataset.earthPlace;updateUI();}));
$('#earth-layout').addEventListener('change',e=>{state.earthLayout=e.target.value;updateUI();});
$('#earth-zoom').addEventListener('input',e=>{state.earthZoom=+e.target.value;$('#earth-zoom-value').textContent=state.earthZoom.toFixed(2)+'×';experience?.update();});
$$('[data-pass]').forEach(b=>b.addEventListener('click',()=>{state.pass=b.dataset.pass==='on';updateUI();}));
for(const [id,key] of [['guides','guides'],['eye-filter','eyeFilter'],['show-virtual','showVirtual'],['lens-tint','lensTint'],['wear-edges','wearEdges']])$('#'+id).addEventListener('change',e=>{state[key]=e.target.checked;updateUI();});
$('#eye').addEventListener('change',e=>{state.eye=e.target.value;syncLab();fovChart();updateUI();});
$('#dimming').addEventListener('input',e=>{state.dim=+e.target.value;saveTint(state.dim);updateUI();});
$('#room-time').addEventListener('change',e=>{state.timeOfDay=e.target.value;saveRoomTime(state.timeOfDay);updateUI();});
$('#assumption').addEventListener('change',e=>{state.assumption=e.target.value;fovChart();updateUI();});
$('#quality').addEventListener('change',e=>{state.quality=e.target.value;experience?.update();});
$('#location').addEventListener('change',e=>experience?.moveTo(e.target.value));
$('#gyro').addEventListener('click',()=>experience?.toggleSensor());
$('#recenter').addEventListener('click',()=>experience?.recenter());
$('#reset-test').addEventListener('click',()=>{experience?.anchor();experience?.recenter();});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('#experience').requestFullscreen)await $('#experience').requestFullscreen();else notify('此浏览器不支持页面全屏，可横屏体验');}catch{notify('此浏览器不支持页面全屏，可横屏体验');}});
function syncLab(){
 const rx=state.rx[state.eye];
 for(const [id,value] of [['rx-sphere',rx.sphere],['rx-cylinder',rx.cylinder],['rx-axis',rx.axis],['rx-strength',state.rxStrength]])$('#'+id).value=value;
 $('#rx-eye-label').textContent=`正在设置${state.eye==='right'?'右':'左'}眼`;
 $('#rx-sphere-value').textContent=`${rx.sphere?'−':' '}${rx.sphere.toFixed(2)} D · ${Math.round(rx.sphere*100)} 度`;
 $('#rx-cylinder-value').textContent=`${rx.cylinder?'−':' '}${rx.cylinder.toFixed(2)} D · ${Math.round(rx.cylinder*100)} 度`;
 $('#rx-axis-value').textContent=rx.axis+'°';$('#rx-strength-value').textContent=state.rxStrength+'×';
 $('#lab-summary').textContent=state.rxMode==='off'?'视力模拟关闭 · AURA 两层框':`${state.rxMode==='inserts'?'已戴处方片 · AURA 三层框':'未矫正 · AURA 两层框'} · 近视 ${Math.round(rx.sphere*100)} 度 / 散光 ${Math.round(rx.cylinder*100)} 度`;
 $$('[data-rx-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rxMode===state.rxMode));
}
$$('[data-rx-mode]').forEach(b=>b.addEventListener('click',()=>{state.rxMode=b.dataset.rxMode;syncLab();updateUI();}));
$('#model-diagnostic').addEventListener('change',e=>{product?.setDiagnostic(e.target.checked);$('#model-diagnostic-key').hidden=!e.target.checked;});
$('#model-rx').addEventListener('change',e=>{state.modelRx=e.target.checked;product?.setPrescription(state.modelRx);});
$('#rx-link').addEventListener('change',e=>{state.rxLink=e.target.checked;if(state.rxLink){state.rx[state.eye==='right'?'left':'right']={...state.rx[state.eye]};}updateUI();});
for(const [id,key] of [['rx-sphere','sphere'],['rx-cylinder','cylinder'],['rx-axis','axis']])$('#'+id).addEventListener('input',e=>{state.rx[state.eye][key]=+e.target.value;if(state.rxLink)state.rx[state.eye==='right'?'left':'right'][key]=+e.target.value;if(state.rxMode==='off')state.rxMode='inserts';syncLab();updateUI();});
$('#rx-strength').addEventListener('input',e=>{state.rxStrength=+e.target.value;syncLab();updateUI();});
$('#component-legend').innerHTML=Object.values(COMPONENTS).map(p=>`<span><i style="background:${p.color}"></i>${p.name}</span>`).join('');
const descriptions={meta:{type:'OPAQUE OPTICS / VR',name:'VR Glasses',summary:'连续的深灰织物覆盖内侧，两片小尺寸镀膜透镜嵌在布面包裹中。独立处方片贴合镜片口径；前方仍被遮住，透视通过显示窗呈现。',parts:['包裹|连续布面、软质镜杯与包边','内层|两片镀膜 pancake 透镜','眼侧|贴合镜片口径的处方片'],url:'https://about.fb.com/news/2026/09/introducing-meta-vr-glasses-3d-movies-immersive-live-sports-100-grams/'},aura:{type:'OPTICAL SEE-THROUGH / AR',name:'XREAL AURA',summary:'宽棱镜的直顶紧接厚实上壳，鼻侧连接支座；外层调光片主要向下方和外侧延伸，形成不等宽的透光区。挂式处方片独立位于眼侧。结构比例按官方特写估计，观看模拟独立绘制。',parts:['外层 C|更靠前的调光镜片','内层 B|光学组件 / 出光区域示意','眼侧 A|可拆卸的挂式处方片'],url:SOURCES.auraPresence}};
try{product=createProductViewer($('#product-stage'),device=>{const d=descriptions[device];$('#product-type').textContent=d.type;$('#product-name').textContent=d.name;$('#product-summary').textContent=d.summary;$('#product-parts').innerHTML=d.parts.map(p=>`<li><span>${p.split('|')[0]}</span>${p.split('|')[1]}</li>`).join('');$('#product-source').href=d.url;$$('[data-product]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.product===device));});}catch(error){console.error('Model viewer:',error);$('#product-stage').insertAdjacentHTML('beforeend','<p class="model-disclaimer">当前设备无法打开第二个 3D 视图，请参考右侧官方产品图。</p>');}
$$('[data-product]').forEach(b=>b.addEventListener('click',()=>product?.setDevice(b.dataset.product)));$$('[data-view]').forEach(b=>b.addEventListener('click',()=>{product?.setView(b.dataset.view);$$('[data-view]').forEach(button=>button.setAttribute('aria-pressed',button===b));}));comparison=createFovComparison(state);syncLab();updateUI();

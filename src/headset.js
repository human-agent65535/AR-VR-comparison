import {t} from './i18n.js';
import {readTint,saveTint} from './display-prefs.js';
import {readRoomTime,saveRoomTime,ROOM_TIMES} from './room-lighting.js';
import * as T from 'three';
import {createRoom} from './room.js';
import {createContent} from './content.js';
import {RENDER_ASSUMPTIONS} from './device-data.js';
import {createHeadsetOptics} from './xr-optics.js';
import {XR_PROFILES,projectionProfile,previewVerticalFov,usesPassthrough,centeredContentOrientation,headsetAlignment} from './xr-math.js';
import {XR_CONTENTS,XR_MENU,xrControls,xrMenuButtons} from './xr-menu.js';
import {createXRMenuInput} from './xr-input.js';
import {createXRVision,XR_VISION_MODES} from './xr-vision.js';

const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
const state={profile:XR_PROFILES.includes(params.get('profile'))?params.get('profile'):'quest3',content:XR_CONTENTS.includes(params.get('content'))?params.get('content'):'earth',style:'auto',guides:true,dim:readTint(params),timeOfDay:readRoomTime(params),place:'newyork',earthLayout:'compact'};
const names={quest3:'Quest 3 · 原生基准',meta:'VR Glasses · 70° × 66°',aura:'AURA · ≈61.4° × 40.7°'};
state.vision=XR_VISION_MODES.includes(params.get('vision'))?params.get('vision'):'off';
state.alignment=params.get('align')==='forward'?'forward':'balanced';
const viewAlignment={mode:state.alignment,pitchDegrees:0};
const renderer=new T.WebGLRenderer({antialias:true,stencil:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.autoClear=false;
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.xr.cameraAutoUpdate=false;renderer.xr.setFramebufferScaleFactor(1);
renderer.xr.setFoveation(0);
$('#xr-stage').prepend(renderer.domElement);
const room=createRoom(renderer),content=createContent();room.setTime(state.timeOfDay);
const rig=new T.Group();rig.position.set(0,1.62,2.9);room.scene.add(rig);
const camera=new T.PerspectiveCamera(108,1,.03,260);rig.add(camera);
content.anchor(rig.position);content.setContent(state.content);
const optics=createHeadsetOptics(renderer,content.scene),menuScene=new T.Scene();
const vision=createXRVision(renderer);
function setViewAlignment(pitch){
 viewAlignment.mode=state.alignment;viewAlignment.pitchDegrees=pitch;
 optics.setAlignment(pitch);vision.setAlignment(pitch);
}
function refreshViewAlignment(){
 const eyes=renderer.xr.isPresenting?renderer.xr.getCamera().cameras:[];
 setViewAlignment(headsetAlignment(eyes.map(eye=>projectionProfile(eye.projectionMatrix)),state.alignment));
}

const menuCanvas=document.createElement('canvas');menuCanvas.width=XR_MENU.width*XR_MENU.pixelRatio;menuCanvas.height=XR_MENU.height*XR_MENU.pixelRatio;
const menuTexture=new T.CanvasTexture(menuCanvas);menuTexture.colorSpace=T.SRGBColorSpace;
menuTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const menu=new T.Mesh(new T.PlaneGeometry(XR_MENU.worldWidth,XR_MENU.worldWidth*XR_MENU.height/XR_MENU.width),new T.MeshBasicMaterial({map:menuTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));menu.visible=false;menuScene.add(menu);
const dockCanvas=document.createElement('canvas');dockCanvas.width=768;dockCanvas.height=216;
const dockTexture=new T.CanvasTexture(dockCanvas);dockTexture.colorSpace=T.SRGBColorSpace;dockTexture.anisotropy=menuTexture.anisotropy;
const menuDock=new T.Mesh(new T.PlaneGeometry(XR_MENU.dock.width,XR_MENU.dock.height),new T.MeshBasicMaterial({map:dockTexture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));menuDock.visible=false;menuScene.add(menuDock);
let menuButtons=[],hoveredButton=null,inputMode='none';
function drawMenu(){
 const c=menuCanvas.getContext('2d');c.setTransform(XR_MENU.pixelRatio,0,0,XR_MENU.pixelRatio,0,0);c.clearRect(0,0,XR_MENU.width,XR_MENU.height);
 menuButtons=xrMenuButtons(state);const bottom=Math.max(...menuButtons.map(b=>b.y+b.h))+20;
 c.fillStyle='#102129f5';c.beginPath();c.roundRect(0,0,XR_MENU.width,bottom,24);c.fill();
 c.fillStyle='#dae8e0';c.textAlign='left';c.textBaseline='middle';c.font='500 28px sans-serif';c.fillText('FOV LAB  /  '+t(names[state.profile]),28,37);c.textAlign='center';
 for(const b of menuButtons){
  c.fillStyle=b.active?'#376852':'#293f49';c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,14);c.fill();
  if(hoveredButton==='menu:'+b.id){c.strokeStyle='#bce8d4';c.lineWidth=4;c.stroke();}
  c.fillStyle='#fffef8';c.font=`600 ${b.header?28:44}px sans-serif`;const lines=b.label.split('\n');
  lines.forEach((line,i)=>c.fillText(t(line),b.x+b.w/2,b.y+b.h/2+(i-(lines.length-1)/2)*(b.header?32:48)));
 }
 menuTexture.needsUpdate=true;
 const d=dockCanvas.getContext('2d');d.clearRect(0,0,768,216);d.fillStyle='#132b32e8';d.beginPath();d.roundRect(0,0,768,216,55);d.fill();
 d.fillStyle='#f2f7ed';d.textAlign='center';d.textBaseline='middle';d.font='600 64px sans-serif';d.fillText(t('控制菜单'),384,82);
 d.fillStyle='#c3d4c9';d.font='400 37px sans-serif';d.fillText(t(inputMode==='hands'?'指向捏合 / 长捏呼出':inputMode==='controllers'?'握把呼出 / 扳机选择':'请启用双手或控制器'),384,155);dockTexture.needsUpdate=true;
}
function openMenu(){
 if(!renderer.xr.isPresenting)return;
 const head=renderer.xr.getCamera();head.getWorldPosition(headPosition);head.getWorldQuaternion(headQuaternion);
 menu.position.set(0,XR_MENU.verticalOffset,-XR_MENU.distance).applyQuaternion(headQuaternion).add(headPosition);menu.quaternion.copy(headQuaternion);menu.updateMatrixWorld(true);
 menu.visible=true;menuDock.visible=false;
}
function hideMenu(){menu.visible=false;menuDock.visible=renderer.xr.isPresenting;hoveredButton=null;}
function selectMenu(id){
 if(id==='hide'){hideMenu();return;}
 if(XR_PROFILES.includes(id))state.profile=id;
 else if(id==='content')state.content=XR_CONTENTS[(XR_CONTENTS.indexOf(state.content)+1)%XR_CONTENTS.length];
 else if(id==='place')state.place={atlantic:'newyork',newyork:'tokyo',tokyo:'atlantic'}[state.place];
 else if(id==='layout')state.earthLayout=state.earthLayout==='compact'?'wide':'compact';
 else if(id==='style')state.style={auto:'vr',vr:'passthrough',passthrough:'auto'}[state.style];
 else if(id==='tint'){state.dim=state.dim%5+1;saveTint(state.dim);}
 else if(id==='time'){state.timeOfDay=ROOM_TIMES[(ROOM_TIMES.indexOf(state.timeOfDay)+1)%ROOM_TIMES.length];saveRoomTime(state.timeOfDay);}
 else if(id==='guides')state.guides=!state.guides;
 else if(id==='eyes')state.vision=XR_VISION_MODES[(XR_VISION_MODES.indexOf(state.vision)+1)%XR_VISION_MODES.length];
 else if(id==='recenter'){recenter();hideMenu();return;}
 else if(id==='exit'){renderer.xr.getSession()?.end();return;}
 sync();
 if(XR_PROFILES.includes(id)||id==='content')hideMenu();
}
const raycaster=new T.Raycaster(),tempRotation=new T.Matrix4();
function menuHit(controller){
 const target=menu.visible?menu:menuDock;if(!target.visible)return null;
 controller.updateWorldMatrix(true,false);tempRotation.identity().extractRotation(controller.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(tempRotation);
 const hit=raycaster.intersectObject(target,false)[0];if(!hit)return null;
 if(target===menuDock){hit.key='dock';return hit;}
 const x=hit.uv.x*XR_MENU.width,y=(1-hit.uv.y)*XR_MENU.height;
 const b=menuButtons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(!b)return null;
 hit.key='menu:'+b.id;hit.button=b.id;return hit;
}
const input=createXRMenuInput(renderer,rig,menuScene,{
 hitTest:menuHit,canSummon:()=>!menu.visible,onToggle:()=>menu.visible?hideMenu():openMenu(),
 onSelect:hit=>{if(!hit.object.visible)return;if(hit.key==='dock')openMenu();else selectMenu(hit.button);},
 onHover:key=>{hoveredButton=key;drawMenu();},onMode:mode=>{inputMode=mode;drawMenu();}
});
const headPosition=new T.Vector3(),headQuaternion=new T.Quaternion(),dockEuler=new T.Euler(0,0,0,'YXZ'),dockOrientation=new T.Quaternion();let dockPitch=0;
function recenter(){const head=renderer.xr.isPresenting?renderer.xr.getCamera():camera;head.getWorldPosition(headPosition);head.getWorldQuaternion(headQuaternion);const orientation=centeredContentOrientation(headQuaternion,viewAlignment.pitchDegrees);content.anchor(headPosition,orientation);dockPitch=dockEuler.setFromQuaternion(orientation,'YXZ').x;}
function sync(){
  const controls=xrControls(state);
  optics.update(state);vision.update(state);content.setContent(state.content);content.setEarth(state.place,RENDER_ASSUMPTIONS.earthApp.initialZoom,state.earthLayout);room.setTime(state.timeOfDay);
  $('#xr-vision').value=state.vision;
  $('#xr-alignment').value=state.alignment;
  $('#xr-profile').value=state.profile;$('#xr-content').value=state.content;$('#xr-style').value=state.style;$('#xr-guides').checked=state.guides;
  $('#xr-earth-layout').value=state.earthLayout;$('#xr-earth-settings').hidden=!controls.earth;
  $('#xr-dimming').value=state.dim;$('#xr-dim-value').textContent=state.dim+' / 5';
  $('#xr-room-time').value=state.timeOfDay;$('#xr-room-settings').hidden=!controls.room;
  $('#xr-meta-settings').hidden=!controls.style;$('#xr-aura-settings').hidden=!controls.tint;$('.xr-guide-toggle').hidden=!controls.guides;
  $('#xr-current').textContent=names[state.profile]+(state.profile==='aura'?` · 调光 ${state.dim} / 5`:'');
  $('#xr-description').textContent=state.profile==='quest3'?'原生基准不施加目标 FOV 遮罩；实际投影由头显逐眼提供。':state.profile==='aura'?`光学 AR 示意 · 调光 ${state.dim} / 5：显示窗与光学开口共用窗口中心；四边截边、上壳和鼻托分别绘制，外片下缘与外侧保留余光。`:`${state.style==='auto'?'跟随应用 · ':''}${usesPassthrough(state)?'显示窗内保留公寓透视背景':'显示窗内使用 VR 黑底'}。按 70° × 66° 显示，已移除入口胶圈和额外角部裁切；外围遮挡与下缘、外侧余光为估计。`;
  drawMenu();
}
for(const [id,key] of [['xr-profile','profile'],['xr-content','content'],['xr-style','style'],['xr-earth-layout','earthLayout'],['xr-vision','vision']])$('#'+id).addEventListener('change',e=>{state[key]=e.target.value;sync();});
$('#xr-guides').addEventListener('change',e=>{state.guides=e.target.checked;sync();});
$('#xr-dimming').addEventListener('input',e=>{state.dim=+e.target.value;saveTint(state.dim);sync();});
$('#xr-room-time').addEventListener('change',e=>{state.timeOfDay=e.target.value;saveRoomTime(state.timeOfDay);sync();});
$('#xr-recenter').addEventListener('click',recenter);
$('#xr-alignment').addEventListener('change',e=>{
 state.alignment=e.target.value;refreshViewAlignment();recenter();sync();
 const url=new URL(location.href);url.searchParams.set('align',state.alignment);history.replaceState(null,'',url);
});
let supported=false,starting=false,pendingStart=false;
async function detect(){if(!isSecureContext){$('#xr-status').textContent='请使用 HTTPS 页面打开。';return;}try{supported=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');}catch{supported=false;}$('#enter-vr').disabled=!supported;$('#enter-vr').textContent=supported?'进入头显 VR':'请在 Quest 浏览器中打开';$('#xr-status').textContent=supported?'WebXR 已就绪 · 戴上头显后进入':'当前浏览器未提供沉浸式 VR；下方可预览裁切，Quest 3 请打开同一链接。';}
// Restore the desktop camera only after Three has released the XR framebuffer.
renderer.xr.addEventListener('sessionend',()=>{hideMenu();menuDock.visible=false;setViewAlignment(0);document.body.classList.remove('xr-active');camera.position.set(0,0,0);camera.rotation.set(0,0,0);rig.position.set(0,1.62,2.9);content.anchor(rig.position);$('#xr-status').textContent='已退出 VR，可以再次进入。';$('#enter-vr').disabled=false;resize();});
$('#enter-vr').addEventListener('click',async()=>{if(!supported||starting)return;starting=true;$('#enter-vr').disabled=true;try{const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','hand-tracking']});pendingStart=true;await renderer.xr.setSession(session);document.body.classList.add('xr-active');$('#xr-status').textContent='VR 运行中 · 握把键或长捏呼出，扳机或捏合选择';}catch(error){console.error(error);$('#xr-status').textContent='未进入 VR：'+(error.name==='NotAllowedError'?'权限未获允许，请再次点击进入。':error.message);$('#enter-vr').disabled=false;}finally{starting=false;}});
function resize(){if(renderer.xr.isPresenting)return;const host=$('#xr-stage');renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.fov=previewVerticalFov(camera.aspect);camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('#xr-stage'));
let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{if(renderer.xr.isPresenting)return;drag={x:e.clientX,y:e.clientY,yaw:camera.rotation.y,pitch:camera.rotation.x};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(drag)camera.rotation.set(T.MathUtils.clamp(drag.pitch-(e.clientY-drag.y)*.003,-1.2,1.2),drag.yaw-(e.clientX-drag.x)*.003,0,'YXZ');});for(const ev of ['pointerup','pointercancel'])renderer.domElement.addEventListener(ev,()=>drag=null);
renderer.domElement.addEventListener('webglcontextlost',()=>{$('#xr-status').textContent='图形上下文丢失，请刷新页面后重新进入。';renderer.setAnimationLoop(null);});
function drawWorld(viewCamera){
  renderer.setClearColor('#050b13',1);renderer.clear();
  if(state.profile!=='quest3'||state.content!=='earth'){renderer.render(room.scene,viewCamera);renderer.clearDepth();}
  optics.beforeContent(viewCamera);renderer.render(content.scene,viewCamera);
}
renderer.setAnimationLoop(()=>{
  rig.updateMatrixWorld(true);if(renderer.xr.isPresenting)renderer.xr.updateCamera(camera);
  if(renderer.xr.isPresenting&&pendingStart){rig.position.y=1.62-camera.position.y;rig.updateMatrixWorld(true);renderer.xr.updateCamera(camera);refreshViewAlignment();recenter();hideMenu();pendingStart=false;}
  vision.render(camera,drawWorld);optics.afterContent(camera);
  if(renderer.xr.isPresenting){const head=renderer.xr.getCamera();head.getWorldPosition(headPosition);head.getWorldQuaternion(headQuaternion);
    // The dock stays below the recentered viewing direction. It follows yaw
    // but not live pitch, so looking farther down can still reveal it.
    if(menuDock.visible){dockEuler.setFromQuaternion(headQuaternion,'YXZ');dockEuler.x=dockPitch;dockEuler.z=0;dockOrientation.setFromEuler(dockEuler);menuDock.position.set(0,XR_MENU.dock.verticalOffset,-XR_MENU.dock.distance).applyQuaternion(dockOrientation).add(headPosition);menuDock.lookAt(headPosition);menuDock.updateMatrixWorld(true);}
    input.update(menu.visible);
    // Tracked hands/controllers stay visible; long rays are limited to the menu.
    renderer.clearDepth();renderer.render(menuScene,camera);
  }
});sync();resize();detect();

window.addEventListener('languagechange',drawMenu);

import * as T from 'three';
import {createRoom} from './room.js';
import {createContent} from './content.js';
import {renderResolution} from './render-quality.js';
import {getProfile,projection,projectedBounds,inDisplayRay} from './optics.js';
import {RENDER_ASSUMPTIONS} from './device-data.js';
import {opticalFragment} from './optical-shader.js';
import {deviceQuaternion,recenterOffset,relativeOrientation} from './orientation.js';
import {comparisonLayout,THREE_VIEW_MIN_WIDTH} from './comparison-layout.js';
import {metaAmbient} from './room-lighting.js';

export function createExperience(host,state,notify,onViewChange,onSensorChange,onVisibilityChange) {
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  renderer.autoClear=false;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  host.prepend(renderer.domElement);
  let roomDirty=true,depthDirty=true,contentDirty=true,lastContent=null,lastEarth=null,cubeSize=512,contentCubeSize=512;
  const captures={room:0,depth:0,content:0};
  const room=createRoom(renderer,()=>{roomDirty=depthDirty=true;}),content=createContent(()=>{contentDirty=true;});
  renderer.shadowMap.needsUpdate=true;
  const camera=new T.PerspectiveCamera();
  camera.rotation.order='YXZ';camera.position.set(0,1.62,2.9);
  const destination=camera.position.clone(),capturedPosition=new T.Vector3(Infinity,0,0);
  content.anchor(destination);
  const options={type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter};
  const roomTarget=new T.WebGLCubeRenderTarget(cubeSize,options);
  const contentTarget=new T.WebGLCubeRenderTarget(cubeSize,options);
  const depthTarget=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,minFilter:T.LinearFilter,generateMipmaps:false});
  const depthCapture=new T.CubeCamera(.06,260,depthTarget);
  const depthMaterial=new T.ShaderMaterial({vertexShader:`varying vec3 worldP;void main(){vec4 p=vec4(position,1.);
#ifdef USE_INSTANCING
p=instanceMatrix*p;
#endif
worldP=(modelMatrix*p).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);}`,fragmentShader:'varying vec3 worldP;void main(){gl_FragColor=vec4(length(worldP-cameraPosition),0.,0.,1.);}',toneMapped:false});
  const roomCapture=new T.CubeCamera(.06,260,roomTarget),contentCapture=new T.CubeCamera(.04,100,contentTarget);
  const post=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const u={showVirtual:{value:1},lensTint:{value:1},wearEdges:{value:1},eyeSide:{value:1},virtualFocus:{value:RENDER_ASSUMPTIONS.prescription.virtualFocusM},observerField:{value:new T.Vector2(RENDER_ASSUMPTIONS.observerCameraFov.h,RENDER_ASSUMPTIONS.observerCameraFov.v)},depthTex:{value:depthTarget.texture},rxMode:{value:0},rxSphere:{value:3},rxCylinder:{value:1},rxAxis:{value:90},rxStrength:{value:4},roomTex:{value:roomTarget.texture},contentTex:{value:contentTarget.texture},angularSpan:{value:new T.Vector2()},angularCenter:{value:new T.Vector2()},viewQuaternion:{value:new T.Vector4(0,0,0,1)},humanBounds:{value:new T.Vector4()},displayFrustum:{value:new T.Vector4()},device:{value:1},pass:{value:1},transmission:{value:.65},guides:{value:1},eyeFilter:{value:1}};
  const material=new T.ShaderMaterial({uniforms:u,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:opticalFragment});
  Object.assign(u,{metaCloth:{value:.38},metaVeil:{value:.012},metaLightColor:{value:new T.Vector3(1,.88,.74)}});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
  let w=1,h=1,views=[],drag=null,running=true,onscreen=true,gyro=false,gyroPending=false;
  let raw=null,offset=null,sensorTimer,yaw=0,pitch=0,frames=0,lastReadout=0;
  const targetQ=new T.Quaternion(),clock=new T.Clock(),euler=new T.Euler(0,0,0,'YXZ'),keys=new Set();
  const inverseView=new T.Quaternion(),direction=new T.Vector3(),up=new T.Vector3(0,1,0);
  function resize() {
    host.classList.toggle('stacked',state.mode==='split'&&host.clientWidth<660);
    const split=state.mode==='split',columns=split?(host.clientWidth>=THREE_VIEW_MIN_WIDTH?3:host.clientWidth<660?1:2):1;
    const cellWidth=Math.floor((host.clientWidth-columns+1)/columns);
    const field=state.framing==='peripheral'?RENDER_ASSUMPTIONS.observerCameraFov:RENDER_ASSUMPTIONS.wearingCameraFov;
    host.style.setProperty('--view-height',Math.round((cellWidth*field.v/field.h+80)*(split&&columns===1?2:1))+'px');
    w=host.clientWidth;h=host.clientHeight;if(w<1||h<1)return;
    const coarse=matchMedia('(pointer:coarse)').matches;
    if(room.setQuality(state.quality,coarse))roomDirty=true;
    const resolution=renderResolution({quality:state.quality,coarse,pixelRatio:devicePixelRatio,cellWidth,fieldH:field.h,maxCubeSize:renderer.capabilities.maxCubemapSize});
    renderer.setPixelRatio(resolution.dpr);renderer.setSize(w,h,false);
    if(cubeSize!==resolution.room){cubeSize=resolution.room;roomTarget.setSize(cubeSize,cubeSize);roomDirty=true;}
    if(contentCubeSize!==resolution.content){contentCubeSize=resolution.content;contentTarget.setSize(contentCubeSize,contentCubeSize);contentDirty=true;}
    if(state.mode==='split') {
      views=comparisonLayout(w,h,state.comparePair);
    } else views=[{type:state.mode,x:0,y:0,w,h}];
    // Device captions live outside the optical image, so a large Quest field does
    // not collide with its title or force additional black optical margins.
    views=views.map(v=>({...v,cellY:v.y,cellH:v.h,y:v.y+64,h:Math.max(1,v.h-80)}));
    onViewChange(views.map(v=>({...v,profile:getProfile(v.type==='room'?'meta':v.type,state.assumption,undefined,state.eye),projection:projection(v.w,v.h,state.eye,state.framing),bounds:projectedBounds(getProfile(v.type==='room'?'meta':v.type,state.assumption,undefined,state.eye),v.w,v.h,state.eye,state.framing)})));
  }
  function update() {
    if(room.setTime(state.timeOfDay))roomDirty=true;
    const ambient=metaAmbient(state.timeOfDay);u.metaCloth.value=ambient.cloth;u.metaVeil.value=ambient.veil;u.metaLightColor.value.fromArray(ambient.color);
    if(state.content!==lastContent){content.setContent(state.content);lastContent=state.content;contentDirty=true;}
    const earthKey=state.earthPlace+':'+state.earthZoom+':'+state.earthLayout;if(earthKey!==lastEarth){content.setEarth(state.earthPlace,state.earthZoom,state.earthLayout);lastEarth=earthKey;contentDirty=true;}
    u.pass.value=state.content!=='earth'&&state.pass?1:0;u.transmission.value=RENDER_ASSUMPTIONS.auraTransmission.coefficients[state.dim-1];u.showVirtual.value=state.showVirtual?1:0;u.lensTint.value=state.lensTint?1:0;
    u.wearEdges.value=state.wearEdges?1:0;u.eyeSide.value=state.eye==='left'?-1:1;u.guides.value=state.guides?1:0;u.eyeFilter.value=state.eyeFilter?1:0;
    const rx=state.rx?.[state.eye]||{sphere:0,cylinder:0,axis:0};
    u.rxMode.value={off:0,uncorrected:1,inserts:2}[state.rxMode]||0;u.rxSphere.value=rx.sphere;u.rxCylinder.value=rx.cylinder;u.rxAxis.value=rx.axis;u.rxStrength.value=state.rxStrength||1;
    lastReadout=0;resize();
  }
  function anchor(){content.anchor(destination);contentDirty=true;}
  function recenter(silent=false){yaw=0;pitch=0;camera.rotation.set(0,0,0);targetQ.copy(camera.quaternion);if(raw)offset=recenterOffset(raw,camera.quaternion);if(!silent)notify('已回到标尺正前方');}
  function stopSensor(message){gyro=false;gyroPending=false;clearTimeout(sensorTimer);window.removeEventListener('deviceorientation',orientation);const e=new T.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=T.MathUtils.clamp(e.x,-1.35,1.35);onSensorChange('off');if(message)notify(message);}
  function orientation(event){if(!gyro||event.alpha===null||event.beta===null||event.gamma===null)return;raw=deviceQuaternion(event.alpha,event.beta,event.gamma,screen.orientation?.angle??window.orientation??0);if(!offset)offset=recenterOffset(raw,camera.quaternion);targetQ.copy(relativeOrientation(raw,offset));if(gyroPending){gyroPending=false;clearTimeout(sensorTimer);onSensorChange('on');notify('已连接方向传感器；转动手机环顾，点回正重新校准');}}
  async function toggleSensor(){if(gyro){stopSensor('已切换到拖动视角');return;}if(!isSecureContext){notify('请通过 HTTPS 链接打开，才能使用手机方向传感器');return;}if(!window.DeviceOrientationEvent){notify('当前设备没有方向传感器，可继续拖动体验');return;}try{if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted'){notify('方向权限未获允许，可继续拖动体验');return;}gyro=true;gyroPending=true;offset=null;raw=null;onSensorChange('waiting');window.addEventListener('deviceorientation',orientation);sensorTimer=setTimeout(()=>{if(gyroPending)stopSensor('未收到方向数据，请在手机 Safari / Chrome 中打开');},6500);}catch{stopSensor('无法获取方向权限，请在浏览器设置中允许后重试');}}
  const locations={lounge:[0,1.62,2.9],desk:[-.5,1.55,-1.15],window:[-2.65,1.65,-2.4]};
  function moveTo(where){destination.fromArray(locations[where]);anchor();recenter();}
  host.addEventListener('pointerdown',e=>{if(gyro||e.target.closest('button,a'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch};host.setPointerCapture(e.pointerId);host.focus({preventScroll:true});});
  host.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw=drag.yaw-(e.clientX-drag.x)*.004;pitch=T.MathUtils.clamp(drag.pitch-(e.clientY-drag.y)*.004,-1.35,1.35);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,()=>{drag=null;});
  window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);}});
  window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();drag=null;});document.addEventListener('visibilitychange',()=>{keys.clear();clock.getDelta();});screen.orientation?.addEventListener('change',()=>{offset=null;resize();});
  new IntersectionObserver(entries=>{onscreen=entries[0].isIntersecting;clock.getDelta();},{rootMargin:'100px'}).observe(host);new ResizeObserver(resize).observe(host);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();running=false;document.getElementById('fatal').hidden=false;});
  function capture(captureCamera,scene,alpha) {
    renderer.setScissorTest(false);renderer.autoClear=true;renderer.setClearColor(scene.background||0,alpha);
    captureCamera.position.copy(camera.position);captureCamera.update(renderer,scene);renderer.autoClear=false;
  }
  function updateReadout(now) {
    if(!onVisibilityChange||now-lastReadout<150)return;
    inverseView.copy(camera.quaternion).invert();
    const markers=content.getMarkers().map(m=>({id:m.id,ray:m.position.clone().sub(camera.position).applyQuaternion(inverseView).toArray()}));
    onVisibilityChange(Object.fromEntries(['meta','aura','quest3'].map(type=>[type,markers.filter(m=>inDisplayRay(m.ray,getProfile(type,state.assumption,undefined,state.eye))).map(m=>m.id)])));
    lastReadout=now;
  }
  function render(now=0) {
    if(!running)return;requestAnimationFrame(render);if(document.hidden||!onscreen)return;
    const dt=Math.min(clock.getDelta(),.04);
    if(gyro&&!gyroPending)camera.quaternion.slerp(targetQ,1-Math.exp(-18*dt));
    else if(!gyro){if(keys.has('ArrowLeft'))yaw+=dt;if(keys.has('ArrowRight'))yaw-=dt;if(keys.has('ArrowUp'))pitch=Math.min(1.35,pitch+dt);if(keys.has('ArrowDown'))pitch=Math.max(-1.35,pitch-dt);camera.quaternion.setFromEuler(euler.set(pitch,yaw,0));}
    direction.set((keys.has('d')?1:0)-(keys.has('a')?1:0),0,(keys.has('s')?1:0)-(keys.has('w')?1:0));
    if(direction.lengthSq()){direction.normalize().applyAxisAngle(up,yaw).multiplyScalar(dt*1.8);destination.add(direction);destination.x=T.MathUtils.clamp(destination.x,-4.3,4.3);destination.z=T.MathUtils.clamp(destination.z,-4.3,4.3);}
    camera.position.lerp(destination,1-Math.exp(-9*dt));
    if(camera.position.distanceToSquared(capturedPosition)>.000004){roomDirty=depthDirty=contentDirty=true;capturedPosition.copy(camera.position);}
    // Gaze reuses all captures. Lighting invalidates only the room colour and
    // static shadows; depth and virtual content stay cached at their own sizes.
    if(roomDirty){capture(roomCapture,room.scene,1);captures.room++;roomDirty=false;}
    if(depthDirty){
      const background=room.scene.background,override=room.scene.overrideMaterial;
      room.scene.background=new T.Color().setRGB(100,0,0);room.scene.overrideMaterial=depthMaterial;
      capture(depthCapture,room.scene,1);room.scene.background=background;room.scene.overrideMaterial=override;captures.depth++;depthDirty=false;
    }
    if(contentDirty){capture(contentCapture,content.scene,0);captures.content++;contentDirty=false;}
    renderer.setRenderTarget(null);renderer.setScissorTest(false);renderer.setClearColor('#202722',1);renderer.clear();
    u.viewQuaternion.value.set(camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w);
    for(const view of views){const profile=getProfile(view.type==='room'?'meta':view.type,state.assumption,undefined,state.eye),p=projection(view.w,view.h,state.eye,state.framing);u.observerField.value.set(p.field.h,p.field.v);u.device.value={room:0,meta:1,aura:2,quest3:3}[view.type];u.angularSpan.value.fromArray(p.span);u.angularCenter.value.fromArray(p.center);u.humanBounds.value.set(p.human.left,p.human.right,p.human.up,p.human.down);u.displayFrustum.value.fromArray(profile.frustum);renderer.setViewport(view.x,h-view.y-view.h,view.w,view.h);renderer.setScissor(view.x,h-view.y-view.h,view.w,view.h);renderer.setScissorTest(true);renderer.render(post,postCamera);}
    renderer.setScissorTest(false);updateReadout(now);
    if(++frames===3){document.getElementById('loading').hidden=true;document.body.dataset.ready='true';}
  }
  function getSnapshot(){return {framing:state.framing,observerCameraFov:state.framing==='peripheral'?RENDER_ASSUMPTIONS.observerCameraFov:RENDER_ASSUMPTIONS.wearingCameraFov,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),virtualContentPose:RENDER_ASSUMPTIONS.virtualContentPose,content:content.getSnapshot(),room:room.getSnapshot(),captures:{...captures},captureProjection:{verticalFov:90,aspect:1,cubeSize,contentCubeSize},physicalGeometryUsed:false,wearingApproximation:state.wearEdges?RENDER_ASSUMPTIONS.wearing:null,showVirtual:state.showVirtual,perceptualAssumptions:RENDER_ASSUMPTIONS.viewExperience,canvas:{width:w,height:h,drawingWidth:renderer.domElement.width,drawingHeight:renderer.domElement.height,dpr:renderer.getPixelRatio()},views:views.map(v=>({...v,display:getProfile(v.type==='room'?'meta':v.type,state.assumption),projection:projection(v.w,v.h,state.eye,state.framing)}))};}
  update();render();return {update,resize,recenter,toggleSensor,moveTo,anchor,getSnapshot};
}

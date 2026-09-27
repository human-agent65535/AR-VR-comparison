import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createHeadsetModel,COMPONENTS} from './headsets.js';
import {MODEL_WORLD_SCALE as S} from './fit-model.js';
export function createProductViewer(host,onChange){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;host.prepend(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#e9e5de');const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(new RoomEnvironment(),.025);scene.environment=environment.texture;scene.environmentIntensity=1.1;pmrem.dispose();scene.add(new T.HemisphereLight('#fff8ed','#424550',3));const key=new T.DirectionalLight('#fff3df',4);key.position.set(-3,4,5);scene.add(key);const fill=new T.DirectionalLight('#c1d5ee',2);fill.position.set(3,2,-2);scene.add(fill);
 const models={meta:createHeadsetModel('meta'),aura:createHeadsetModel('aura')};scene.add(models.meta.root,models.aura.root);models.aura.root.visible=false;
 const auraBounds=new T.Box3().setFromObject(models.aura.root);
 const auraOpticsBounds=new T.Box3().setFromObject(models.aura.front).union(new T.Box3().setFromObject(models.aura.rear));
 const perspective=new T.PerspectiveCamera(33,1,.001,3),orthographic=new T.OrthographicCamera(-.17,.17,.11,-.11,.001,3);
 let camera=perspective;camera.position.set(1.15*S,.84*S,-3.20*S);
 let controls;function bindControls(){controls?.dispose();controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,-.02*S,-.10*S);controls.enablePan=false;controls.minDistance=.16;controls.maxDistance=.6;controls.minZoom=.4;controls.maxZoom=3;controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.87;controls.addEventListener('change',()=>dirty=3);controls.update();}
 let current='meta',view='back',diagnostic=false,visible=false,dirty=3;
 bindControls();
 const originals=new Map(),diagnostics=new Map();for(const [id,model] of Object.entries(models))model.root.traverse(o=>{if(o.isMesh){originals.set(o,o.material);const color=COMPONENTS[o.userData.component]?.color||'#4c5666';diagnostics.set(o,new T.MeshBasicMaterial({color,depthTest:true,depthWrite:true,transparent:false,side:T.DoubleSide}));}});
 function fitAura(aspect){
  // Inside views inspect the optical assembly; fitting both long temples
  // made the very parts being inspected too small. Other angles show it all.
  const box=(view==='back'||view==='backOrtho'?auraOpticsBounds:auraBounds).clone();
  const center=box.getCenter(new T.Vector3()),direction=camera.position.clone().sub(controls.target).normalize();
  const right=new T.Vector3().crossVectors(camera.up,direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
  const tanV=Math.tan(T.MathUtils.degToRad(perspective.fov/2)),tanH=tanV*aspect;
  let distance=0,halfHeight=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   const p=new T.Vector3(x,y,z).sub(center),h=Math.abs(p.dot(right)),v=Math.abs(p.dot(up)),depth=p.dot(direction);
   distance=Math.max(distance,depth+h*1.20/tanH,depth+v*1.20/tanV);
   halfHeight=Math.max(halfHeight,v*1.20,h*1.20/aspect);
  }
  controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,Math.max(distance,.2));
  if(camera.isOrthographicCamera){camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.zoom=1;camera.updateProjectionMatrix();}
  controls.update();
 }
 function resize(){const aspect=host.clientWidth/host.clientHeight;perspective.aspect=aspect;perspective.fov=Math.max(33,T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(22))/aspect)));perspective.updateProjectionMatrix();const halfH=Math.max(.115,.115/aspect);orthographic.left=-halfH*aspect;orthographic.right=halfH*aspect;orthographic.top=halfH;orthographic.bottom=-halfH;orthographic.updateProjectionMatrix();if(current==='aura')fitAura(aspect);renderer.setSize(host.clientWidth,host.clientHeight,false);dirty=3;}
 new ResizeObserver(resize).observe(host);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;dirty=3;},{rootMargin:'120px'}).observe(host);
 function setDevice(device){current=device;models.meta.root.visible=device==='meta';models.aura.root.visible=device==='aura';setView(view);onChange(device);}
 function setView(next){view=next;const pos={front:[.35,.27,3.55],back:[1.15,.84,-3.20],side:[3.1,.65,.95],oblique:[2.2,1.2,2.7],frontOrtho:[0,-.02,3.55],backOrtho:[0,-.02,-3.2],sideOrtho:[3.7,-.02,-.1]};host.dataset.view=next;
  const desired=next.endsWith('Ortho')?orthographic:perspective;if(camera!==desired){camera=desired;bindControls();}controls.target.set(0,-.02*S,-.10*S);camera.position.fromArray(pos[next]).multiplyScalar(S);controls.update();resize();dirty=3;
 }
 function setDiagnostic(value){diagnostic=value;for(const [mesh,mat] of originals)mesh.material=value?diagnostics.get(mesh):mat;dirty=3;}
 function setPrescription(value){models.meta.rx.visible=models.aura.rx.visible=value;dirty=3;}
 function getSnapshot(){return {device:current,view,diagnostic,projection:camera.type,aspect:host.clientWidth/host.clientHeight,verticalFov:camera.isPerspectiveCamera?camera.fov:null,position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:controls.target.toArray(),near:camera.near,far:camera.far,zoom:camera.zoom,canvas:{width:host.clientWidth,height:host.clientHeight,drawingWidth:renderer.domElement.width,drawingHeight:renderer.domElement.height,dpr:renderer.getPixelRatio()},physicalScaleConvention:S,unit:'scene-m',modelScale:models[current].root.scale.toArray()};}
 function animate(){requestAnimationFrame(animate);if(!visible||document.hidden)return;controls.update();if(dirty>0){renderer.render(scene,camera);dirty--;}}
 animate();return {setDevice,setView,setPrescription,setDiagnostic,getSnapshot};
}

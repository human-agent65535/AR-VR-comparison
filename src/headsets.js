import * as T from 'three';
export {EYE_REFERENCE} from './fit-model.js';
import {physicalGeometry,MODEL_WORLD_SCALE} from './device-data.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {auraLensOutline,auraFrameOutline,auraBrowOutline,auraPrismOutline,auraTempleOutline} from './aura-shapes.js';

// Original geometry reconstructed from the vendors' product photographs.
// Dimensions and internal assembly are illustrative, not an official CAD model.
const plastic=new T.MeshPhysicalMaterial({color:'#222326',roughness:.49,metalness:.04,clearcoat:.22,clearcoatRoughness:.25});
const auraPlastic=new T.MeshPhysicalMaterial({color:'#14171b',roughness:.45,metalness:.04,clearcoat:.18,clearcoatRoughness:.22,envMapIntensity:.45});
const weaveData=new Uint8Array(128*128*4);
for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,w=116+Math.sin(x*Math.PI/2)*18+Math.cos(y*Math.PI/2)*14+((x*37+y*61)%13);weaveData[i]=weaveData[i+1]=weaveData[i+2]=w;weaveData[i+3]=255;}
const weave=new T.DataTexture(weaveData,128,128,T.RGBAFormat);weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(12,12);weave.needsUpdate=true;
const textile=new T.MeshPhysicalMaterial({color:'#46423e',roughness:.98,metalness:0,map:weave,bumpMap:weave,bumpScale:.0006,sheen:.9,sheenColor:'#55514a',sheenRoughness:.9});
const rubber=new T.MeshStandardMaterial({color:'#17191b',roughness:.88});
const metal=new T.MeshStandardMaterial({color:'#484a50',roughness:.48,metalness:.55});
const blackGlass=new T.MeshPhysicalMaterial({color:'#07070c',metalness:.32,roughness:.14,clearcoat:1,clearcoatRoughness:.06});
const optic=new T.MeshPhysicalMaterial({color:'#344342',metalness:.72,roughness:.055,clearcoat:1,iridescence:1,iridescenceIOR:1.55,iridescenceThicknessRange:[270,520]});
// Clear-state hardware inspection, independent of the wearing-view tint levels.
// Dark pigment plus transmission previously concealed the lower clear band.
const seeThrough=new T.MeshPhysicalMaterial({color:'#bdc3c5',transmission:.82,thickness:.045,ior:1.48,roughness:.055,metalness:.02,clearcoat:1,clearcoatRoughness:.08,transparent:false,depthTest:true,depthWrite:true,opacity:1,side:T.DoubleSide,attenuationColor:'#c6cccc',attenuationDistance:.25});
const prescriptionGlass=new T.MeshPhysicalMaterial({color:'#e5e8e5',transmission:.97,thickness:.016,ior:1.52,roughness:.025,transparent:false,depthTest:true,depthWrite:true,opacity:1,side:T.DoubleSide});
const prescriptionRim=new T.MeshStandardMaterial({color:'#44454a',roughness:.55,metalness:.45});
const prism=new T.MeshPhysicalMaterial({color:'#e2e7e3',transmission:.91,thickness:.14,ior:1.62,roughness:.035,metalness:0,transparent:false,depthTest:true,depthWrite:true,opacity:1,side:T.DoubleSide});
function mesh(geometry,material,parent,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;m.userData.component=parent.userData.component||'frame';parent.add(m);return m;}
function block(w,h,d,x,y,z,material,parent,r=.025){return mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/3,h/3,d/3)),material,parent,x,y,z);}
function rounded(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function extrude(shape,depth,material,parent,bend=0,bendCenter=0){let g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:4,steps:2,bevelSize:.006,bevelThickness:.006,curveSegments:32});if(bend)g=new TessellateModifier(.035,9).modify(g);const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){const x=p.getX(i)+bendCenter;p.setZ(i,p.getZ(i)-bend*x*x);if(bend){const normal=new T.Vector3(n.getX(i)+2*bend*x*n.getZ(i),n.getY(i),n.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);}}return mesh(g,material,parent);}

// Keep the eye-facing entrance flat, but taper the front of the optical body
// along the curved outer lens. A full-depth flat extrusion pierced that lens
// on the temporal side and exposed a C-shaped fragment in the front view.
function wrapOpticalFront(part,wrap,centerX,depth){
 const old=part.geometry,g=new TessellateModifier(.035,8).modify(old);part.geometry=g;old.dispose();
 const p=g.attributes.position,n=g.attributes.normal,span=depth+.012;
 for(let k=0;k<p.count;k++){
  const x=p.getX(k)+centerX,z=p.getZ(k),t=T.MathUtils.clamp((z+.006)/span,0,1);
  const dzdx=-2*wrap*x*t,dzdz=1-wrap*x*x/span;
  const normal=new T.Vector3(n.getX(k)-dzdx*n.getZ(k)/dzdz,n.getY(k),n.getZ(k)/dzdz).normalize();
  p.setZ(k,z-wrap*x*x*t);n.setXYZ(k,normal.x,normal.y,normal.z);
 }
 g.computeBoundingBox();g.computeBoundingSphere();return part;
}

function ring(w,h,r,thickness,depth,material,parent){const shape=rounded(w,h,r);shape.holes.push(new T.Path(rounded(w-thickness*2,h-thickness*2,Math.max(.02,r-thickness)).getPoints(40)));return extrude(shape,depth,material,parent);}
function tube(points,r,material,parent){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,40,r,10,false),material,parent);}
function camera(x,y,z,r,parent){mesh(new T.CylinderGeometry(r,r,.019,32),metal,parent,x,y,z).rotation.x=Math.PI/2;mesh(new T.SphereGeometry(r*.74,24,12),blackGlass,parent,x,y,z+.014).scale.set(1,1,.35);mesh(new T.SphereGeometry(r*.38,16,12),optic,parent,x,y,z+.027).scale.set(1,1,.25);}
function arms(parent,aura=false){const parts=new T.Group();parts.userData.component='temples';parent.add(parts);parent=parts;for(const sign of [-1,1]){block(.10,.13,aura?.46:.24,sign*.79,.125,-.14,plastic,parent);tube([[sign*.80,.12,-.22],[sign*.82,.115,-.50],[sign*.79,.10,-.87],[sign*.74,.035,-1.12],[sign*.69,-.12,-1.24]],aura?.042:.035,plastic,parent);block(.064,.012,.22,sign*.80,.18,-.44,rubber,parent,.004);for(let i=0;i<6;i++)block(.005,.009,.012,sign*.85,.10,-.20-i*.021,rubber,parent,.002);block(.016,.10,.043,sign*.844,.13,-.025,metal,parent,.003);camera(sign*.846,.125,-.026,.014,parent);}}
function nose(parent,compact=false){const parts=new T.Group();parts.userData.component='nosePads';parent.add(parts);parent=parts;if(compact){const g=new T.Group();g.position.set(0,.07,-.02);parent.add(g);parent=g;tube([[-.12,-.085,-.19],[0,-.02,-.19],[.12,-.085,-.19]],.032,rubber,parent);}for(const sign of [-1,1]){tube([[sign*.13,-.07,-.05],[sign*.11,-.12,-.17],[sign*.10,-.18,-.23]],.012,metal,parent);const pad=mesh(new T.SphereGeometry(1,24,16),rubber,parent,sign*.11,-.18,-.22);pad.scale.set(.047,.094,.022);pad.rotation.z=sign*.3;}}
function auraNose(parent){
 const parts=new T.Group(),d=physicalGeometry.aura.nosePad;parts.userData.component='nosePads';parent.add(parts);
 const cushion=new T.MeshStandardMaterial({color:'#3b3e42',roughness:.92});
 for(const sign of [-1,1]){
  const mirror=p=>[p[0]*sign,p[1],p[2]],center=mirror(d.center),hinge=mirror(d.hinge);
  tube([mirror(d.attachment),hinge,[center[0],center[1],center[2]+d.half[2]]],.011,auraPlastic,parts);
  const pivot=mesh(new T.CylinderGeometry(.019,.019,.019,24),auraPlastic,parts,...hinge);pivot.rotation.x=Math.PI/2;
  const pad=mesh(new T.SphereGeometry(1,32,24),cushion,parts,...center);
  pad.scale.set(...d.half);pad.rotation.z=sign*d.tilt*Math.PI/180;pad.rotation.y=sign*.2;
 }
}
function auraTemples(parent){
 const parts=new T.Group();parts.userData.component='temples';parent.add(parts);
 for(const sign of [-1,1]){
  const arm=extrude(auraTempleOutline(),.094,auraPlastic,parts);
  const positions=arm.geometry.attributes.position,normals=arm.geometry.attributes.normal;
  for(let k=0;k<positions.count;k++){
   const t=positions.getX(k),y=positions.getY(k),depth=positions.getZ(k)-.047;
   // A shallow inward taper keeps the broad side faces planar. Bending their
   // independently tessellated caps produced small cracks along bevel seams.
   const slope=-.055;
   positions.setXYZ(k,.835+slope*t+depth,y,-.085-t);
   const normal=new T.Vector3(normals.getZ(k),normals.getY(k),slope*normals.getZ(k)-normals.getX(k)).normalize();
   normals.setXYZ(k,normal.x,normal.y,normal.z);
  }
  // Mirror the object transform, so Three also reverses triangle winding.
  arm.scale.x=sign;arm.geometry.computeBoundingBox();
  // Wide metal hinge collar, side touch surface and lower red control.
  block(.125,.166,.205,sign*.830,.131,-.178,metal,parts,.010);
  const touch=block(.011,.084,.31,sign*.862,.117,-.51,rubber,parts,.004);touch.rotation.y=sign*Math.atan(.055);
  block(.029,.017,.10,sign*.842,-.043,-.63,new T.MeshStandardMaterial({color:'#9c322e',roughness:.48}),parts,.005);
  const slot=block(.012,.034,.15,sign*.838,.02,-.95,blackGlass,parts,.005);slot.rotation.y=sign*Math.atan(.055);
 }
}
function metaEnclosure(outline,parent){
 const points=outline.getSpacedPoints(160),vertices=[],indices=[];
 for(const p of points){
  // Join the back of the front shell to the front of the textile surround.
  // Their different wraps previously left the full perimeter open.
  vertices.push(p.x,p.y,-.053-.17*p.x*p.x,p.x,p.y,.067-.27*p.x*p.x);
 }
 for(let k=0;k<points.length-1;k++){const a=k*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=plastic.clone();material.side=T.DoubleSide;
 const wall=mesh(geometry,material,parent);wall.name='meta-enclosure-sidewall';return wall;
}
function metaModel(){const root=new T.Group(),front=new T.Group(),rear=new T.Group(),rx=new T.Group();root.add(front,rear,rx);rx.visible=false;
 const s=new T.Shape();s.moveTo(0,.30);s.bezierCurveTo(.35,.30,.77,.255,.82,.12);s.bezierCurveTo(.86,-.04,.79,-.31,.50,-.34);s.bezierCurveTo(.26,-.35,.22,-.20,.12,-.035);s.bezierCurveTo(.07,.04,-.07,.04,-.12,-.035);s.bezierCurveTo(-.22,-.20,-.26,-.35,-.50,-.34);s.bezierCurveTo(-.79,-.31,-.86,-.04,-.82,.12);s.bezierCurveTo(-.77,.255,-.35,.30,0,.30);
 const lining=s.clone();
 for(const sign of [-1,1]){const cut=rounded(.433,.350,.11).getPoints(64).map(p=>new T.Vector2(p.x+sign*.365,p.y+.060));lining.holes.push(new T.Path(cut));}
 const cloth=extrude(lining,.023,textile,rear,.17);cloth.position.z=-.078;
 const welt=s.getPoints(120).map(p=>[p.x*.988,p.y*.986,-.090-.17*p.x*p.x]);tube(welt,.006,rubber,rear);
 const body=extrude(s,.082,plastic,front,.27);body.position.z=.07;
 metaEnclosure(s,root);
 const shield=extrude(s,.012,blackGlass,front,.27);shield.scale.set(.982,.971,1);shield.position.z=.164;
 const seam=new T.LineLoop(new T.BufferGeometry().setFromPoints(s.getPoints(110).map(p=>new T.Vector3(p.x,p.y,.179-.27*p.x*p.x))),new T.LineBasicMaterial({color:'#61606b',transparent:true,opacity:.7}));front.add(seam);
 for(const sign of [-1,1]){const cell=new T.Group();cell.position.set(sign*.365,.060,-.073);rear.add(cell);const cup=ring(.468,.388,.128,.035,.065,textile,cell);cup.rotation.y=Math.PI;const rim=ring(.397,.312,.102,.015,.019,metal,cell);rim.position.z=-.083;const glass=extrude(rounded(.355,.272,.09),.013,optic,cell);glass.position.z=-.10;glass.userData.opticalLayer='exit';for(let i=0;i<3;i++){const nested=ring(.367-i*.009,.284-i*.008,.093,.003,.002,blackGlass,cell);nested.position.z=-.104-i*.003;}camera(sign*.615,.202,.073,.013,front);}
 // A subtle infinity mark made from geometry, not a flat logo texture.
 const pts=[];for(let i=0;i<=100;i++){const t=i/100*Math.PI*2;pts.push([Math.sin(t)*.027,.226+Math.sin(t*2)*.01,.177]);}tube(pts,.0016,metal,front);
 for(const sign of [-1,1]){const insert=new T.Group();insert.position.set(sign*.365,.060,-.207);rx.add(insert);extrude(rounded(.37,.287,.093),.012,prescriptionGlass,insert).userData.opticalLayer='rx';ring(.395,.312,.101,.012,.013,prescriptionRim,insert);}
 arms(root);nose(root,true);root.position.z=.32;return {root,front,rear,rx};
}
function auraModel(){
 const d=physicalGeometry.aura,o=d.outer,i=d.internal,r=d.prescription;
 const root=new T.Group(),front=new T.Group(),rear=new T.Group(),rx=new T.Group();root.add(front,rear,rx);rx.visible=false;
 for(const sign of [-1,1]){
  const g=new T.Group();g.name=sign<0?'outer-left':'outer-right';g.position.set(sign*o.x,o.y,o.z);g.scale.x=sign;front.add(g);
  const frameShape=auraFrameOutline(o.frameW,o.frameH,o.upperLift);
  frameShape.holes.push(new T.Path(auraLensOutline(o.w-.008,o.h-.008,o.upperLift).getPoints(64)));
  extrude(frameShape,.058,auraPlastic,g,o.wrap,o.x);
  const lens=extrude(auraLensOutline(o.w,o.h,o.upperLift),.011,seeThrough,g,o.wrap,o.x);lens.position.z=.063;lens.userData.opticalLayer='front';
  const inside=new T.Group();inside.name=sign<0?'optical-left':'optical-right';inside.userData.component='opticalModule';inside.position.set(sign*i.x,i.y,i.z);rear.add(inside);
  const cellShape=auraPrismOutline(i.housingW,i.housingH);
  cellShape.holes.push(new T.Path(auraPrismOutline(i.w,i.h).getPoints(64)));
  const cell=wrapOpticalFront(extrude(cellShape,i.housingDepth,auraPlastic,inside),o.wrap,sign*i.x,i.housingDepth);cell.position.z=-.024;
  const prismMesh=wrapOpticalFront(extrude(auraPrismOutline(i.w,i.h),i.depth,prism,inside),o.wrap,sign*i.x,i.depth);prismMesh.position.z=-.035;prismMesh.userData.opticalLayer='exit';
  // Side reference shows a sloping optical body, not a detached rectangular box.
  const positions=prismMesh.geometry.attributes.position;for(let k=0;k<positions.count;k++)positions.setZ(k,positions.getZ(k)+.065*positions.getY(k));prismMesh.geometry.computeVertexNormals();prismMesh.geometry.computeBoundingBox();
  const lipShape=auraPrismOutline(i.w+.012,i.h+.012);lipShape.holes.push(new T.Path(auraPrismOutline(i.w-.003,i.h-.003).getPoints(64)));
  const edge=extrude(lipShape,.008,auraPlastic,inside);edge.position.z=-.042;
  const insert=new T.Group();insert.name=sign<0?'aura-insert-left':'aura-insert-right';insert.userData.component='prescription';insert.position.set(sign*r.x,r.y,r.z);rx.add(insert);
  extrude(rounded(r.w,r.h,r.radius),.013,prescriptionGlass,insert).userData.opticalLayer='rx';ring(r.w+r.rimWidth*2,r.h+r.rimWidth*2,r.radius+r.rimWidth,r.rimWidth,.012,prescriptionRim,insert);
  const nasal=r.x-r.w/2,hinge=d.nosePad.hinge;
  // A short eye-side arm clips to the nose-pad pivot, below the electronics.
  tube([[sign*hinge[0],hinge[1],hinge[2]],[sign*.116,-.112,r.z+.023],[sign*(nasal+.01),r.y-.035,r.z+.006]],.009,prescriptionRim,rx);
  const sensor=new T.Group();sensor.position.set(sign*.815,.218,.085-o.wrap*.815*.815);sensor.rotation.y=-sign*.25;front.add(sensor);camera(0,0,0,.032,sensor);
 }
 // The clear prism starts at the underside of the electronics housing.
 // Sharing this attachment prevents a floating gap or a half-hidden opening.
 const brow=extrude(auraBrowOutline(i.y+i.h/2),.188,auraPlastic,rear,o.wrap);brow.name='aura-upper-housing';brow.position.z=-.136;brow.userData.component='opticalModule';
 block(.17,.064,.077,0,.172,.019,auraPlastic,front,.021);camera(0,.172,.109,.016,front);
 const nasal=r.x-r.w/2;
 tube([[-nasal,r.y+.012,r.z+.006],[0,r.y+.040,r.z+.008],[nasal,r.y+.012,r.z+.006]],.009,prescriptionRim,rx);
 auraTemples(root);auraNose(root);root.position.z=.32;return {root,front,rear,rx};
}

export function createHeadsetModel(device){
 const model=device==='meta'?metaModel():auraModel();model.device=device;
 model.root.scale.setScalar(MODEL_WORLD_SCALE);model.root.position.multiplyScalar(MODEL_WORLD_SCALE);
 model.root.traverse(o=>{if(!o.isMesh)return;const layer=o.userData.opticalLayer;o.userData.component=layer==='front'?'outerLens':layer==='exit'?'outputRegion':layer==='rx'?'prescription':o.material===textile?'lining':o.userData.component||'frame';o.name=o.name||o.userData.component;});
 return model;
}
export const COMPONENTS={frame:{name:'镜架 / 前罩',color:'#4c5666'},outerLens:{name:'外层调光片',color:'#c5a354'},opticalModule:{name:'内部光学组件壳体',color:'#547db0'},outputRegion:{name:'光学透明体 / 出光面示意',color:'#57bdc2'},prescription:{name:'处方片（覆盖估计）',color:'#a478ba'},lining:{name:'内侧织物包覆',color:'#8d7660'},nosePads:{name:'鼻托',color:'#c48562'},temples:{name:'镜腿',color:'#748b72'}};

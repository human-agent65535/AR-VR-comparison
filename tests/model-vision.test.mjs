import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Raycaster} from 'three';
import {createHeadsetModel} from '../src/headsets.js';
import {getProfile} from '../src/optics.js';
import {DEVICES,deviceFov,physicalGeometry,MODEL_WORLD_SCALE,RENDER_ASSUMPTIONS} from '../src/device-data.js';
import {diagonalFov,profileFromAngles,virtualPlaneSize,rad} from '../src/fov-math.js';
import {blurAxes} from './helpers/vision.js';
import {composePixel} from './helpers/perception.js';
import {auraBrowOutline,auraPrismOutline,auraLensOutline} from '../src/aura-shapes.js';
const near=(a,b,t=1e-4)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('specified diagonal regressions use degrees at the interface, radians in trigonometry',()=>{
 for(const [d,h,v] of [[70,61.4015,40.7207],[58,50.3520,32.7438]]){
  const actual=diagonalFov(d,1.6);near(actual.h,h);near(actual.v,v);
 }
 assert.throws(()=>diagonalFov(180,1.6),RangeError);
});
test('signed runtime boundaries preserve asymmetry and virtual plane offsets',()=>{
 const angles={left:-35*rad,right:42*rad,up:29*rad,down:-32*rad},p=profileFromAngles(angles);
 assert.deepEqual(p.angles,angles);near(p.h,77);near(p.v,61);
 assert.notEqual(-p.frustum[0],p.frustum[1]);
 const size=virtualPlaneSize(p,3);near(size.width,3*(Math.tan(42*rad)+Math.tan(35*rad)));
 near(size.height,3*(Math.tan(29*rad)+Math.tan(32*rad)));
});
test('structure positions do not reduce device display FOV or virtual window size',()=>{
 for(const device of ['meta','aura'])for(const eye of ['left','right']){
  const a=getProfile(device),b=getProfile(device,'diagonal',{gap:20,height:-10},eye);
  assert.deepEqual(b.frustum,a.frustum);assert.equal(b.h,a.h);assert.equal(b.v,a.v);
 }
 assert.deepEqual(RENDER_ASSUMPTIONS.virtualContentPose,{distance:3,cinemaWidth:2.6,cinemaHeight:1.463,unit:'scene-m',status:'assumed'});
});
test('FOV assumptions cannot stretch the physical assembly; a uniform common root scales all components',()=>{
 const m=createHeadsetModel('aura');m.rx.visible=true;
 const dimensions=()=>new Box3().setFromObject(m.root).getSize(new Vector3()).toArray();
 const before=dimensions();assert.deepEqual(m.root.scale.toArray(),[MODEL_WORLD_SCALE,MODEL_WORLD_SCALE,MODEL_WORLD_SCALE]);
 const d=getProfile('aura','diagonal'),h=getProfile('aura','horizontal');assert.notEqual(d.h,h.h);
 assert.deepEqual(dimensions(),before);
 m.root.scale.multiplyScalar(2);dimensions().forEach((x,i)=>near(x,2*before[i],1e-8));
 const components=new Set();m.root.traverse(o=>{if(o.isMesh)components.add(o.userData.component)});
 for(const name of ['frame','outerLens','opticalModule','outputRegion','prescription','nosePads','temples'])assert.ok(components.has(name),name);
});
test('AURA calibration keeps width and rear depth in independent normalized photo-reference ranges',()=>{
 const a=physicalGeometry.aura,c=a.calibration;
 const width=a.internal.w/a.outer.frameW;
 const protrusion=(a.outer.z+.063-(a.internal.z-.035))/a.frameHeight;
 assert.ok(width>=c.internalWidthOverOuterFrameWidth[0]&&width<=c.internalWidthOverOuterFrameWidth[1]);
 assert.ok(protrusion>=c.rearProtrusionOverFrameHeight[0]&&protrusion<=c.rearProtrusionOverFrameHeight[1]);
 assert.equal(c.status,'assumed');assert.equal(a.status,'assumed');
});
test('AURA prism attaches below the upper shell with a larger lower and temporal outer lens',()=>{
 const {internal:i,outer:o,calibration:{presencePhoto:photo}}=physicalGeometry.aura;
 const top=i.y+i.h/2,brow=auraBrowOutline(top).getPoints(64);
 // The actual traced lower surface over the prism meets its top; it must
 // neither cover half the entrance nor leave a transparent floating gap.
 const crossings=brow.flatMap((a,index)=>{
  const b=brow[(index+1)%brow.length];
  if((a.x-i.x)*(b.x-i.x)>0||a.x===b.x)return [];
  return [a.y+(b.y-a.y)*(i.x-a.x)/(b.x-a.x)];
 });
 const underside=Math.min(...crossings);
 near(underside,top,1e-8);
 const bound=(points,key,fn)=>fn(...points.map(p=>p[key]));
 const clear=auraPrismOutline(i.w,i.h).getPoints(64),housing=auraPrismOutline(i.housingW,i.housingH).getPoints(64),outer=auraLensOutline(o.w,o.h,o.upperLift).getPoints(64);
 const nasalGap=(i.x+bound(clear,'x',Math.min))-(o.x+bound(outer,'x',Math.min));
 const temporalGap=(o.x+bound(outer,'x',Math.max))-(i.x+bound(clear,'x',Math.max));
 const lowerGap=(i.y+bound(clear,'y',Math.min))-(o.y+bound(outer,'y',Math.min));
 assert.ok(nasalGap<.015,'no detached transparent strip at the nose');
 assert.ok(temporalGap>.15&&lowerGap>.12,'visible outer glass is concentrated below and temporal to the prism');
 assert.ok(i.w/i.h>1.8,'clear optical body is wide, not a tiny square entrance');
 const within=(value,range)=>assert.ok(value>=range[0]&&value<=range[1],`${value} outside photo proportion ${range}`);
 within(i.w/i.h,photo.clearAspect);
 // Oblique apparent upper-housing height includes its depth. It is not a
 // direct constraint on the Y extent in this front-facing coordinate system.
 within(((i.y+bound(housing,'y',Math.min))-(o.y+bound(outer,'y',Math.min)))/i.h,photo.lowerClearBandOverClearHeight);
 within(((o.x+bound(outer,'x',Math.max))-(i.x+bound(housing,'x',Math.max)))/i.w,photo.temporalClearBandOverClearWidth);
});

test('AURA inner optical meshes stay entirely behind the wrapped outer surface',()=>{
 const m=createHeadsetModel('aura'),o=physicalGeometry.aura.outer;
 m.root.updateMatrixWorld(true);
 let checked=0,minimum=Infinity;
 const inverse=m.root.matrixWorld.clone().invert(),v=new Vector3();
 m.rear.traverse(part=>{
  if(!part.isMesh)return;
  const p=part.geometry.attributes.position,n=part.geometry.attributes.normal;
  for(let k=0;k<p.count;k++){
   v.fromBufferAttribute(p,k).applyMatrix4(part.matrixWorld).applyMatrix4(inverse);
   const outerBack=o.z+.063-o.wrap*v.x*v.x-.006;
   minimum=Math.min(minimum,outerBack-v.z);checked++;
   assert.ok(Number.isFinite(n.getX(k)+n.getY(k)+n.getZ(k)),'deformed normals remain finite');
  }
 });
 assert.ok(checked>1000);
 assert.ok(minimum>.010,`rear assembly pierces the front lens: minimum clearance ${minimum}`);
});
test('AURA inserts sit eye-side of the upper shell, below its top, with temporal overhang',()=>{
 const m=createHeadsetModel('aura'),r=physicalGeometry.aura.prescription,i=physicalGeometry.aura.internal;
 m.root.updateMatrixWorld(true);
 const inverse=m.root.matrixWorld.clone().invert(),v=new Vector3();
 for(const name of ['aura-insert-left','aura-insert-right']){
  const lens=m.rx.getObjectByName(name),side=name.endsWith('left')?-1:1;
  lens.traverse(part=>{
   if(!part.isMesh)return;
   const p=part.geometry.attributes.position;
   for(let k=0;k<p.count;k++){
    v.fromBufferAttribute(p,k).applyMatrix4(part.matrixWorld).applyMatrix4(inverse);
    const shellRear=-.136-physicalGeometry.aura.outer.wrap*v.x*v.x-.006;
    assert.ok(v.z<shellRear-.01,'insert frame cannot intersect the upper electronics');
    assert.ok(v.y<i.y+i.h/2,'the full insert stays below the electronics underside');
   }
  });
  const temporal=side*(r.x+r.w/2),optical=side*(i.x+i.w/2);
  assert.ok(Math.abs(temporal)>Math.abs(optical)+.05,'insert extends beyond the optical body at its outer edge');
 }
});
test('Meta enclosure closes the gap between front shell and textile surround',()=>{
 const m=createHeadsetModel('meta');m.root.updateMatrixWorld(true);
 for(const z of [-.045,-.02,.01,.04,.060]){
  const origin=m.root.localToWorld(new Vector3(0,.8,z));
  const ray=new Raycaster(origin,new Vector3(0,-1,0)),hits=ray.intersectObject(m.root,true);
  assert.ok(hits.some(hit=>hit.object.name==='meta-enclosure-sidewall'),'top perimeter cannot be an open gap');
 }
});
test('every raw FOV carries provenance and unknown axes require an explicit assumption',()=>{
 for(const d of DEVICES){for(const k of ['value','unit','axis','scope','source','verifiedAt','confidence','status'])assert.ok(k in d.fov,`${d.id}.${k}`);assert.notEqual(d.fov.status,'measured');}
 for(const id of ['1s','onepro']){assert.equal(deviceFov(id),null);assert.equal(deviceFov(id,'diagonal',true).axisAssumed,true);}
 const aura=DEVICES.find(d=>d.id==='aura');assert.equal(aura.fov.axis,'unknown');assert.equal(aura.shape.axisEvidence.status,'assumed');assert.equal(aura.pwm.value,null);assert.equal(aura.transmittance.value,null);
 assert.equal(deviceFov('aura','horizontal').inputs.axis,'horizontal');assert.match(deviceFov('aura','horizontal').formula,/H=A/);
 assert.equal(DEVICES.find(d=>d.id==='vision').fov.status,'assumed');
});
test('additive black does not occlude reality; disabling virtual output retains transmission',()=>{
 const real=[.2,.4,.6],black=[0,0,0],lit=[.1,.05,.2];
 assert.deepEqual(composePixel({route:'optical',real,emitted:black}),real);
 assert.deepEqual(composePixel({route:'optical',real,emitted:lit,transmission:.5,enabled:false}),[.1,.2,.3]);
 assert.deepEqual(composePixel({route:'video',real,emitted:black,alpha:1}),black);
 assert.deepEqual(composePixel({route:'video',real,emitted:lit,enabled:false}),real);
});
test('geometric defocus grows with myopia, becomes directional with cylinder, and decreases nearby',()=>{
 const normal=blurAxes({sphere:0,cylinder:0,axis:90}),myopia=blurAxes({sphere:3,cylinder:0,axis:90}),astig=blurAxes({sphere:3,cylinder:2,axis:45});
 assert.equal(normal.major,0);assert.equal(myopia.major,myopia.minor);assert.ok(astig.major>astig.minor);assert.equal(astig.axis,45);
 assert.ok(blurAxes({sphere:3,cylinder:0},.25).major<myopia.major);
 assert.equal(blurAxes({sphere:3,cylinder:1,axis:180}).axis,0);
});

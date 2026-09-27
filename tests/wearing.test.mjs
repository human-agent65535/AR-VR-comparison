import test from 'node:test';
import assert from 'node:assert/strict';
import {wearingDistances,frontAngles,roundedDistance} from '../src/wear-shapes.js';
import {getProfile,displayContour,humanVisibility,rayToAngular} from '../src/optics.js';
import {RENDER_ASSUMPTIONS} from '../src/device-data.js';

test('Meta has a cup around the aperture without sealing its open periphery',()=>{
 const at=p=>wearingDistances(p,'meta');
 assert.ok(at([0,0]).aperture<0,'the central view is a display aperture');
 assert.ok(at([48,0]).frame<0,'the front housing obstructs a ray outside the display');
 for(const p of [[45,5],[0,50],[46,0],[0,-37]])assert.ok(at(p).frame<0,'cloth covers the front rather than leaving oversized openings');
 for(const p of [[54,0],[49,-25],[95,0],[0,-44],[0,-67]]){
  assert.ok(humanVisibility(...p,'right')>.99,'sample lies inside the human reference');
  assert.ok(at(p).shell>0&&at(p).frame>0,'temporal and bottom rays retain an open view');
 }
});

test('AURA keeps distinct transparent lens, outer frame, brow and open peripheral regions',()=>{
 const at=p=>wearingDistances(p,'aura');
 for(const p of [[51,-7],[0,38]])assert.ok(at(p).frame<0,'rim and upper housing are visible');
 const throughLens=at([45,-5]);
 assert.ok(throughLens.lens<0&&throughLens.optical>0&&throughLens.frame>0,'outer glass extends beyond the inner optics');
 assert.ok(at([0,-33]).lens<0,'large sunglasses lens still tints the lower front');
 const direct=at([95,0]);assert.ok(direct.lens>0&&direct.frame>0,'outside the sunglasses one sees reality directly');
});

test('estimated wearable boundaries mirror with the observed eye',()=>{
 for(const device of ['meta','aura'])for(const p of [[0,0],[48,0],[75,31],[0,-60],[-43,-15]])
  assert.deepEqual(wearingDistances(p,device,'left'),wearingDistances([-p[0],p[1]],device,'right'));
});

test('AURA upper occlusion closes the floating top gap while lower and temporal periphery stay open',()=>{
 for(const eye of ['right','left']){
  const sign=eye==='right'?1:-1,at=p=>wearingDistances([p[0]*sign,p[1]],'aura',eye);
  for(const p of [[0,46],[0,56],[-35,45],[55,45]]){
   assert.ok(humanVisibility(p[0]*sign,p[1],eye)>.99);
   assert.ok(at(p).frame<0,'upper peripheral reality is blocked by the brow-side silhouette');
  }
  for(const p of [[0,-65],[0,-69],[95,0]])assert.ok(at(p).lens>0&&at(p).frame>0,'bottom and far temporal rays see the room directly');
  assert.ok(at([0,-33]).lens<0&&at([0,-33]).frame>0,'the large lower lens remains transparent, below the inner optics');
 }
});

test('AURA housing stays clear of both supported display assumptions',()=>{
 for(const device of ['aura'])for(const assumption of ['diagonal','horizontal'])for(const eye of ['right','left']){
  for(const p of displayContour(getProfile(device,assumption))){
   const d=wearingDistances(p,device,eye);
   assert.ok(d.frame>1,'nominal display stays clear of the opaque frame');
   assert.ok((device==='meta'?d.aperture:d.lens)<-1,'display remains within its optical opening');
   if(device==='aura')assert.ok(d.optical<-1,'inner optical rim does not paint over the virtual image');
  }
 }
});

test('Meta surround leaves the nominal display clear instead of imposing a photo-shaped entrance',()=>{
 const profile=getProfile('meta');
 for(const eye of ['left','right'])for(const x of [-34,0,34])for(const y of [-32,0,32]){
  const p=rayToAngular(Math.tan(x*Math.PI/180),Math.tan(y*Math.PI/180),-1);
  const d=wearingDistances(p,'meta',eye);
  assert.ok(d.aperture<0&&d.frame>0,'nominal display corners remain available without an extra entrance mask');
 }
 assert.equal(profile.h,70);assert.equal(profile.v,66);
});

test('AURA optical housing has broad side walls and lips separated from its outer frame',()=>{
 for(const p of [[38.5,0],[40,0],[0,-28]]){
  const d=wearingDistances(p,'aura');
  assert.ok(d.opticalFrame<0&&d.frame<0,'thick inner housing blocks this ray');
  assert.ok(d.outerFrame>0,'it is the inner housing, not the sunglasses rim');
 }
 const gap=wearingDistances([45,0],'aura');
 assert.ok(gap.opticalHousing>0&&gap.lens<0&&gap.frame>0,'transparent space separates the two frames');
 assert.ok(wearingDistances([0,0],'aura').frame>0,'central optical opening stays clear');
 assert.ok(wearingDistances([0,28],'aura').opticalFrame<0,'thick upper housing joins the brow');
 assert.ok(wearingDistances([0,-33],'aura').lens<0&&wearingDistances([0,-33],'aura').frame>0,'a large transparent lower lens remains below the upper prism');
});

test('AURA optical edges surround a centered display instead of shifting it toward the nose or brow',()=>{
 for(const eye of ['right','left']){
  for(const [x,y] of [[38,0],[0,27]]){
   const positive=wearingDistances([x,y],'aura',eye).optical;
   assert.ok(Math.abs(positive-wearingDistances([-x,-y],'aura',eye).optical)<1e-10);
  }
  for(const [x,y] of [[39,0],[-39,0],[0,28],[0,-28]]){
   const point=rayToAngular(Math.tan(x*Math.PI/180),Math.tan(y*Math.PI/180),-1);
   assert.ok(wearingDistances(point,'aura',eye).opticalFrame<0,'all four edges have optical housing');
  }
 }
});

test('both glasses keep modest outer-side openings mirrored between eyes',()=>{
 for(const device of ['meta','aura'])for(const eye of ['right','left']){
  const temporal=device==='meta'?47:56,x=eye==='right'?temporal:-temporal,d=wearingDistances([x,-25],device,eye);
  assert.ok(d.frame>0,'outer-lower peripheral ray remains open');
  assert.ok((device==='meta'?d.shell:d.lens)>0,'side opening sees untinted room');
  const upper=wearingDistances([x,35],device,eye);
  assert.ok(upper.frame<0,'the brow does not turn into a wide upper opening');
 }
});

test('outer silhouettes have curved lower and temporal edges instead of straight clipping planes',()=>{
 for(const device of ['meta','aura']){
  const key=device==='meta'?'shell':'lens';
  const edge=y=>{let lo=35,hi=100;for(let i=0;i<40;i++){const x=(lo+hi)/2;if(wearingDistances([x,y],device)[key]<0)lo=x;else hi=x;}return (lo+hi)/2;};
  assert.ok(Math.abs(edge(-25)-2*edge(-10)+edge(5))>.15,'temporal boundary has visible curvature');
  const bottom=x=>{let lo=-90,hi=-15;for(let i=0;i<40;i++){const y=(lo+hi)/2;if(wearingDistances([x,y],device)[key]>0)lo=y;else hi=y;}return (lo+hi)/2;};
  assert.ok(Math.abs(bottom(-20)-2*bottom(0)+bottom(20))>.15,'lower boundary has visible curvature');
 }
});

test('AURA rigid side walls remain straight in perspective instead of bowing into a soft ring',()=>{
 for(const vertical of [-20,-10,0,10,20]){
  const p=rayToAngular(Math.tan(39*Math.PI/180),Math.tan(vertical*Math.PI/180),-1),front=frontAngles(p);
  assert.ok(Math.abs(front[0]-39)<1e-10);assert.ok(Math.abs(front[1]-vertical)<1e-10);
  assert.ok(wearingDistances(p,'aura').opticalFrame<0,'same straight side wall remains opaque along its height');
 }
});

test('AURA nasal housing meets the nose support without the temporal-side transparent gap',()=>{
 for(const eye of ['right','left']){
  const sign=eye==='right'?1:-1;
  for(const [horizontal,vertical] of [[-39,18],[-42,5],[-44,-12],[-42,-25]]){
   const p=rayToAngular(sign*Math.tan(horizontal*Math.PI/180),Math.tan(vertical*Math.PI/180),-1);
   assert.ok(wearingDistances(p,'aura',eye).frame<0,'inner housing connects continuously to the nasal support');
  }
  assert.ok(wearingDistances([45*sign,0],'aura',eye).frame>0,'temporal-side outer glass remains transparent');
 }
});

test('AURA photo arrangement joins the prism to the brow and nose while outer glass extends down and out',()=>{
 for(const eye of ['right','left']){
  const sign=eye==='right'?1:-1;
  const at=(x,y)=>wearingDistances(rayToAngular(sign*Math.tan(x*Math.PI/180),Math.tan(y*Math.PI/180),-1),'aura',eye);
  // Just above the clear prism, every sample must hit the continuous upper
  // assembly, rather than an unattached ring with a see-through strip above.
  for(const x of [-34,-17,0,17,34])for(const y of [27,29,32,40])assert.ok(at(x,y).frame<0);
  // At the nose the inner assembly touches the outer rim. The corresponding
  // temporal rays stay transparent; a concentric pair fails this comparison.
  for(const y of [-16,0,16]){
   assert.ok(at(-42,y).frame<0,'nose-side attachment has no clear slit');
   const d=at(44,y);assert.ok(d.frame>1&&d.lens<-1&&d.optical>0,'clear outer lens extends temporal to the prism');
  }
  for(const y of [-32,-33,-34]){const d=at(0,y);assert.ok(d.frame>1&&d.lens<-1&&d.optical>0,'a bounded transparent band remains below the optical body');}
  for(const [x,y] of [[0,-44],[52,-34],[59,-25]]){const d=wearingDistances([x*sign,y],'aura',eye);assert.ok(d.frame>0&&d.lens>0,'lower and lower-temporal glass does not spread across the whole periphery');}
 }
});

test('fixed prescription frame and correction boundary coincide for both eyes',()=>{
 const rx=RENDER_ASSUMPTIONS.wearing.aura.prescription;
 for(const eye of ['right','left']){
  const mirror=eye==='left'?-1:1,at=([x,y])=>wearingDistances([x*mirror,y],'aura',eye);
  for(const [p,direction] of [[[49.3856,-5.9136],[1,0]],[[-42.768,-5.9136],[-1,0]],[[3.3088,25.256],[0,1]],[[3.3088,-37.0832],[0,-1]]]){
   const on=at(p),inside=at(p.map((v,i)=>v-direction[i]*2)),outside=at(p.map((v,i)=>v+direction[i]*2));
   assert.ok(Math.abs(on.prescription)<1e-8&&on.prescriptionFrame<0,'visible rim marks the corrected boundary');
   assert.ok(inside.prescription<0&&outside.prescription>0,'blur remains outside the fixed insert');
  }
  assert.ok(at(rx.hanger.a).prescriptionFrame<0&&at(rx.hanger.b).prescriptionFrame<0);
  assert.ok(at(rx.hanger.b).nosePad<0,'short insert mount terminates at the nose support');
 }
});

test('compact AURA insert retains the approved 110 percent outline and lower placement',()=>{
 const old={center:[-1,-1.5],half:[47.6,32.2],radius:14},anchor=[-48.6,30.7];
 for(const p of [[0,0],[-48.6,-6.72],[56.12,-6.72],[3.76,28.7],[-36,22],[25,-42],[55,26]]){
  const local=p.map((v,i)=>anchor[i]+(v/.88+(i===1?2:0)-anchor[i])/1.1);
  assert.ok(Math.abs(wearingDistances(p,'aura').prescription-roundedDistance(local,old)*1.1*.88)<1e-8);
 }
});


test('compact surrounds expose lower room rays inside a 90-degree vertical host view',()=>{
 // Regression for the former -49 / -52 degree boundaries: these could never
 // reveal their lower edge inside a host whose down angle was only 45 degrees.
 for(const device of ['meta','aura'])for(const eye of ['left','right']){
  const key=device==='meta'?'shell':'lens',at=p=>wearingDistances(p,device,eye);
  assert.ok(at([0,-37]).frame<0,'the lower structure is still present');
  assert.ok(at([0,-42]).frame>.6&&at([0,-42])[key]>0,'a visible room band starts before the host lower edge');
  assert.ok(at([0,-44]).frame>2,'the opening has useful clearance, not just one antialiased pixel');
 }
 // The nasal attachment may extend farther; the centered clear prism itself
 // must stop short of +-39 degrees rather than the previous +-42.
 for(const sign of [-1,1]){
  assert.ok(wearingDistances([sign*36,0],'aura').optical<0);
  assert.ok(wearingDistances([sign*39,0],'aura').optical>0);
 }
});

test('compact inserts cover the display and still reveal uncorrected peripheral rays',()=>{
 for(const assumption of ['diagonal','horizontal'])for(const eye of ['right','left']){
  for(const p of displayContour(getProfile('aura',assumption),128)){
   const d=wearingDistances(p,'aura',eye);
   assert.ok(d.prescription<-.9&&d.prescriptionFrame>.2,'fixed insert and mount do not clip the full display');
  }
  assert.ok(wearingDistances([0,-44],'aura',eye).prescription>0,'lower peripheral room remains outside the prescription');
 }
});

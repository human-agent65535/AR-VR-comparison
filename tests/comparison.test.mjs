import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {comparisonLayout,COMPARISON_PAIRS} from '../src/comparison-layout.js';
import {projection,projectedBounds,getProfile} from '../src/optics.js';
import {createHeadsetOptics,auraTransmission} from '../src/xr-optics.js';
import {DEVICES,deviceFov,RENDER_ASSUMPTIONS} from '../src/device-data.js';
import {wearingDistances} from '../src/wear-shapes.js';
import {composePixel} from './helpers/perception.js';

test('wide layouts show all three; smaller layouts offer exactly the selected two at equal scale',()=>{
  for(const width of [390,659,660,844,1139,1140,1441])for(const [pair,devices] of Object.entries(COMPARISON_PAIRS)){
    const views=comparisonLayout(width,751,pair),expected=width>=1140?['quest3','meta','aura']:devices;
    assert.deepEqual(views.map(v=>v.type),expected);
    assert.equal(new Set(views.map(v=>projection(v.w,v.h-80).scale)).size,1);
    for(const v of views)assert.ok(v.x>=0&&v.y>=0&&v.x+v.w<=width&&v.y+v.h<=751);
    assert.equal(views[1].y>0,width<660);
  }
});
test('wearing framing enlarges all devices equally without replacing anatomical human limits',()=>{
  const close=projection(620,560,'right','wearing'),full=projection(620,560,'right','peripheral');
  assert.equal(RENDER_ASSUMPTIONS.humanField.includesEyeRotations,false);
  assert.deepEqual(close.human,full.human);assert.deepEqual(close.center,[0,0]);assert.ok(close.scale>full.scale);
  const quest=projectedBounds(getProfile('quest3'),620,560),meta=projectedBounds(getProfile('meta'),620,560);
  assert.ok(quest.width/620>.88&&quest.height/560>.85);assert.ok(quest.width<=620&&quest.height<=560,'the tighter crop still contains the Quest comparison envelope');assert.ok(Math.abs(quest.width/meta.width-110/70)<1e-10);
});
test('every retained chart device can be drawn with disclosed estimates; R1 is absent',()=>{
  assert.equal(DEVICES.some(d=>d.id==='r1'),false);assert.equal(DEVICES.length,7);
  for(const d of DEVICES){const f=deviceFov(d,'diagonal',true);assert.ok(f.h>0&&f.v>0);if(d.fov.axis==='unknown')assert.ok(f.axisAssumed);}
});
test('native AR clips emitted content only and restores original materials on Quest / Meta switches',()=>{
  const renderer={render(){}},scene=new T.Scene(),material=new T.MeshBasicMaterial(),spriteMaterial=new T.SpriteMaterial();
  scene.add(new T.Mesh(new T.PlaneGeometry(1,1),material),new T.Sprite(spriteMaterial));
  const optics=createHeadsetOptics(renderer,scene);
  optics.update({profile:'aura',dim:5,guides:false,style:'vr'});
  for(const m of [material,spriteMaterial]){assert.equal(m.blending,T.CustomBlending);assert.equal(m.blendDst,T.OneMinusSrcColorFactor);assert.equal(m.premultipliedAlpha,true);assert.equal(m.stencilFunc,T.EqualStencilFunc);assert.equal(m.stencilRef,1);}
  assert.equal(optics.snapshot().periphery,'open virtual room');assert.equal(optics.snapshot().guides,false);
  optics.update({profile:'meta',dim:1,guides:false,style:'vr'});
  assert.equal(material.blendDst,T.OneMinusSrcAlphaFactor);assert.equal(material.premultipliedAlpha,false);assert.equal(material.blending,T.NormalBlending);assert.equal(material.transparent,false);assert.equal(material.stencilWrite,true);
  optics.update({profile:'quest3',dim:1,guides:true,style:'vr'});
  assert.equal(material.stencilWrite,false);assert.equal(spriteMaterial.transparent,true);assert.equal(optics.snapshot().contentClipping,'none');
});
test('Quest MSAA stencil loss between render calls cannot separate the aperture from content',()=>{
 const scene=new T.Scene(),material=new T.MeshBasicMaterial(),camera=new T.PerspectiveCamera(),passes=[];
 scene.add(new T.Mesh(new T.PlaneGeometry(),material));
 const renderer={render(s){passes.push(s);},clearDepth(){passes.push('depth cleared');}};
 const optics=createHeadsetOptics(renderer,scene),writer=scene.getObjectByName('XR display stencil');
 assert.ok(writer,'the aperture is part of the content scene');
 for(const profile of ['meta','aura','quest3','meta']){
  optics.update({profile,content:'earth',style:'auto',dim:2,guides:false});
  assert.equal(writer.visible,profile!=='quest3');
  assert.equal(writer.material.stencilFunc,T.AlwaysStencilFunc);
  assert.equal(writer.material.colorWrite,false);
  assert.ok(writer.renderOrder<scene.children[0].renderOrder);
  passes.length=0;optics.beforeContent(camera);
  assert.equal(passes.includes(scene),false,'no standalone aperture render before content');
  if(profile!=='quest3'){assert.equal(passes.length,2);assert.equal(passes[1],'depth cleared');}
 }
});
test('all five tint levels retain light and the open region is independent of tint or VR mode',()=>{
  const values=[1,2,3,4,5].map(auraTransmission);
  values.forEach((v,i)=>{assert.ok(v>0&&v<1);if(i)assert.ok(v<values[i-1]);});
  for(const eye of ['right','left']){
    const mirror=eye==='left'?-1:1;
    assert.ok(wearingDistances([95*mirror,0],'meta',eye).frame>0,'Meta retains far peripheral openings');
    assert.ok(wearingDistances([0,-67],'meta',eye).frame>0,'Meta lower opening remains beyond the broad front wrap');
    assert.ok(wearingDistances([95*mirror,0],'aura',eye).lens>0,'outside the AURA lens is not electrochromically dimmed');
  }
});
test('strong AURA tint suppresses the room without fading displayed content or hiding black-pixel reality',()=>{
  const real=[.8,.6,.4],emitted=[.12,.24,.32],black=[0,0,0];
  for(const level of [1,2,3,4,5]){
    const transmission=auraTransmission(level);
    const background=composePixel({route:'optical',real,emitted:black,transmission});
    const content=composePixel({route:'optical',real,emitted,transmission});
    content.forEach((v,i)=>assert.ok(Math.abs(v-background[i]*(1-emitted[i])-emitted[i])<1e-10,'tint changes only the real-world contribution'));
    assert.deepEqual(composePixel({route:'optical',real:black,emitted,transmission}),emitted,'display on a dark background stays at full brightness');
    background.forEach((v,i)=>assert.equal(v,real[i]*transmission));
  }
  assert.equal(auraTransmission(5),.10,'level 5 retains 10% background brightness for the requested 90% dimming');
  const roomVariation=[.2,.8].map(r=>composePixel({route:'optical',real:[r,r,r],emitted:[.5,.5,.5],transmission:auraTransmission(5)})[0]);
  assert.ok(roomVariation[1]-roomVariation[0]<.031,'at 90% dimming room patterns remain within a 3% midtone variation, allowing rounding');
});

test('bounded AR composition preserves highlight separation rather than clipping both to white',()=>{
 const real=[.8,.8,.8];
 const bright=composePixel({route:'optical',real,emitted:[.8,.9,1],transmission:.65});
 assert.ok(bright[0]<bright[1]&&bright[1]<bright[2]);
 assert.equal(bright[2],1);
 const dim=composePixel({route:'optical',real,emitted:[.8,.9,1],transmission:auraTransmission(5)});
 assert.ok(dim[0]-.8<.03,'strong-tint mid/highlights remain close to VR colors');
 assert.ok(dim[1]-.9<.02);
});

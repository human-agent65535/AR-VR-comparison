import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {getProfile,projection,projectedBounds,auraFov,inDisplayRay,angularToRay,rayToAngular,humanVisibility,humanField,displayContour,CALIBRATION_POINTS,rad} from '../src/optics.js';
const sizes=[[390,390],[844,230],[2560,720],[720,720]];
const pointRay=p=>[Math.tan(p.h*rad),Math.tan(p.v*rad),-1];

test('widescreen and phone layouts preserve display angles and scale relative to the human field',()=>{
  for(const device of ['meta','aura'])for(const eye of ['left','right'])for(const [w,h] of sizes){
    const profile=getProfile(device),p=projection(w,h,eye),b=projectedBounds(profile,w,h,eye);
    assert.ok(Math.abs(b.width/b.height-profile.h/profile.v)<1e-10);
    assert.ok(Math.abs(b.width/p.scale-profile.h)<1e-10);
    assert.ok(Math.abs(b.height/p.scale-profile.v)<1e-10);
    assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=w&&b.y+b.height<=h);
  }
});
test('human field is finite, asymmetric and mirrored for each eye',()=>{
  assert.deepEqual(humanField('right'),{left:60,right:100,up:60,down:75});
  assert.equal(humanVisibility(-65,0,'right'),0);
  assert.ok(humanVisibility(65,0,'right')>.95);
  assert.equal(humanVisibility(105,0,'right'),0);
  assert.equal(humanVisibility(0,80,'right'),0);
  assert.equal(humanVisibility(0,-80,'right'),0);
  for(const x of [-110,-75,-40,0,40,75,110])assert.equal(humanVisibility(x,20,'left'),humanVisibility(-x,20,'right'));
});
test('ultrawide screen creates margins, never an unlimited human window',()=>{
  const small=projection(1200,500),wide=projection(3600,500);
  assert.equal(small.scale,wide.scale);
  const outerPixel=wide.origin[0]+106*wide.scale;
  assert.ok(outerPixel<3600);
  assert.equal(humanVisibility((outerPixel-wide.origin[0])/wide.scale,0),0);
});
test('30-degree central circular reference remains circular for every screen shape',()=>{
  for(const [w,h] of sizes){const p=projection(w,h);for(let a=0;a<Math.PI*2;a+=.2){
    const x=15*Math.cos(a),y=15*Math.sin(a),q=rayToAngular(...angularToRay(x,y));
    assert.ok(Math.abs(Math.hypot(q[0]*p.scale,q[1]*p.scale)-15*p.scale)<1e-7);
  }}
});
test('spherical rays represent temporal vision beyond ninety degrees without wrapping',()=>{
  for(const [x,y] of [[0,0],[100,0],[-100,0],[30,45],[-60,-50]]){
    const ray=angularToRay(x,y),p=rayToAngular(...ray);
    assert.ok(Math.abs(Math.hypot(...ray)-1)<1e-10);
    assert.ok(Math.abs(p[0]-x)<1e-8&&Math.abs(p[1]-y)<1e-8);
  }
  assert.ok(angularToRay(100,0)[2]>0);
  assert.equal(inDisplayRay(angularToRay(100,0),getProfile('meta')),false);
});
test('forward test points visibly distinguish the FOV of Meta and Aura',()=>{
  const visible=type=>CALIBRATION_POINTS.filter(p=>inDisplayRay(pointRay(p),getProfile(type))).map(p=>p.id);
  assert.deepEqual(visible('meta'),['C','A','B']);
  assert.deepEqual(visible('aura'),['C']);
  assert.equal(inDisplayRay(pointRay(CALIBRATION_POINTS[2]),getProfile('aura','horizontal')),true);
});
test('turning toward B brings it into Aura while the optical boundary stays fixed',()=>{
  const ray=new Vector3(...pointRay(CALIBRATION_POINTS[2]));
  assert.equal(inDisplayRay(ray.toArray(),getProfile('aura')),false);
  ray.applyAxisAngle(new Vector3(0,1,0),20*rad);
  assert.equal(inDisplayRay(ray.toArray(),getProfile('aura')),true);
});
test('chart contours and shader clipping use the same angular frustum',()=>{
  for(const type of ['meta','aura']){
    const profile=getProfile(type);
    for(const p of displayContour(profile))assert.equal(inDisplayRay(angularToRay(...p),profile),true);
    assert.equal(inDisplayRay(angularToRay(profile.h/2+.1,0),profile),false);
    assert.equal(inDisplayRay(angularToRay(0,profile.v/2+.1),profile),false);
  }
});
test('Aura keeps diagonal and horizontal assumptions distinct',()=>{
  const d=auraFov('diagonal'),h=auraFov('horizontal');
  assert.ok(Math.abs(d.d-70)<1e-10);assert.equal(h.h,70);assert.ok(h.v>d.v);
});

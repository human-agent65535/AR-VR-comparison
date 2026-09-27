import test from 'node:test';
import assert from 'node:assert/strict';
import {Matrix4,Vector3,Vector4,Quaternion,Euler} from 'three';
import {xrTarget,projectionProfile,profileFits,targetViewport,XR_PROFILES,previewVerticalFov,usesPassthrough,centeredContentOrientation,headsetAlignment,pitchRay} from '../src/xr-math.js';
import {symmetricProfile} from '../src/fov-math.js';
import {META_SDK_PROFILE,RENDER_ASSUMPTIONS} from '../src/device-data.js';
import {projection,projectedBounds,inDisplayRay,angularToRay,getProfile} from '../src/optics.js';
import {XR_MENU,XR_CONTENTS,xrControls,xrMenuButtons} from '../src/xr-menu.js';
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} ≠ ${b}`);
test('host centering shares one pitch across both eyes and preserves target angles',()=>{
 const rad=Math.PI/180;
 const matrices=[[-54,40,-55,44],[-40,54,-55,44]].map(([l,r,d,u])=>new Matrix4().makePerspective(Math.tan(l*rad),Math.tan(r*rad),Math.tan(u*rad),Math.tan(d*rad),1,100));
 const before=matrices.map(m=>m.toArray()),profiles=matrices.map(projectionProfile),pitch=headsetAlignment(profiles);
 near(pitch,-5.5);near(headsetAlignment(profiles,'forward'),0);near(headsetAlignment([]),0);
 near(headsetAlignment([...profiles,{angles:{down:-53*rad,up:45*rad}}]),-4.5);
 for(const id of ['meta','aura']){
  const target=xrTarget(id),center=new Vector3(...pitchRay([0,0,-1],pitch));
  for(const [x,y,expected] of [[target.frustum[1],0,target.h/2],[0,target.frustum[3],target.v/2]]){
   near(new Vector3(...pitchRay([x,y,-1],pitch)).angleTo(center)/rad,expected);
  }
  for(const [i,profile] of profiles.entries()){
   const coverage=targetViewport(target,profile,pitch),uv=[];
   for(const x of [target.frustum[0],target.frustum[1]])for(const y of [target.frustum[2],target.frustum[3]]){
    const p=new Vector4(...pitchRay([x,y,-1],pitch),1).applyMatrix4(matrices[i]);uv.push([(p.x/p.w+1)/2,(p.y/p.w+1)/2]);
   }
   [Math.min(...uv.map(p=>p[0])),Math.max(...uv.map(p=>p[0])),Math.min(...uv.map(p=>p[1])),Math.max(...uv.map(p=>p[1]))].forEach((n,i)=>near(coverage.bounds[i],n));
   assert.ok(coverage.fits);
   near(profile.angles.up/rad-(pitch+target.v/2),(pitch-target.v/2)-profile.angles.down/rad);
  }
 }
 assert.deepEqual(matrices.map(m=>m.toArray()),before);
});
test('aligned recenter preserves distance and follows the same pitch even with head roll',()=>{
 for(const pitch of [-.6,0,.5])for(const yaw of [-1.1,0,.8])for(const roll of [-.2,0,.3]){
  const head=new Quaternion().setFromEuler(new Euler(pitch,yaw,roll,'YXZ'));
  const center=new Vector3(0,0,-3).applyQuaternion(centeredContentOrientation(head,-5.5)).applyQuaternion(head.clone().invert());
  pitchRay([0,0,-3],-5.5).forEach((v,i)=>near(center.toArray()[i],v));near(center.length(),3);
 }
});
test('recenter places content on the head-forward ray including upward and downward pitch',()=>{
 for(const pitch of [-.6,0,.5])for(const yaw of [-1.1,0,.8])for(const roll of [-.2,0,.3]){
  const head=new Quaternion().setFromEuler(new Euler(pitch,yaw,roll,'YXZ'));
  const center=new Vector3(0,0,-3).applyQuaternion(centeredContentOrientation(head)).applyQuaternion(head.clone().invert());
  near(center.x,0);near(center.y,0);near(center.z,-3);
 }
 for(const id of ['meta','aura']){const [left,right,down,up]=xrTarget(id).frustum;near(left,-right);near(down,-up);}
});
test('WebXR runtime frusta retain asymmetry and reconstruct screen-edge rays without changing the matrix',()=>{
  const n=.07,m=new Matrix4().makePerspective(-.09,.075,.085,-.06,n,150),before=m.toArray(),p=projectionProfile(m);
  const inverse=m.clone().invert();
  for(const [x,y,index] of [[-1,0,0],[1,0,1],[0,-1,2],[0,1,3]]){const ray=new Vector4(x,y,1,1).applyMatrix4(inverse);near((index<2?ray.x:ray.y)/-ray.z,p.frustum[index]);}
  near(p.h,(Math.atan(.09/n)+Math.atan(.075/n))*180/Math.PI);near(p.v,(Math.atan(.085/n)+Math.atan(.06/n))*180/Math.PI);assert.notEqual(-p.angles.left,p.angles.right);assert.deepEqual(m.toArray(),before);
});
test('Quest native baseline is never hard-coded to 110×96; targets remain visible rather than render extents',()=>{
  assert.deepEqual(XR_PROFILES,['quest3','meta','aura']);assert.equal(xrTarget('quest3'),null);const meta=xrTarget('meta');near(meta.h,70);near(meta.v,66);assert.notEqual(meta.h,META_SDK_PROFILE.renderExtent.h);assert.ok(xrTarget('aura').axisAssumed);assert.throws(()=>xrTarget('perceived'),RangeError);assert.throws(()=>xrTarget('bad'),RangeError);
});
test('desktop preview has a broad reference view instead of fitting each target to its canvas',()=>{
  for(const aspect of [.55,1,4/3,16/9,2.4]){
    const v=previewVerticalFov(aspect),h=2*Math.atan(Math.tan(v*Math.PI/360)*aspect)*180/Math.PI;
    assert.ok(v>=108-1e-9);assert.ok(h>=120-1e-9);
    const fraction=Math.tan(35*Math.PI/180)/Math.tan(h*Math.PI/360);
    assert.ok(fraction<.41,'Meta nominal aperture does not expand to fill the preview');
  }
});
test('window apps retain passthrough controls while immersive Earth stays opaque',()=>{
  for(const content of ['cinema','work','fov','vision','earth']){
    assert.equal(usesPassthrough({style:'auto',content}),content!=='earth');
    assert.equal(usesPassthrough({style:'passthrough',content}),content!=='earth');
    assert.equal(usesPassthrough({style:'vr',content}),false);
  }
});
test('headset menu exposes only controls that affect the active device and content',()=>{
 for(const profile of XR_PROFILES)for(const content of XR_CONTENTS){
  const state={profile,content,style:'auto',dim:2,guides:true,place:'newyork',earthLayout:'compact'},controls=xrControls(state),buttons=xrMenuButtons(state).map(b=>b.id);
  assert.equal(controls.style,profile==='meta'&&content!=='earth');
  assert.equal(buttons.includes('style'),controls.style);
  assert.equal(buttons.includes('place'),content==='earth');
  assert.equal(buttons.includes('layout'),content==='earth');
  assert.equal(buttons.includes('tint'),profile==='aura');
  assert.equal(buttons.includes('guides'),profile!=='quest3');
  assert.equal(buttons.includes('time'),profile!=='quest3'||content!=='earth');
  for(const id of ['quest3','meta','aura','content','recenter','exit'])assert.ok(buttons.includes(id));
 }
});
test('headset menu buttons stay in their texture and have disjoint hit areas',()=>{
 for(const profile of XR_PROFILES)for(const content of XR_CONTENTS){
  const buttons=xrMenuButtons({profile,content,style:'auto',dim:2,guides:true,place:'newyork',earthLayout:'compact'});
  for(const [i,a] of buttons.entries()){
   assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=XR_MENU.width&&a.y+a.h<=XR_MENU.height);
   for(const b of buttons.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
  }
 }
});
test('a target too wide for the real host projection is reported rather than expanding the runtime view',()=>{
  assert.equal(profileFits(xrTarget('meta'),symmetricProfile(100,90)),true);assert.equal(profileFits(xrTarget('meta'),symmetricProfile(64,62)),false);assert.equal(profileFits(null,symmetricProfile(80,80)),true);
});

test('projection diagnostics use tangent-space coverage and expose a genuinely narrow host',()=>{
 const target=xrTarget('meta'),wide=targetViewport(target,symmetricProfile(100,90)),narrow=targetViewport(target,symmetricProfile(74,68));
 near(wide.width,Math.tan(35*Math.PI/180)/Math.tan(50*Math.PI/180));
 near(wide.height,Math.tan(33*Math.PI/180));
 assert.ok(wide.width<.60&&wide.height<.66,'nominal target is not fitted to a wider host');
 assert.ok(narrow.width>.92&&narrow.height>.96,'near-full texture coverage is possible with a narrow runtime');
 const matrix=new Matrix4().makePerspective(-.09,.075,.085,-.06,.07,150),runtime=projectionProfile(matrix),coverage=targetViewport(target,runtime);
 for(const [i,ray] of target.frustum.entries()){
  const p=new Vector4(i<2?ray:0,i<2?0:ray,-1,1).applyMatrix4(matrix);
  near(coverage.bounds[i],((i<2?p.x:p.y)/p.w+1)/2);
 }
 assert.notEqual(coverage.bounds[0],1-coverage.bounds[1],'asymmetric eye projection remains asymmetric');
 const tooSmall=targetViewport(target,symmetricProfile(64,62));
 assert.ok(tooSmall.width>1&&tooSmall.height>1&&!tooSmall.fits,'overflow is reported, never hidden by a clamp');
 assert.deepEqual(targetViewport(null,runtime),{bounds:[0,1,0,1],width:1,height:1,fits:true});
});
test('Quest 3, Meta and AURA keep an equal angular scale and clip peripheral app content differently',()=>{
  for(const [w,h] of [[600,560],[390,360],[1100,440]]){const q=projectedBounds(getProfile('quest3'),w,h,'right'),m=projectedBounds(getProfile('meta'),w,h,'right');near(q.width/m.width,110/70);assert.ok(q.height>m.height);assert.ok(projection(w,h,'right').scale>0);}
  const side=angularToRay(42,0);assert.equal(inDisplayRay(side,getProfile('quest3')),true);assert.equal(inDisplayRay(side,getProfile('meta')),false);assert.equal(inDisplayRay(side,getProfile('aura')),false);
});

test('complete app layout fits the display rather than mistaking a small entrance for a cropped screen',()=>{
  const app=RENDER_ASSUMPTIONS.earthApp,hud=app.hud;
  for(const x of [-hud.width/2,hud.width/2])for(const y of [-hud.height/2,hud.height/2]){
    const ray=[x,y,-hud.distance];
    for(const device of ['quest3','meta','aura'])assert.ok(inDisplayRay(ray,getProfile(device)),'entire central app interface fits every target');
  }
  assert.equal(inDisplayRay([hud.width/2*hud.wideScale,0,-hud.distance],getProfile('meta')),false,'expanded spatial layout can intentionally extend past the display');
  const center=new Vector3(...app.center),axis=center.clone().normalize(),right=new Vector3(1,0,0),up=new Vector3(0,1,0).projectOnPlane(axis).normalize();
  const angle=Math.asin(app.radius*app.initialZoom/center.length());
  for(let i=0;i<128;i++){
    const t=i*Math.PI/64,ray=axis.clone().multiplyScalar(Math.cos(angle)).addScaledVector(right,Math.cos(t)*Math.sin(angle)).addScaledVector(up,Math.sin(t)*Math.sin(angle)).toArray();
    assert.ok(inDisplayRay(ray,getProfile('meta')),'default globe silhouette fits Meta when looking forward');
  }
});

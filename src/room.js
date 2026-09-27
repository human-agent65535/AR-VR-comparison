import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {ROOM_LIGHTING,initialRoomTime} from './room-lighting.js';
export function createRoom(renderer,onChange=()=>{}){
const room=new T.Scene();room.background=new T.Color('#afbbc6');room.fog=new T.FogExp2('#b3b9be',.004);const fallbackCity=new T.Group();room.add(fallbackCity);
function mat(color,roughness=.65,metalness=0){return new T.MeshStandardMaterial({color,roughness,metalness})}
const mats={wall:mat('#c6c2b8'),dark:mat('#20252b'),frame:mat('#34383b',.45,.5),floor:mat('#967354',.7,.02),desk:mat('#543f30',.55,.03),fabric:mat('#b9b3a5',1),cushion:mat('#ded8c9',1),wood:mat('#624331'),white:mat('#dedbd3')};
const boxGeo=new T.BoxGeometry(1,1,1),softBox=new RoundedBoxGeometry(1,1,1,2,.055);const plantGeo=new T.SphereGeometry(1,8,6);const emissiveCache=new Map();
function glow(color){if(!emissiveCache.has(color))emissiveCache.set(color,new T.MeshBasicMaterial({color}));return emissiveCache.get(color)}
function box(w,h,d,x,y,z,m,parent=room){const rounded=h>.09&&w>.12&&d>.07;let mesh=new T.Mesh(rounded?new RoundedBoxGeometry(w,h,d,3,Math.min(.065,h*.17,w*.12,d*.16)):boxGeo,m);if(!rounded)mesh.scale.set(w,h,d);mesh.castShadow=!m.transparent&&h>.025;mesh.receiveShadow=true;mesh.position.set(x,y,z);parent.add(mesh);return mesh}
function cylinder(rt,rb,h,x,y,z,m,parent=room,segments=24){const mesh=new T.Mesh(new T.CylinderGeometry(rt,rb,h,segments),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function line(points,color,parent=room){const geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const mesh=new T.Line(geometry,new T.LineBasicMaterial({color}));parent.add(mesh);return mesh}
function point(color,intensity,distance,x,y,z){const l=new T.PointLight(color,intensity,distance,2);l.position.set(x,y,z);room.add(l);return l}
const hemi=new T.HemisphereLight('#d9e4ec','#958371',1.5);room.add(hemi);const moon=new T.DirectionalLight('#ffe2bc',2.5);moon.position.set(-8,4.8,-12);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-8,right:8,top:7,bottom:-5,near:.5,far:40});moon.shadow.normalBias=.035;moon.shadow.bias=-.0002;room.add(moon);
// A broad downward fill from the ceiling trim avoids an unmotivated bright
// point on the ceiling. Furniture still uses the shared contact shadows below.
const ceilingLight=new T.SpotLight('#ffe2bc',6,11,Math.PI*.42,.85,2);ceilingLight.position.set(0,3.5,2);ceilingLight.target.position.set(0,0,-1);room.add(ceilingLight,ceilingLight.target);
const deskLight=point('#b8cfdf',1.4,5,-2,1.5,-3),warm=point('#ffce91',9,7,3.25,1.9,3.8);
// Room shell. The north and west sides are full-height windows.
box(10,.16,10,0,-.08,0,mats.floor);box(10,.15,10,0,3.88,0,mats.wall);box(.18,3.9,10,5,1.9,0,mats.wall);box(10,3.9,.18,0,1.9,5,mats.wall);
box(10,.12,.2,0,.08,-5,mats.frame);box(10,.12,.2,0,3.75,-5,mats.frame);box(.2,.12,10,-5,.08,0,mats.frame);box(.2,.12,10,-5,3.75,0,mats.frame);
for(let x=-5;x<=5;x+=2)box(.06,3.75,.12,x,1.91,-5,mats.frame);for(let z=-5;z<=5;z+=2)box(.12,3.75,.06,-5,1.91,z,mats.frame);
box(10,.045,.06,0,1.0,-4.94,mats.frame);box(.06,.045,10,-4.94,1,0,mats.frame);
const glass=new T.MeshBasicMaterial({color:'#749dcc',transparent:true,opacity:.045,depthWrite:false,side:T.DoubleSide});box(9.8,3.6,.012,0,1.9,-4.98,glass);box(.012,3.6,9.8,-4.98,1.9,0,glass);
box(9.6,.025,.035,0,3.64,-4.83,glow('#b7a289'));box(.035,.025,9.6,-4.83,3.64,0,glow('#b7a289'));box(.03,.025,9.6,4.82,3.64,0,glow('#b7a289'));box(9.6,.025,.035,0,3.64,4.83,glow('#b7a289'));
// City: instanced towers and thousands of lit windows in the same geometry.
let seed=745;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const buildings=[],windows=[];for(let i=0;i<85;i++){const x=(random()-.5)*160,z=-12-random()*125,w=2.6+random()*5,d=2.6+random()*5,h=14+random()*58,y=-39+h/2;buildings.push({x,z,w,d,h,y});for(let yy=-36;yy<-39+h-1;yy+=2.25){for(let xx=x-w/2+.35;xx<x+w/2-.3;xx+=.83)if(random()>.27)windows.push({x:xx,y:yy,z:z+d/2+.012,w:.31,h:.64,side:false,color:random()>.35?'#ecc997':'#c6d1d5'});for(let zz=z-d/2+.35;zz<z+d/2-.3;zz+=.83)if(random()>.4)windows.push({x:x+w/2+.012,y:yy,z:zz,w:.31,h:.64,side:true,color:random()>.6?'#9acfff':'#eecaa1'})}}
// Additional towers visible through the side window.
for(let i=0;i<18;i++){let x=-15-random()*50,z=-5+random()*45,w=3+random()*5,d=4+random()*5,h=15+random()*40,y=-39+h/2;buildings.push({x,z,w,d,h,y});for(let yy=-36;yy<-39+h-1;yy+=2.5)for(let zz=z-d/2+.4;zz<z+d/2-.3;zz+=.9)if(random()>.35)windows.push({x:x+w/2+.015,y:yy,z:zz,w:.35,h:.7,side:true,color:'#c0c7c8'})}
const towers=new T.InstancedMesh(boxGeo,mat('#787f84',.9,.05),buildings.length);const dummy=new T.Object3D();buildings.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();towers.setMatrixAt(i,dummy.matrix);towers.setColorAt(i,new T.Color().setHSL(.61,.23,.18+random()*.16))});fallbackCity.add(towers);
const windowMesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({color:'white',side:T.DoubleSide}),windows.length);windows.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,1);dummy.rotation.set(0,b.side?Math.PI/2:0,0);dummy.updateMatrix();windowMesh.setMatrixAt(i,dummy.matrix);windowMesh.setColorAt(i,new T.Color(b.color).multiplyScalar(.45+random()*.8))});fallbackCity.add(windowMesh);
box(190,.2,200,0,-39,-60,mat('#101a2a'));
for(let x=-70;x<80;x+=14)box(.2,.05,170,x,-38.7,-50,glow('#6b7292'));
for(let z=-110;z<30;z+=18)box(155,.05,.16,0,-38.6,z,glow('#8d8aab'));
const moonMesh=new T.Mesh(new T.SphereGeometry(3.6,24,16),glow('#d4e3fa'));moonMesh.position.set(-42,29,-105);
// Desk, acoustic wall, ultrawide setup.
box(4.6,.11,1.1,.1,.8,-3.65,mats.desk);box(4.4,.024,.028,.1,.744,-3.11,glow('#cabd9c'));for(const x of [-1.88,2.08]){box(.065,.76,.82,x,.38,-3.65,mats.frame);box(.38,.055,.88,x,.035,-3.65,mats.dark)}
for(let i=0;i<24;i++)box(.05,3.48,.053,4.85,1.85,-4.4+i*.125,mats.wood);
function texture(draw,w=1024,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);return tx}
function screenTex(kind){return texture((c,w,h)=>{let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#1a2631');g.addColorStop(.45,'#344554');g.addColorStop(1,'#9b8a6c');c.fillStyle=g;c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.strokeStyle=`rgba(197,210,214,${.2+i*.025})`;c.lineWidth=2;c.beginPath();c.ellipse(w*.75,h*.7,w*.6-i*28,h*.65-i*20,-.4,0,Math.PI*2);c.stroke()}c.fillStyle='#d6edff';c.font='500 54px sans-serif';c.fillText(kind==='main'?'AFTER HOURS':'FOCUS',65,135);c.font='20px sans-serif';c.fillStyle='#95bed9';c.fillText(kind==='main'?'NIGHT SHIFT / 38TH FLOOR':'DESIGN. PLAY. REPEAT.',68,176);for(let i=0;i<5;i++){c.fillStyle='#0c1c36cc';c.fillRect(60+i*105,h-100,90,58);c.fillStyle=['#adbdc5','#c9b994','#9bafa9','#d1baa2','#aebbc8'][i];c.fillRect(78+i*105,h-84,24,24)}},1024,480)}
function monitor(x,y,z,w,h,kind,rot=0){const group=new T.Group();group.position.set(x,y,z);group.rotation.y=rot;room.add(group);box(w+.06,h+.06,.065,0,0,0,mats.dark,group);const scr=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:screenTex(kind)}));scr.position.z=.036;group.add(scr);box(.04,.26,.035,0,-h/2-.12,0,mats.frame,group);box(.38,.028,.24,0,-h/2-.245,.04,mats.dark,group);box(w,.01,.01,0,-h/2-.025,.039,glow('#77ceef'),group)}
monitor(-.5,1.51,-3.85,1.88,.8,'main');monitor(1.13,1.5,-3.83,.85,.9,'side',-.17);
box(1.55,.012,.56,-.5,.867,-3.43,mats.dark);box(.72,.025,.25,-.61,.89,-3.34,mats.frame);for(let row=0;row<4;row++)for(let col=0;col<14;col++){let m=col%4===0?glow(['#b9b9a5','#aab5b8','#aebbbc','#afbbb3'][row]):mats.dark;box(.039,.014,.039,-.92+col*.047,.91,-3.44+row*.052,m)}
let mouse=new T.Mesh(new T.SphereGeometry(1,16,12),mats.dark);mouse.scale.set(.053,.025,.085);mouse.position.set(.03,.899,-3.31);room.add(mouse);box(.008,.005,.035,.03,.924,-3.33,glow('#75c7ff'));
// PC with glass front and RGB fan rings.
box(.52,.8,.59,1.94,1.25,-3.54,mats.dark);box(.5,.76,.008,1.94,1.25,-3.235,new T.MeshBasicMaterial({color:'#4d699c',transparent:true,opacity:.22,depthWrite:false}));
const fans=[];for(let i=0;i<3;i++){let ring=new T.Mesh(new T.TorusGeometry(.084,.009,8,36),glow('#a7bbc7'));ring.position.set(1.94,1.02+i*.23,-3.223);room.add(ring);let hub=new T.Group();hub.position.copy(ring.position);for(let j=0;j<5;j++){let blade=box(.017,.064,.006,0,.039,0,mat('#688bb5'),hub);blade.rotation.z=j*Math.PI*2/5;blade.position.set(Math.sin(j*Math.PI*2/5)*.033,Math.cos(j*Math.PI*2/5)*.033,0)}room.add(hub);fans.push(hub)}
for(const x of [-1.82,1.62]){box(.18,.3,.19,x,1.02,-3.86,mats.dark);let s=new T.Mesh(new T.CircleGeometry(.052,24),mat('#576c80'));s.position.set(x,1.06,-3.76);room.add(s)}
cylinder(.085,.06,.15,-1.47,.95,-3.34,mats.white);cylinder(.073,.073,.005,-1.47,1.03,-3.34,mat('#342524'));
// Ergonomic chair, sofa and rug.
const chair=new T.Group();chair.position.set(-.5,0,-2.32);chair.rotation.y=.15;room.add(chair);box(.6,.13,.59,0,.5,0,mats.fabric,chair);let back=box(.58,.84,.14,0,.93,.26,mats.fabric,chair);back.rotation.x=-.12;box(.35,.16,.15,0,1.38,.29,mats.dark,chair);for(let x of [-.36,.36]){box(.06,.27,.06,x,.58,0,mats.frame,chair);box(.1,.055,.36,x,.73,-.02,mats.dark,chair)}cylinder(.033,.04,.35,0,.25,0,mats.frame,chair);for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,foot=box(.045,.045,.43,0,.08,.18,mats.dark,chair);foot.rotation.y=angle;foot.position.set(Math.sin(angle)*.15,.08,Math.cos(angle)*.15);const wheel=cylinder(.045,.045,.055,Math.sin(angle)*.33,.045,Math.cos(angle)*.33,mats.dark,chair,10);wheel.rotation.set(Math.PI/2,0,-angle);}
box(3.7,.015,3.1,.2,.013,.8,mat('#a49b88',1));for(let i=0;i<12;i++)box(3.5,.001,.012,.2,.022,-.57+i*.25,mat('#bbb19d',1));
const sofa=new T.Group();sofa.position.set(3.93,0,1.45);sofa.rotation.y=-Math.PI/2;room.add(sofa);box(2.8,.42,.93,0,.33,0,mats.fabric,sofa);box(2.8,.57,.2,0,.75,-.42,mats.fabric,sofa);for(let x of [-.9,0,.9]){box(.84,.18,.71,x,.58,.04,mats.fabric,sofa);box(.82,.47,.17,x,.81,-.29,mats.cushion,sofa)}for(let x of [-1.47,1.47])box(.2,.63,1,x,.6,0,mats.fabric,sofa);
for(const x of [-1.16,1.16])for(const z of [-.32,.32])box(.085,.13,.085,x,.065,z,mats.wood,sofa);
const marble=texture((c,w,h)=>{c.fillStyle='#d4c9b8';c.fillRect(0,0,w,h);for(let i=0;i<50;i++){let y=random()*h;c.strokeStyle=i%3?'#70614a20':'#eee5d344';c.lineWidth=1+random()*4;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y-50,w*.4,y+120,w,y+70);c.stroke()}},512,512);const stone=mat('#e4d9c6',.38,.03);stone.map=marble;cylinder(.55,.55,.10,1.6,.5,1.18,stone);cylinder(.06,.16,.46,1.6,.24,1.18,mats.dark);box(.29,.035,.21,1.57,.555,1.18,mats.white);box(.22,.014,.18,1.55,.58,1.18,mat('#738396'));
// Greenery, shelf, wall artwork and an ambient lamp.
function plant(x,z){cylinder(.2,.15,.36,x,.18,z,mat('#87939e'));for(let i=0;i<16;i++){let y=.45+random()*.95,a=random()*Math.PI*2;const stem=line([[x,.3,z],[x+Math.cos(a)*.18,y,z+Math.sin(a)*.18]],'#526e60');let leaf=new T.Mesh(plantGeo,mat(i%2?'#416e62':'#749283'));leaf.position.set(x+Math.cos(a)*.22,y,z+Math.sin(a)*.22);leaf.scale.set(.13,.035,.29);leaf.rotation.set(.5,a,.5);room.add(leaf)}}plant(-4.3,-4.15);plant(4.35,4.05);
const lampShade=mat('#c7b99b');lampShade.emissive.set('#ffd6a3');
cylinder(.018,.022,1.9,3.25,.98,3.8,mats.frame);cylinder(.27,.38,.29,3.25,1.98,3.8,lampShade);cylinder(.22,.22,.04,3.25,.02,3.8,mats.dark);cylinder(.28,.28,.01,3.25,1.83,3.8,glow('#f5c99c'));
for(let yy of [1.25,2.05,2.85]){box(2.8,.06,.35,.6,yy,4.83,mats.wood);for(let j=0;j<6;j++){const b=box(.1+random()*.13,.22+random()*.15,.22,-.65+j*.25,yy+.18,4.79,mat(['#7f849e','#b2988d','#697f86'][j%3]));b.rotation.z=(random()-.5)*.1}}
const poster=texture((c,w,h)=>{c.fillStyle='#c3b29d';c.fillRect(0,0,w,h);c.strokeStyle='#82746a';c.lineWidth=8;for(let i=0;i<8;i++){c.beginPath();c.arc(w/2,h*.42,30+i*26,0,Math.PI*2);c.stroke()}c.fillStyle='#776b60';c.font='36px sans-serif';c.textAlign='center';c.fillText('NEW YORK',w/2,h*.86)},512,650);const art=new T.Mesh(new T.PlaneGeometry(1.55,1.85),new T.MeshStandardMaterial({map:poster,roughness:1}));art.position.set(4.89,2.08,1.25);art.rotation.y=-Math.PI/2;room.add(art);

for(const side of [-1,1])for(let i=0;i<8;i++){const curtain=box(.13,3.45,.1,side*4.35+(i-3.5)*.1,1.84,-4.72,mat(i%2?'#bab6ac':'#cfcbc1',1));}
// A large wool rug, cushions, a throw, side table, and books.
box(.12,.56,.95,2.94,.68,1.95,mat('#b2a28b',1));
cylinder(.3,.3,.055,3.22,.61,.02,mats.wood);cylinder(.025,.04,.59,3.22,.30,.02,mats.frame);
cylinder(.055,.055,.1,3.24,.69,.02,mat('#ded7c5'));cylinder(.034,.034,.012,3.24,.75,.02,glow('#ddaf69'));
box(.31,.04,.23,-1.52,.89,-3.45,mat('#c7b89e'));box(.29,.03,.21,-1.49,.925,-3.43,mat('#727e82'));
// Linen, wool, and walnut introduce a quiet, lived-in texture.
const linen=texture((c,w,h)=>{c.fillStyle='#d6d1c5';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=3){c.strokeStyle=y%2?'#9c978b44':'#ffffff40';c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}for(let x=0;x<w;x+=3){c.strokeStyle='#99928625';c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}},256,256);linen.wrapS=linen.wrapT=T.RepeatWrapping;linen.repeat.set(3,3);mats.fabric.map=linen;mats.fabric.bumpMap=linen;mats.fabric.bumpScale=.006;mats.cushion.map=linen;
for(const x of [-.7,.7]){const pillow=box(.50,.40,.15,x,.88,-.16,mat(x>0?'#a18163':'#d9ceba',1),sofa);pillow.rotation.z=x*.24;pillow.rotation.x=-.18;}
// Books and a bowl on the coffee table.
const bowl=meshBowl();function meshBowl(){const m=new T.Mesh(new T.SphereGeometry(.13,24,12,0,Math.PI*2,0,Math.PI*.45),mat('#c5b89b',.35));m.rotation.x=Math.PI;m.scale.y=.5;m.position.set(1.82,.59,1.03);room.add(m);return m;}
// Bake low-contrast joints into a mipmapped texture once, instead of hundreds
// of raised strips which floated above the floor and aliased in the distance.
const oak=texture((c,w,h)=>{c.fillStyle='#a28a69';c.fillRect(0,0,w,h);const plank=w/20;
 for(let i=0;i<20;i++){const x=i*plank;c.fillStyle=i%3?'#f0d6a407':'#3b27190a';c.fillRect(x,0,plank,h);c.strokeStyle='#6f5d4855';c.lineWidth=.8;c.beginPath();c.moveTo(x,0);c.lineTo(x,h);for(let j=0;j<2;j++){const y=(j*.5+(i%3)/6)*h;c.moveTo(x,y);c.lineTo(x+plank,y);}c.stroke();
  for(let k=0;k<25;k++){const xx=x+random()*plank;c.strokeStyle=k%3?'#6f513413':'#e4d2ae20';c.lineWidth=.4+random();c.beginPath();c.moveTo(xx,0);c.bezierCurveTo(xx+random()*3,h*.3,xx-random()*3,h*.7,xx,h);c.stroke();}}
},1024,1024);oak.wrapS=oak.wrapT=T.RepeatWrapping;oak.repeat.set(2,2);mats.floor.color.set('#d1bc95');mats.floor.map=oak;mats.floor.needsUpdate=true;
// Soft contact shadows keep furniture grounded in the room.
const shadowTexture=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#17180fe0');g.addColorStop(.5,'#17180f88');g.addColorStop(1,'#17180f00');c.fillStyle=g;c.fillRect(0,0,w,h)},128,128);
for(const [x,z,w,d,a] of [[3.9,1.45,1.6,3.6,.36],[1.6,1.18,1.5,1.5,.35],[-.5,-2.32,.9,.9,.28],[.1,-3.65,4.8,1.5,.27]]){const sh=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:a,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(x,.026,z);room.add(sh);}
const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromScene(new RoomEnvironment(),.025);room.environment=env.texture;room.environmentIntensity=.3;pmrem.dispose();
const skylineTime={value:new T.Vector2()},skylineMaterial=new T.MeshBasicMaterial({side:T.BackSide,fog:false});
// Relight the same illustrative skyline. This keeps landmarks fixed between
// times of day and does not add a device-specific tint, noise or exposure curve.
skylineMaterial.onBeforeCompile=shader=>{shader.uniforms.skylineTime=skylineTime;shader.fragmentShader='uniform vec2 skylineTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec3 original=diffuseColor.rgb;
 float luma=dot(original,vec3(.2126,.7152,.0722));
 float sky=smoothstep(.55,.82,vMapUv.y);
 vec3 daylight=mix(original,vec3(luma),.62)*vec3(.94,1.06,1.28)*1.12;
 daylight=mix(daylight,vec3(.30,.53,.78)*(.55+luma*.55),sky*.65);
 vec3 night=mix(original,vec3(luma),.65)*vec3(.07,.10,.19);
 vec3 nightSky=mix(vec3(.009,.016,.034),vec3(.002,.004,.012),vMapUv.y);
 night=mix(night,nightSky,sky);
 diffuseColor.rgb=mix(mix(original,daylight,skylineTime.x),night,skylineTime.y);
`);};
skylineMaterial.customProgramCacheKey=()=> 'skyroom-time-v1';
let skylineReady=false,currentTime=null,lightingRevision=0,shadowSize=2048;
const loader=new T.TextureLoader();loader.load('./skyline.png',tx=>{tx.colorSpace=T.SRGBColorSpace;skylineMaterial.map=tx;const backdrop=new T.Mesh(new T.CylinderGeometry(74,74,116,96,1,true,Math.PI*.25,Math.PI*1.5),skylineMaterial);backdrop.position.y=-2;backdrop.rotation.y=-.4;room.add(backdrop);fallbackCity.visible=false;skylineReady=true;onChange();},undefined,()=>{});
function setTime(value){
 const time=initialRoomTime(value);if(time===currentTime)return false;
 currentTime=time;lightingRevision++;const p=ROOM_LIGHTING[time];
 hemi.color.set(p.sky);hemi.groundColor.set(p.ground);hemi.intensity=p.ambient;
 moon.color.set(p.sun);moon.intensity=p.sunIntensity;moon.position.fromArray(p.sunPosition);
 room.environmentIntensity=p.environment;room.background.set(time==='night'?'#101a2d':time==='day'?'#bad3e5':'#afbbc6');room.fog.color.copy(room.background);
 ceilingLight.intensity=p.ceiling;deskLight.intensity=p.desk;warm.intensity=p.lamp;lampShade.emissiveIntensity=p.shade;
 for(const color of ['#b7a289','#cabd9c','#f5c99c'])emissiveCache.get(color).color.set(color).multiplyScalar(p.fixtures);
 windowMesh.material.color.setScalar(time==='night'?.9:time==='day'?.15:.5);
 skylineTime.value.fromArray(p.backdrop);renderer.shadowMap.needsUpdate=true;return true;
}
function setQuality(quality,coarse=false){
 const size=Math.min(renderer.capabilities.maxTextureSize,quality==='low'?512:quality==='high'?2048:coarse?1024:2048);if(size===shadowSize)return false;
 shadowSize=size;moon.shadow.mapSize.set(size,size);moon.shadow.map?.dispose();moon.shadow.map=null;renderer.shadowMap.needsUpdate=true;return true;
}
setTime('dusk');
return {scene:room,update(){},setTime,setQuality,getSnapshot(){return {time:currentTime,lightingRevision,skylineReady,shadowSize};}};

}

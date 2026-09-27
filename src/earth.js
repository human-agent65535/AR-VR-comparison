import * as T from 'three';
import land from './earth-land.json';
import {RENDER_ASSUMPTIONS} from './device-data.js';
const APP=RENDER_ASSUMPTIONS.earthApp;

export const EARTH_PLACES={
  atlantic:{name:'Atlantic',lat:25,lon:-35,label:'大西洋 / 全球'},
  newyork:{name:'New York',lat:40.71,lon:-74.01,label:'纽约'},
  tokyo:{name:'Tokyo',lat:35.68,lon:139.69,label:'东京'},
};
const RAD=Math.PI/180;
export function globePoint(lat,lon,r=1){return new T.Vector3(Math.cos(lat*RAD)*Math.cos(lon*RAD),Math.sin(lat*RAD),-Math.cos(lat*RAD)*Math.sin(lon*RAD)).multiplyScalar(r);}
function canvasTexture(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);const tx=new T.CanvasTexture(canvas);tx.colorSpace=T.SRGBColorSpace;return tx;}

// Public-domain Natural Earth coastlines, with illustrative terrain and lighting.
// A real sphere and world-anchored interface, shared by the angular and WebXR views.
export function createEarth(onChange=()=>{}){
  const root=new T.Group(),world=new T.Group();root.add(world);world.position.fromArray(APP.center);
  const globe=new T.Group();world.add(globe);
  let place='newyork',zoom=APP.initialZoom,layout='compact',imagery='coastline fallback';
  const surface=canvasTexture(2048,1024,(c,w,h)=>{
    const ocean=c.createLinearGradient(0,0,0,h);ocean.addColorStop(0,'#203d5b');ocean.addColorStop(.4,'#0f4677');ocean.addColorStop(.7,'#16446c');ocean.addColorStop(1,'#52748b');c.fillStyle=ocean;c.fillRect(0,0,w,h);
    const path=new Path2D();
    for(const feature of land.features){const polys=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];for(const polygon of polys)for(const ring of polygon){ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*w,y=(90-lat)/180*h;i?path.lineTo(x,y):path.moveTo(x,y);});path.closePath();}}
    c.save();c.clip(path,'evenodd');
    const terrain=c.createLinearGradient(0,0,0,h);for(const [offset,color] of [[0,'#e6e9db'],[.12,'#bfcec5'],[.22,'#6c8770'],[.32,'#9a9b6a'],[.4,'#bfa67c'],[.5,'#587b63'],[.65,'#8c986a'],[.8,'#9eaa9b'],[.89,'#d0d5c9'],[1,'#edf0e9']])terrain.addColorStop(offset,color);c.fillStyle=terrain;c.fillRect(0,0,w,h);
    // Low-contrast relief is illustrative, not satellite or elevation data.
    let seed=83;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<17000;i++){const x=rnd()*w,y=rnd()*h;c.strokeStyle=i%3?'#233d2c19':'#eee2bc26';c.lineWidth=1+rnd()*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+3+rnd()*10,y+Math.sin(x*.03)*5);c.stroke();}c.restore();
    c.strokeStyle='#bccfc075';c.lineWidth=.85;c.stroke(path);
    c.strokeStyle='#bedad51e';c.lineWidth=.65;for(let lon=-180;lon<=180;lon+=15){const x=(lon+180)/360*w;c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let lat=-75;lat<=75;lat+=15){const y=(90-lat)/180*h;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  });
  surface.anisotropy=4;
  const surfaceMaterial=new T.MeshPhongMaterial({map:surface,shininess:8,specular:'#31445a'});
  globe.add(new T.Mesh(new T.SphereGeometry(APP.radius,96,64),surfaceMaterial));
  new T.TextureLoader().load('./earth-blue-marble.jpg',tx=>{tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=4;surfaceMaterial.map=tx;surfaceMaterial.needsUpdate=true;surface.dispose();imagery='NASA Earth Observatory / Blue Marble September 2004';drawHud();onChange();},undefined,()=>{});
  root.add(new T.AmbientLight('#dbe9ff',1.25));const sun=new T.DirectionalLight('#fff1d6',2.1);sun.position.set(-35,40,20);sun.target=world;root.add(sun);
  const atmosphere=new T.Mesh(new T.SphereGeometry(APP.radius+.4,64,48),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(.18,.43,.8,rim*.42);\n#include <premultiplied_alpha_fragment>\n}'}));world.add(atmosphere);
  root.add(new T.Mesh(new T.SphereGeometry(85,32,24),new T.MeshBasicMaterial({color:'#060d1b',side:T.BackSide})));
  const stars=[];let seed=29;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<1200;i++){const z=rnd()*2-1,a=rnd()*Math.PI*2,r=Math.sqrt(1-z*z);stars.push(80*r*Math.cos(a),80*z,80*r*Math.sin(a));}const starsGeo=new T.BufferGeometry();starsGeo.setAttribute('position',new T.Float32BufferAttribute(stars,3));root.add(new T.Points(starsGeo,new T.PointsMaterial({color:'#b3cde0',size:.065,sizeAttenuation:true})));
  for(const city of [{name:'NEW YORK',lat:40.71,lon:-74.01},{name:'LONDON',lat:51.51,lon:-.12},{name:'TOKYO',lat:35.68,lon:139.69},{name:'SINGAPORE',lat:1.35,lon:103.82},{name:'CAPE TOWN',lat:-33.92,lon:18.42},{name:'RIO',lat:-22.9,lon:-43.17}]){
    const pin=new T.Mesh(new T.SphereGeometry(.14,10,8),new T.MeshBasicMaterial({color:'#fff0b9'}));pin.position.copy(globePoint(city.lat,city.lon,APP.radius+.13));globe.add(pin);
    const tx=canvasTexture(256,64,(c,w,h)=>{c.fillStyle='#0b192bcc';c.beginPath();c.roundRect(1,1,w-2,h-2,12);c.fill();c.fillStyle='#f3f0dd';c.font='500 25px sans-serif';c.textAlign='center';c.fillText(city.name,w/2,41);});const label=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:true,depthWrite:false}));label.position.copy(globePoint(city.lat+2.5,city.lon,APP.radius+.35));label.scale.set(3.3,.825,1);globe.add(label);
  }
  const hudTexture=canvasTexture(1600,1000,()=>{});
  const hud=new T.Mesh(new T.PlaneGeometry(APP.hud.width,APP.hud.height),new T.MeshBasicMaterial({map:hudTexture,transparent:true,depthWrite:false,side:T.DoubleSide}));hud.position.set(0,0,-APP.hud.distance);root.add(hud);
  function drawHud(){const c=hudTexture.image.getContext('2d');c.clearRect(0,0,1600,1000);const card=(x,y,w,h)=>{c.fillStyle='#091525e6';c.strokeStyle='#7897a14d';c.lineWidth=1;c.beginPath();c.roundRect(x,y,w,h,18);c.fill();c.stroke();};
    card(470,92,660,70);c.fillStyle='#e5efea';c.font='500 25px sans-serif';c.fillText('◉  EARTH',498,136);c.font='15px sans-serif';c.fillStyle='#91a9b5';c.fillText('ORBITAL EXPLORER   /   3D',710,135);
    card(110,280,238,404);c.fillStyle='#99b7bd';c.font='14px sans-serif';c.fillText('YOUR PLACES',136,317);for(const [i,p] of Object.values(EARTH_PLACES).entries()){const y=363+i*87;c.fillStyle=p.name===EARTH_PLACES[place].name?'#223e4b':'#142536';c.beginPath();c.roundRect(126,y-25,206,69,10);c.fill();c.fillStyle='#e0e9e4';c.font='21px sans-serif';c.fillText(p.name,141,y+3);c.fillStyle='#93aaa9';c.font='12px monospace';c.fillText(`${Math.abs(p.lat).toFixed(1)}° N  ${Math.abs(p.lon).toFixed(1)}° ${p.lon<0?'W':'E'}`,141,y+25);}c.fillStyle='#94b4aa';c.font='13px sans-serif';c.fillText('COASTLINE  •  TERRAIN',134,651);
    card(1250,298,224,190);c.fillStyle='#e4e8dc';c.font='19px sans-serif';c.fillText('PLANET EARTH',1272,334);c.fillStyle='#91a9b5';c.font='14px sans-serif';c.fillText('12,742 km  /  diameter',1272,371);c.fillText('71% ocean',1272,403);c.fillText('23.4° axial tilt',1272,435);
    card(1274,529,70,126);c.fillStyle='#d7e6df';c.font='32px sans-serif';c.fillText('+',1297,573);c.fillText('−',1297,628);c.strokeStyle='#4a626c';c.beginPath();c.moveTo(1287,590);c.lineTo(1330,590);c.stroke();
    card(505,792,590,72);c.fillStyle='#e2eae2';c.font='21px sans-serif';c.fillText(EARTH_PLACES[place].name+'  /  ORBIT VIEW',534,824);c.fillStyle='#88a29d';c.font='12px monospace';c.fillText('NASA EARTH OBSERVATORY  /  BLUE MARBLE',534,848);
    c.strokeStyle='#b8d1c45a';c.lineWidth=1;for(let x=410;x<=1190;x+=65){c.beginPath();c.moveTo(x,743);c.lineTo(x,750+(x%130===20?7:0));c.stroke();}c.fillStyle='#b5cfc1';c.font='12px monospace';c.fillText('ORBIT VIEW',1028,772);c.beginPath();c.moveTo(1015,777);c.lineTo(1090,777);c.stroke();hudTexture.needsUpdate=true;
  }
  function setView(next=place,magnification=zoom,nextLayout=layout){place=EARTH_PLACES[next]?next:'atlantic';zoom=Math.max(.5,Math.min(1.3,magnification));layout=nextLayout==='wide'?'wide':'compact';hud.scale.setScalar(layout==='wide'?APP.hud.wideScale:1);globe.quaternion.setFromUnitVectors(globePoint(EARTH_PLACES[place].lat,EARTH_PLACES[place].lon),new T.Vector3(0,0,1));world.scale.setScalar(zoom);drawHud();}
  setView();
  return {root,setView,getSnapshot:()=>({place,zoom,worldAnchored:true,radius:APP.radius,center:APP.center,hud:{layout,width:APP.hud.width*hud.scale.x,height:APP.hud.height*hud.scale.y,distance:APP.hud.distance},imagery,coastline:'Natural Earth 1:110m',relief:'NASA shaded topography; fallback illustrative',app:'local Earth explorer, not Google Earth'})};
}

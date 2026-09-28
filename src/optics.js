import {DEVICES,deviceFov,RENDER_ASSUMPTIONS} from './device-data.js';
import {rad,tanHalf} from './fov-math.js';
// Shared angular model. Pixel sizes derive from degrees, never viewport percentages.
export {rad,tanHalf};
export const CALIBRATION_POINTS = [
  {id:'C',h:0,v:0,color:'#d8ede5'},
  {id:'A',h:0,v:26,color:'#edc881'},
  {id:'B',h:33,v:0,color:'#80cce5'},
];
export function auraFov(assumption='diagonal',ratio) {
  const aura=DEVICES.find(d=>d.id==='aura');
  return deviceFov(ratio?{...aura,shape:{...aura.shape,ratio}}:aura,assumption);
}
// Device display FOV is independent of physical geometry, eye position and fit.
export function getProfile(device,assumption='diagonal',fit={},eye='right') {
  const nominal=deviceFov(device,assumption);
  return {...nominal,device,nominal,gap:Number(fit.gap)||0,height:Number(fit.height)||0,display:[nominal.h/2,nominal.v/2]};
}
export function humanField(eye='right') {
  const f=RENDER_ASSUMPTIONS.humanField;
  return {left:eye==='right'?f.nasal:f.temporal,right:eye==='right'?f.temporal:f.nasal,up:f.up,down:f.down};
}
export function projection(width,height,eye='right') {
  const human=humanField(eye),field=RENDER_ASSUMPTIONS.observerCameraFov;
  const scale=Math.min(width/field.h,height/field.v);
  const center=[(human.right-human.left)/2,(human.up-human.down)/2];
  return {scale,focal:scale,center,span:[width/(2*scale),height/(2*scale)],
    origin:[width/2-center[0]*scale,height/2+center[1]*scale],human,field};
}
// Equidistant spherical projection preserves the central 30-degree circular test target.
export function angularToRay(x,y) {
  const a=Math.hypot(x,y)*rad, k=a<1e-9?rad:Math.sin(a)/Math.hypot(x,y);
  return [x*k,y*k,-Math.cos(a)];
}
export function rayToAngular(x,y,z) {
  const length=Math.hypot(x,y,z),r=Math.hypot(x,y),angle=Math.acos(Math.max(-1,Math.min(1,-z/length)))/rad;
  return r<1e-9?[0,0]:[x/r*angle,y/r*angle];
}
export function inDisplayRay(ray,profile) {
  const [x,y,z]=ray,b=profile.frustum||[-profile.tangent[0],profile.tangent[0],-profile.tangent[1],profile.tangent[1]];return z<0&&x/-z>=b[0]-1e-10&&x/-z<=b[1]+1e-10&&y/-z>=b[2]-1e-10&&y/-z<=b[3]+1e-10;
}
export function projectedBounds(profile,width,height,eye='right') {
  const p=projection(width,height,eye);
  const b=profile.frustum||[-profile.tangent[0],profile.tangent[0],-profile.tangent[1],profile.tangent[1]];
  return {x:p.origin[0]+p.scale*Math.atan(b[0])/rad,y:p.origin[1]-p.scale*Math.atan(b[3])/rad,width:p.scale*profile.h,height:p.scale*profile.v,scale:p.scale};
}
export function displayContour(profile,steps=32) {
  const [tx,ty]=profile.tangent,points=[],b=profile.frustum||[-tx,tx,-ty,ty];
  for(let edge=0;edge<4;edge++) for(let i=0;i<=steps;i++) {
    const t=i/steps,mix=(a,c)=>a+(c-a)*t;
    const [x,y]=edge===0?[mix(b[0],b[1]),b[3]]:edge===1?[b[1],mix(b[3],b[2])]:edge===2?[mix(b[1],b[0]),b[2]]:[b[0],mix(b[2],b[3])];
    points.push(rayToAngular(x,y,-1));
  }
  return points;
}
export function humanVisibility(x,y,eye='right') {
  const f=humanField(eye),r=Math.hypot(x/(x<0?f.left:f.right),y/(y>0?f.up:f.down));
  const [start,end]=RENDER_ASSUMPTIONS.humanField.edge;
  const t=Math.min(1,Math.max(0,(r-start)/(end-start)));return 1-t*t*(3-2*t);
}

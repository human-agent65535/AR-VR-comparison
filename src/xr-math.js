import {profileFromAngles} from './fov-math.js';
import {deviceFov,RENDER_ASSUMPTIONS} from './device-data.js';
import {Euler,Quaternion,Vector3} from 'three';

const radians=Math.PI/180;
// A host framing choice, not a measured eye axis for either simulated device.
// Use one pitch for both eyes to avoid introducing vertical stereo disparity.
export function headsetAlignment(profiles,mode='balanced'){
 if(mode==='forward'||!profiles.length)return 0;
 const down=Math.max(...profiles.map(p=>p.angles.down)),up=Math.min(...profiles.map(p=>p.angles.up));
 return down<up?(down+up)/2/radians:0;
}
export function pitchRay([x,y,z],pitchDegrees=0){
 const c=Math.cos(pitchDegrees*radians),s=Math.sin(pitchDegrees*radians);
 return [x,c*y-s*z,s*y+c*z];
}
// Inverse of pitchRay: native eye ray -> the unchanged target angular field.
// Shared by the display, frame, guides and prescription correction mask.
export const viewAlignmentGLSL=`uniform vec2 alignmentRotation;
 vec3 alignedEyeRay(vec3 ray){return vec3(ray.x,alignmentRotation.x*ray.y+alignmentRotation.y*ray.z,-alignmentRotation.y*ray.y+alignmentRotation.x*ray.z);}`;

// Include head pitch when centering content, but keep the app upright.
export function centeredContentOrientation(headQuaternion,pitchDegrees=0){
 const aligned=headQuaternion.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),pitchDegrees*radians));
 const e=new Euler().setFromQuaternion(aligned,'YXZ');e.z=0;
 return new Quaternion().setFromEuler(e);
}

export const XR_PROFILES=['quest3','meta','aura'];
export function xrTarget(id,assumption='diagonal'){
  if(id==='quest3')return null; // Native baseline must never be clamped to the advertised 110×96.
  if(id==='meta'||id==='aura')return deviceFov(id,assumption);
  throw new RangeError('Unknown XR target');
}
// Column-major WebXR projection matrix; preserve asymmetric left/right/up/down.
export function projectionProfile(matrix){
  const m=matrix.elements||matrix;
  if(m.length!==16||!Number.isFinite(m[0])||!Number.isFinite(m[5])||m[0]<=0||m[5]<=0||m[11]!==-1)throw new RangeError('Invalid perspective projection');
  return profileFromAngles({left:Math.atan((m[8]-1)/m[0]),right:Math.atan((m[8]+1)/m[0]),down:Math.atan((m[9]-1)/m[5]),up:Math.atan((m[9]+1)/m[5])});
}
export function profileFits(target,runtime,pitchDegrees=0){return targetViewport(target,runtime,pitchDegrees).fits;}

// Normalized render-texture bounds, not angular ratios or a measurement of the
// lens-visible field. Preserve asymmetric frusta and expose clipping instead of
// fitting the target to the host. The compositor may hide more after rendering.
export function targetViewport(target,runtime,pitchDegrees=0){
 if(!target)return {bounds:[0,1,0,1],width:1,height:1,fits:true};
 const f=target.frustum,r=runtime.frustum,corners=[];
 for(const x of [f[0],f[1]])for(const y of [f[2],f[3]])corners.push(pitchRay([x,y,-1],pitchDegrees));
 const xs=corners.map(p=>p[0]/-p[2]),ys=corners.map(p=>p[1]/-p[2]);
 const t=[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)];
 const bounds=[(t[0]-r[0])/(r[1]-r[0]),(t[1]-r[0])/(r[1]-r[0]),(t[2]-r[2])/(r[3]-r[2]),(t[3]-r[2])/(r[3]-r[2])];
 return {bounds,width:bounds[1]-bounds[0],height:bounds[3]-bounds[2],fits:corners.every(p=>p[2]<0)&&bounds.every(n=>n>=0&&n<=1)};
}

// Fixed broad desktop reference, independent of the selected target device.
// Native XRView projection matrices never use this preview camera setting.
export function previewVerticalFov(aspect){
 const a=Math.max(.2,Number(aspect)||1),f=RENDER_ASSUMPTIONS.headsetBrowserPreview;
 return 2*Math.atan(Math.max(Math.tan(f.minV*Math.PI/360),Math.tan(f.minH*Math.PI/360)/a))*180/Math.PI;
}
export function usesPassthrough({style,content}){
 return content!=='earth'&&(style==='passthrough'||style==='auto');
}

import * as T from 'three';
import {xrTarget,viewAlignmentGLSL} from './xr-math.js';
import {wearGLSL} from './wear-shapes.js';

export const XR_VISION_MODES=['off','uncorrected','inserts'];
export const XR_VISION_LABELS={off:'清晰基准',uncorrected:'400 度 · 未矫正',inserts:'400 度 · 戴矫正片'};
// Same 4 mm pupil / 2 m assumed virtual focus as the screen demonstration,
// without its presentation-strength multiplier. A fixed qualitative example,
// not a personal prescription or a depth-dependent model of the real room.
export const XR_MYOPIA={diopters:4,pupilMm:4,focusM:2,radiusRadians:(4-1/2)*.004/2};
export function visionBlurEnabled(mode,profile){return mode==='uncorrected'||mode==='inserts'&&profile!=='quest3';}

export function createXRVision(renderer){
 const targets=[],cameras=[],post=new T.Scene();let mode='off',profile='quest3';
 const u={image:{value:null},inverseProjection:{value:new T.Matrix4()},alignmentRotation:{value:new T.Vector2(1,0)},bounds:{value:new T.Vector4()},blurRadius:{value:new T.Vector2()},texel:{value:new T.Vector2()},device:{value:0},corrected:{value:0},eyeSide:{value:1}};
 const material=new T.ShaderMaterial({uniforms:u,depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`varying vec2 uvScreen;uniform sampler2D image;uniform mat4 inverseProjection;uniform vec4 bounds;uniform vec2 blurRadius,texel;uniform float device,corrected,eyeSide;
   ${wearGLSL}
   ${viewAlignmentGLSL}
   void main(){vec4 p=inverseProjection*vec4(uvScreen*2.-1.,1.,1.);vec3 ray=alignedEyeRay(normalize(p.xyz));vec2 a=ray.xy/max(-ray.z,.0001);
    float sharp=0.;if(corrected>.5){
     if(device<.5)sharp=1.;
     else if(device<1.5){float d=max(max(bounds.x-a.x,a.x-bounds.y),max(bounds.z-a.y,a.y-bounds.w));sharp=1.-step(0.,d);}
     else{float r=length(ray.xy);vec2 q=ray.xy/max(r,.00001)*acos(clamp(-ray.z,-1.,1.))*57.2957795*vec2(eyeSide,1.);sharp=wearMask(auraPrescriptionDistance(q));}
    }
    vec4 original=texture2D(image,uvScreen),blurred=vec4(0.);
    if(sharp<.999){for(int i=0;i<12;i++){float k=float(i)+.5,angle=k*2.39996323,r=sqrt(k/12.);vec2 offset=vec2(cos(angle),sin(angle))*r*blurRadius;blurred+=texture2D(image,clamp(uvScreen+offset,texel*.5,1.-texel*.5));}blurred/=12.;}
    gl_FragColor=mix(blurred,original,sharp);
   }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(2,2),material);mesh.frustumCulled=false;post.add(mesh);
 mesh.onBeforeRender=(_r,_s,eye)=>{
  const i=renderer.xr.isPresenting&&eye===renderer.xr.getCamera().cameras[1]?1:0,target=targets[i];
  u.image.value=target.texture;u.inverseProjection.value.copy(eye.projectionMatrix).invert();u.eyeSide.value=renderer.xr.isPresenting&&i===0?-1:1;
  u.texel.value.set(1/target.width,1/target.height);
  u.blurRadius.value.set(Math.abs(eye.projectionMatrix.elements[0]),Math.abs(eye.projectionMatrix.elements[5])).multiplyScalar(Math.tan(XR_MYOPIA.radiusRadians)*.5);
 };
 const size=new T.Vector2();
 function disposeTargets(){for(const target of targets)target.dispose();targets.length=0;}
 renderer.xr.addEventListener('sessionend',disposeTargets);
 return {
  setAlignment(pitch){u.alignmentRotation.value.set(Math.cos(pitch*Math.PI/180),Math.sin(pitch*Math.PI/180));},
  update(state){mode=XR_VISION_MODES.includes(state.vision)?state.vision:'off';profile=state.profile;u.device.value={quest3:0,meta:1,aura:2}[profile];u.corrected.value=mode==='inserts'?1:0;const target=xrTarget(profile);if(target)u.bounds.value.fromArray(target.frustum);},
  render(camera,drawWorld){
   if(!visionBlurEnabled(mode,profile)){drawWorld(camera);return;}
   const xrEnabled=renderer.xr.enabled,hostTarget=renderer.getRenderTarget(),immersive=renderer.xr.isPresenting;
   const eyes=immersive?renderer.xr.getCamera().cameras:[camera];renderer.getDrawingBufferSize(size);
   // Keep every native eye matrix and world pose. Separate textures prevent a
   // blur kernel from sampling the other eye or changing the visible FOV.
   renderer.xr.enabled=false;
   try{for(let i=0;i<eyes.length;i++){
    const eye=eyes[i],w=immersive?eye.viewport.z:size.x,h=immersive?eye.viewport.w:size.y;
    if(!targets[i]){
     targets[i]=new T.WebGLRenderTarget(w,h,{stencilBuffer:true,depthBuffer:true});
     // Capture the same display-referred ACES/sRGB pass as the native XR
     // framebuffer. A normal linear intermediate changes AURA's tint/blending.
     // RGBA8 stores those encoded pixels without an extra sRGB conversion;
     // the final blur writes them directly, with no second tone-map/gamma pass.
     targets[i].isXRRenderTarget=true;targets[i].texture.colorSpace=T.SRGBColorSpace;targets[i].texture.internalFormat='RGBA8';
    }
    else if(targets[i].width!==w||targets[i].height!==h)targets[i].setSize(w,h);
    const view=cameras[i]||(cameras[i]=new T.PerspectiveCamera());view.matrixAutoUpdate=view.matrixWorldAutoUpdate=false;
    view.matrixWorld.copy(eye.matrixWorld);view.matrixWorldInverse.copy(eye.matrixWorldInverse);view.projectionMatrix.copy(eye.projectionMatrix);view.projectionMatrixInverse.copy(eye.projectionMatrixInverse);view.near=eye.near;view.far=eye.far;view.layers.mask=eye.layers.mask;view.userData.xrEyeSide=immersive&&i===0?-1:1;
    renderer.setRenderTarget(targets[i]);drawWorld(view);
   }}finally{renderer.xr.enabled=xrEnabled;renderer.setRenderTarget(hostTarget);}
   renderer.clear();renderer.render(post,camera);
  },
  snapshot:()=>({mode,diopters:mode==='off'?0:-4,qualitative:true,blurRadiusDegrees:XR_MYOPIA.radiusRadians*180/Math.PI,separateEyeTextures:true,renderSizes:targets.map(t=>[t.width,t.height])}),
 };
}

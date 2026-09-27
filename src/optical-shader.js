import {RENDER_ASSUMPTIONS} from './device-data.js';
import {wearGLSL} from './wear-shapes.js';
export const opticalFragment = `
varying vec2 vUv;
uniform samplerCube roomTex, contentTex, depthTex;
uniform vec2 angularSpan, angularCenter, observerField;
uniform vec4 viewQuaternion, humanBounds, displayFrustum;
uniform float device, pass, transmission, guides, eyeFilter, rxMode, rxSphere, rxCylinder, rxAxis, rxStrength, showVirtual, lensTint, virtualFocus, wearEdges, eyeSide;
uniform float metaCloth,metaVeil;uniform vec3 metaLightColor;
const float RAD = 0.017453292519943295;
${wearGLSL}
// Match native XR: tint the mapped room, then use a bounded screen blend for
// independently mapped display light. Do not tone-map the combined AR layers.
// These are qualitative screen brightness ratios, not measured optical radiance.
vec3 screenColor(vec3 light){
  #if defined(TONE_MAPPING)
  light=toneMapping(light);
  #endif
  return linearToOutputTexel(vec4(light,1.)).rgb;
}
vec3 screenFrame(vec3 view,vec3 black,vec3 white,float enabled){
  float opacity=clamp(1.-(white.r-black.r),0.,1.);
  return mix(view,screenColor(black/max(opacity,.0001)),opacity*enabled);
}
vec3 rayFor(vec2 p) { float lengthP=length(p), a=lengthP*RAD; return vec3(p/max(lengthP,.0001)*sin(a),-cos(a)); }
vec3 worldRay(vec3 v) { return v+2.*cross(viewQuaternion.xyz,cross(viewQuaternion.xyz,v)+viewQuaternion.w*v); }
vec3 realAt(vec2 p) { return textureCube(roomTex,worldRay(rayFor(p))).rgb; }
vec2 defocus(float distance) {
  float demand=1./max(.1,distance);
  return max(vec2(0.),vec2(rxSphere,rxSphere+rxCylinder)-demand)*${RENDER_ASSUMPTIONS.prescription.pupilMm/2000/(Math.PI/180)}*rxStrength;
}
void blurredScene(vec2 p,vec2 roomBlur,vec2 displayBlur,out vec3 real,out vec4 overlay) {
  real=vec3(0.);overlay=vec4(0.);
  float axis=rxAxis*RAD;mat2 rotation=mat2(cos(axis),sin(axis),-sin(axis),cos(axis));
  // A deterministic elliptical pupil sample makes cylinder/axis directional, rather than a CSS blur.
  for(int i=0;i<16;i++) {
    float t=float(i)+.5,a=t*2.39996323,r=sqrt(t/16.);
    vec2 disc=vec2(cos(a),sin(a))*r;
    real+=realAt(p+rotation*(disc*roomBlur));
    overlay+=textureCube(contentTex,worldRay(rayFor(p+rotation*(disc*displayBlur))));
  }
  real/=16.;overlay/=16.;
}
void main() {
  vec2 p=(vUv-.5)*2.*angularSpan+angularCenter;
  vec3 ray=rayFor(p),world=worldRay(ray);
  float humanRadius=length(p/vec2(p.x<0.?humanBounds.x:humanBounds.y,p.y>0.?humanBounds.z:humanBounds.w));
  vec3 real=textureCube(roomTex,world).rgb;
  vec4 overlay=textureCube(contentTex,world);
  float displayD=max(max(displayFrustum.x-ray.x/max(-ray.z,.0001),ray.x/max(-ray.z,.0001)-displayFrustum.y),max(displayFrustum.z-ray.y/max(-ray.z,.0001),ray.y/max(-ray.z,.0001)-displayFrustum.w));
  // Clip by the device angular frustum, never by a guessed physical entrance.
  float displayWidth=min(fwidth(displayD),.025);
  float displayMask=ray.z<0.?(1.-smoothstep(-displayWidth,displayWidth,displayD)):0.;
  // Perceptual masks are explicit angular assumptions, independent of the product model.
  vec2 wearPoint=vec2(p.x*eyeSide,p.y);
  float rxMask=(device<1.5||device>2.5)?displayMask:wearMask(auraPrescriptionDistance(wearPoint));
  float corrected=rxMode>1.5&&device>.5?rxMask:0.;
  if(rxMode>.5&&corrected<.999&&(rxSphere+rxCylinder)>.01){
    vec3 blurredReal;vec4 blurredOverlay;
    blurredScene(p,defocus(textureCube(depthTex,world).r),defocus(virtualFocus),blurredReal,blurredOverlay);
    real=mix(blurredReal,real,corrected);overlay=mix(blurredOverlay,overlay,corrected);
  }
  overlay*=showVirtual;
  vec3 col=real;
  if(device>.5){
    if(device<1.5){
      col=mix(real,metaWear(wearPoint,real,metaCloth,metaLightColor),wearEdges);
      vec3 cameraView=pass>.5?real:vec3(0.);
      col=mix(col,overlay.rgb+cameraView*(1.-overlay.a),displayMask);
    }else if(device>2.5){
      // Quest 3 has a sealed facial interface. Its public H/V is a comparison
      // reference only; native WebXR uses the headset's per-eye projection.
      vec3 cameraView=pass>.5?real:vec3(0.);
      vec3 surround=wearEdges>.5?vec3(.005,.006,.007):real;
      col=mix(surround,overlay.rgb+cameraView*(1.-overlay.a),displayMask);
    }else{
      float tintMask=wearMask(auraLensDistance(wearPoint))*lensTint;
      col=screenColor(real)*mix(1.,transmission,tintMask);
      // Cube capture stores premultiplied alpha. Keep emitted light independent
      // of tint; a black app pixel emits nothing and still reveals the dim room.
      vec3 emitted=clamp(screenColor(overlay.rgb/max(overlay.a,.0001)),0.,1.)*overlay.a*displayMask;
      col=emitted+col*(1.-emitted);
      col=screenFrame(col,auraWear(wearPoint,vec3(0.)),auraWear(wearPoint,vec3(1.)),wearEdges);
      if(rxMode>1.5)col=screenFrame(col,auraPrescriptionWear(wearPoint,vec3(0.)),auraPrescriptionWear(wearPoint,vec3(1.)),wearEdges);
    }
    if(guides>.5&&ray.z<0.){float edge=(1.-smoothstep(displayWidth*.45,displayWidth*1.6,abs(displayD)));col+=edge*(device<1.5?vec3(.12,.42,.7):device>2.5?vec3(.24,.50,.16):vec3(.62,.37,.10));}
    if(rxMode>1.5&&guides>.5){float edge=(abs(dFdx(rxMask))+abs(dFdy(rxMask)))*1.8;col+=edge*vec3(.27,.10,.36);}
  }
  float humanMask=1.-smoothstep(${RENDER_ASSUMPTIONS.humanField.edge.join(',')},humanRadius);
  float finite=1.-smoothstep(165.,179.,length(p));
  col=mix(vec3(.001,.0015,.002),col,mix(finite,humanMask,eyeFilter));
  float observerMask=step(abs(p.x-angularCenter.x),observerField.x*.5)*step(abs(p.y-angularCenter.y),observerField.y*.5);
  gl_FragColor=vec4(col*observerMask,1.);
  if(device<1.5||device>2.5){
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
  if(device>.5&&device<1.5)gl_FragColor.rgb=mix(gl_FragColor.rgb,metaLightColor,metaVeil*displayMask*observerMask*mix(finite,humanMask,eyeFilter));
}`;

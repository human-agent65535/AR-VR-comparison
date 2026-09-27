import {RENDER_ASSUMPTIONS} from './device-data.js';
// Independent near-eye silhouettes in angular coordinates, not product CAD or an eye-box model.
const w=RENDER_ASSUMPTIONS.wearing;
// A continuous curved silhouette: unlike a rounded box clipped by a plane,
// this has no long straight lower/temporal cut and no added corner at the seam.
export function ovalDistance(point,{center,half,power,shear=0}) {
 const x=point[0]-center[0],y=point[1]-center[1]+x*shear;
 return (Math.pow(Math.pow(Math.abs(x)/half[0],power)+Math.pow(Math.abs(y)/half[1],power),1/power)-1)*Math.min(...half);
}
export function roundedDistance(point,{center,half,radius}) {
 const q=point.map((v,i)=>Math.abs(v-center[i])-half[i]+radius);
 return Math.hypot(Math.max(q[0],0),Math.max(q[1],0))+Math.min(Math.max(...q),0)-radius;
}
// The near-eye AURA prism is a rigid front-facing body. Per-axis angles keep
// straight edges straight in native perspective instead of inflating a ring.
export function frontAngles(point) {
 const length=Math.hypot(...point),r=length*Math.PI/180;
 if(length<1e-8)return [0,0];
 return point.map(v=>Math.atan2(v/length*Math.sin(r),Math.cos(r))*180/Math.PI);
}
export function chamferDistance(point,{center,half,chamfer}) {
 const q=point.map((v,i)=>Math.abs(v-center[i])-half[i]);
 return Math.max(q[0],q[1],(q[0]+q[1]+chamfer)*Math.SQRT1_2);
}
export function prismDistance(point,d){
 return roundedDistance(point,{...d,radius:point[1]>=d.center[1]?d.topRadius:d.bottomRadius});
}
export function capsuleDistance(p,{a,b,radius}) {
 const ab=b.map((v,i)=>v-a[i]),ap=p.map((v,i)=>v-a[i]);
 const t=Math.max(0,Math.min(1,(ap[0]*ab[0]+ap[1]*ab[1])/(ab[0]**2+ab[1]**2)));
 return Math.hypot(...ap.map((v,i)=>v-ab[i]*t))-radius;
}
function padLocal(p,d){
 const x=p[0]-d.center[0],y=p[1]-d.center[1],angle=d.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 return [(c*x+s*y)/d.half[0],(-s*x+c*y)/d.half[1]];
}
export function wearingDistances(point,device,eye='right') {
 const p=[point[0]*(eye==='left'?-1:1),point[1]],d=w[device];
 if(device==='meta'){const shell=ovalDistance(p,d.shell),aperture=Math.max(...frontAngles(p).map((v,i)=>Math.abs(v)-d.display.half[i]));return {shell,aperture,frame:Math.min(Math.max(shell,-aperture),capsuleDistance(p,d.temple))};}
 const front=frontAngles(p),lens=ovalDistance(p,d.lens),optical=prismDistance(front,d.optical),opticalHousing=prismDistance(front,d.opticalHousing);
 const pad=d.nosePad,nosePad=(Math.hypot(...padLocal(p,pad))-1)*Math.min(...pad.half);
 const noseSupport=Math.min(capsuleDistance(p,pad.arm),Math.hypot(...p.map((v,i)=>v-pad.pivot.center[i]))-pad.pivot.radius);
 const lower=Math.max(0,Math.min(1,(-p[1]-20)/30)),rimWidth=d.rimWidth+(d.lowerRimWidth-d.rimWidth)*lower*lower*(3-2*lower);
 const outerFrame=Math.min(Math.abs(lens)-rimWidth/2,chamferDistance(front,d.brow),chamferDistance(front,d.upperOcclusion),capsuleDistance(p,d.temple),nosePad,noseSupport);
 const nasalMount=chamferDistance(front,d.nasalMount),opticalFrame=Math.min(Math.max(opticalHousing,-optical),nasalMount),rx=d.prescription;
 const prescription=roundedDistance(p,rx.lens);
 const prescriptionFrame=Math.min(Math.abs(prescription)-rx.rimWidth/2,capsuleDistance(p,rx.hanger));
 return {lens,optical,opticalHousing,nasalMount,nosePad,noseSupport,outerFrame,opticalFrame,frame:Math.min(outerFrame,opticalFrame),prescription,prescriptionFrame};
}
const f=n=>Number(n).toFixed(4),v=a=>`vec2(${a.map(f).join(',')})`;
const chamfer=d=>`wearChamfer(auraFrontPoint(q)-${v(d.center)},${v(d.half)},${f(d.chamfer)})`;
const prism=d=>`wearPrism(auraFrontPoint(q)-${v(d.center)},${v(d.half)},${f(d.topRadius)},${f(d.bottomRadius)})`;
const capsule=d=>`wearCapsule(q,${v(d.a)},${v(d.b)},${f(d.radius)})`;
const oval=d=>`wearOval(q-${v(d.center)},${v(d.half)},${f(d.power)},${f(d.shear||0)})`;
const pad=w.aura.nosePad,padAngle=pad.rotation*Math.PI/180;
export const wearGLSL=`
float wearOval(vec2 p,vec2 halfSize,float power,float shear){p.y+=p.x*shear;vec2 n=abs(p)/halfSize;return (pow(pow(n.x,power)+pow(n.y,power),1./power)-1.)*min(halfSize.x,halfSize.y);}
float wearBox(vec2 p,vec2 halfSize,float r){vec2 q=abs(p)-halfSize+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float wearPrism(vec2 p,vec2 halfSize,float topR,float bottomR){return wearBox(p,halfSize,p.y>=0.?topR:bottomR);}
float wearCapsule(vec2 p,vec2 a,vec2 b,float r){vec2 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.))-r;}
float wearMask(float d){float aa=max(fwidth(d),${f(w.edgeSoftness)});return 1.-smoothstep(-aa,aa,d);}
float auraMask(float d){float aa=max(fwidth(d),.2);return 1.-smoothstep(-aa,aa,d);}
vec2 auraFrontPoint(vec2 q){float lengthQ=length(q),r=lengthQ*.017453292519943295;return atan(q/max(lengthQ,.00001)*sin(r),vec2(cos(r)))*57.29577951308232;}
float wearChamfer(vec2 p,vec2 halfSize,float c){vec2 q=abs(p)-halfSize;return max(max(q.x,q.y),(q.x+q.y+c)*.7071067811865476);}
vec3 metaWear(vec2 q,vec3 reality,float light,vec3 lightColor){
 float shell=${oval(w.meta.shell)},arm=${capsule(w.meta.temple)};
 float body=wearMask(min(shell,arm));
 // Open sides admit room light to the eye-facing fabric. This is a lit
 // charcoal surface, not a sealed black light-blocker. Keep the panel veil
 // separate so making cloth visible cannot wash out the virtual content.
 float bevel=exp(-abs(shell+1.2)*.6)*(.006+.014*light);
 float weaveAA=1.-smoothstep(.25,.6,max(fwidth(q.x),fwidth(q.y)));
 float fibre=sin(q.x*9.)*sin(q.y*11.)*.002*light*weaveAA;
 float facing=.72+.28*smoothstep(-55.,55.,q.y);
 // Charcoal retains a neutral material color under warm apartment lighting;
 // only a small part of the environment tint reaches the apparent fabric.
 vec3 clothLight=mix(vec3(1.),lightColor,.10);
 vec3 cloth=vec3(.006,.007,.008)+clothLight*(.065*light*facing+bevel)+fibre;
 vec3 col=mix(reality,cloth,body);
 return col;
}
vec3 metaWear(vec2 q,vec3 reality){return metaWear(q,reality,.68,vec3(1.,.88,.74));}
float auraLensDistance(vec2 q){return ${oval(w.aura.lens)};}
vec2 auraPadPoint(vec2 q){
 vec2 p=q-${v(pad.center)};
 return vec2(${f(Math.cos(padAngle))}*p.x+${f(Math.sin(padAngle))}*p.y,-${f(Math.sin(padAngle))}*p.x+${f(Math.cos(padAngle))}*p.y)/${v(pad.half)};
}
float auraNosePad(vec2 q){return (length(auraPadPoint(q))-1.)*${f(Math.min(...pad.half))};}
float auraNoseSupport(vec2 q){return min(${capsule(pad.arm)},length(q-${v(pad.pivot.center)})-${f(pad.pivot.radius)});}
float auraFrameDistance(vec2 q){
 float rimWidth=mix(${f(w.aura.rimWidth)},${f(w.aura.lowerRimWidth)},smoothstep(20.,50.,-q.y));
 return min(min(min(abs(auraLensDistance(q))-rimWidth*.5,${chamfer(w.aura.brow)}),${chamfer(w.aura.upperOcclusion)}),min(${capsule(w.aura.temple)},min(auraNosePad(q),auraNoseSupport(q))));
}
float auraOpticalOpening(vec2 q){return ${prism(w.aura.optical)};}
float auraOpticalHousing(vec2 q){return ${prism(w.aura.opticalHousing)};}
float auraNasalMount(vec2 q){return ${chamfer(w.aura.nasalMount)};}
float auraPrescriptionDistance(vec2 q){return wearBox(q-${v(w.aura.prescription.lens.center)},${v(w.aura.prescription.lens.half)},${f(w.aura.prescription.lens.radius)});}
float auraPrescriptionFrame(vec2 q){
 return min(abs(auraPrescriptionDistance(q))-${f(w.aura.prescription.rimWidth/2)},${capsule(w.aura.prescription.hanger)});
}
vec3 auraWear(vec2 q,vec3 reality){
 float frame=auraFrameDistance(q),glass=auraLensDistance(q),opening=auraOpticalOpening(q),housing=auraOpticalHousing(q);
 float edge=1.-smoothstep(.12,.4,abs(glass-.6));
 vec3 plastic=vec3(.009,.011,.013)+edge*.015;
 vec2 front=auraFrontPoint(q);
 // A broad hard upper face above the glass, not a soft oval eye-cup.
 float browFace=auraMask(min(${chamfer(w.aura.upperOcclusion)},${chamfer(w.aura.brow)}));
 // The upper housing is in front of the outer sunglasses. Replace its
 // surface shading, including any outer-lens highlight hidden behind it.
 vec3 upperPlastic=vec3(.015,.018,.021)+.010*exp(-abs(front.y-${f(w.aura.optical.half[1]+2.)})*.6);
 plastic=mix(plastic,upperPlastic,browFace);
 vec3 col=mix(reality,plastic,auraMask(frame));
 // Faceted hard shell: broad upper block, side walls and a defined lower ledge.
 // No continuous soft bevel or rubber-eye-cup highlight around the opening.
 float inner=auraMask(min(max(housing,-opening),auraNasalMount(q)));
 float upper=step(${f(w.aura.optical.center[1]+w.aura.optical.half[1])},front.y);
 float lower=step(front.y,${f(w.aura.optical.center[1]-w.aura.optical.half[1])});
 float side=step(${f(w.aura.optical.half[0])},abs(front.x-(${f(w.aura.optical.center[0])})));
 vec3 body=mix(vec3(.010,.012,.014),vec3(.018,.021,.023),side);
 body=mix(body,vec3(.007,.009,.011),upper);
 body=mix(body,vec3(.022,.025,.028),lower);
 float lip=1.-smoothstep(.12,.5,abs(opening-.45));
 body+=lip*.014;
 col=mix(col,body,inner);
 // The upper shell occludes the inner rim's top. Painting the rim over it
 // created a separate curved black block inside one continuous housing.
 col=mix(col,upperPlastic,browFace);
 // The nose pad is closest to the eye. Its upper end must remain in front
 // of the nasal wall, with a short pivot behind it rather than a hanging stem.
 float support=auraNoseSupport(q),pivot=length(q-${v(pad.pivot.center)});
 vec3 mount=vec3(.023,.026,.030)+.012*exp(-abs(pivot-${f(pad.pivot.radius*.8)})*2.);
 col=mix(col,mount,auraMask(support));
 vec2 padPoint=auraPadPoint(q);
 vec3 padNormal=vec3(padPoint,sqrt(max(0.,1.-dot(padPoint,padPoint))));
 float padLight=clamp(dot(padNormal,normalize(vec3(-.35,.48,.80))),0.,1.);
 vec3 cushion=vec3(.027,.029,.032)+padLight*.032;
 return mix(col,cushion,auraMask(auraNosePad(q)));
}
vec3 auraPrescriptionWear(vec2 q,vec3 view){
 float frame=auraPrescriptionFrame(q);
 float bevel=exp(-abs(frame+.25)*2.)*.042;
 return mix(view,vec3(.041,.043,.047)+bevel,wearMask(frame));
}`;

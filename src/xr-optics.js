import * as T from 'three';
import {xrTarget,usesPassthrough,viewAlignmentGLSL} from './xr-math.js';
import {RENDER_ASSUMPTIONS} from './device-data.js';
import {wearGLSL} from './wear-shapes.js';
import {metaAmbient} from './room-lighting.js';

export function auraTransmission(level){
  return RENDER_ASSUMPTIONS.auraTransmission.coefficients[Math.min(5,Math.max(1,Math.round(Number(level)||1)))-1];
}

// Content and surroundings are rendered separately. The stencil writer MUST be
// in the same render() as content: Quest's XR/MSAA resolve invalidates depth and
// stencil between render calls (Three WebGLTextures / OculusBrowser path).
export function createHeadsetOptics(renderer,contentScene){
  const u={inverseProjection:{value:new T.Matrix4()},alignmentRotation:{value:new T.Vector2(1,0)},bounds:{value:new T.Vector4()},device:{value:0},eyeSide:{value:1},transmission:{value:.65},passthrough:{value:0}};
  Object.assign(u,{metaCloth:{value:.38},metaVeil:{value:.012},metaLightColor:{value:new T.Vector3(1,.88,.74)}});
  const vertexShader='varying vec2 uvScreen;void main(){uvScreen=position.xy;gl_Position=vec4(position.xy,0.,1.);}';
  const common=`varying vec2 uvScreen;uniform mat4 inverseProjection;uniform vec4 bounds;uniform float device,eyeSide,transmission,passthrough;
    uniform float metaCloth,metaVeil;uniform vec3 metaLightColor;
    ${wearGLSL}
    ${viewAlignmentGLSL}
    vec3 eyeRay(){vec4 p=inverseProjection*vec4(uvScreen,1.,1.);return alignedEyeRay(normalize(p.xyz));}
    vec2 wearPoint(vec3 ray){float r=length(ray.xy);return ray.xy/max(r,.00001)*acos(clamp(-ray.z,-1.,1.))*57.2957795*vec2(eyeSide,1.);}
    float displayDistance(vec3 ray){vec2 a=ray.xy/max(-ray.z,.0001);float d=max(max(bounds.x-a.x,a.x-bounds.y),max(bounds.z-a.y,a.y-bounds.w));
      return d;}
    vec4 compositeLayer(vec3 black,vec3 white){float opacity=clamp(1.-(white.r-black.r),0.,1.);return vec4(black/max(opacity,.0001),opacity);}
  `;
  function layer(fragment,options={}){
    const scene=new T.Scene(),material=new T.ShaderMaterial({uniforms:u,vertexShader,fragmentShader:common+fragment,transparent:true,depthWrite:false,depthTest:false,...options});
    const mesh=new T.Mesh(new T.PlaneGeometry(2,2),material);mesh.frustumCulled=false;
    mesh.onBeforeRender=(_r,_s,eyeCamera)=>{
      u.inverseProjection.value.copy(eyeCamera.projectionMatrix).invert();
      u.eyeSide.value=eyeCamera.userData.xrEyeSide??(renderer.xr.isPresenting&&eyeCamera===renderer.xr.getCamera().cameras[0]?-1:1);
    };scene.add(mesh);return scene;
  }
  const surround=layer(`void main(){vec3 ray=eyeRay();vec2 q=wearPoint(ray);
    if(device>1.5){gl_FragColor=vec4(0.,0.,0.,(1.-transmission)*wearMask(auraLensDistance(q)));}
    else {vec3 a=metaWear(q,vec3(0.),metaCloth,metaLightColor),b=metaWear(q,vec3(1.),metaCloth,metaLightColor);
      float d=displayDistance(ray),inside=1.-smoothstep(-fwidth(d),fwidth(d),d);
      a=mix(a,vec3(0.),inside);b=mix(b,vec3(passthrough),inside);gl_FragColor=compositeLayer(a,b);}
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`);
  const aperture=layer('void main(){if(displayDistance(eyeRay())>0.)discard;gl_FragColor=vec4(0.);}',{
    transparent:false,colorWrite:false,stencilWrite:true,stencilRef:1,stencilFunc:T.AlwaysStencilFunc,stencilZPass:T.ReplaceStencilOp,
  });
  const frame=layer(`void main(){vec2 q=wearPoint(eyeRay());gl_FragColor=compositeLayer(auraWear(q,vec3(0.)),auraWear(q,vec3(1.)));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`);
  const cloth=layer(`void main(){vec3 ray=eyeRay();if(displayDistance(ray)<0.)discard;vec2 q=wearPoint(ray);gl_FragColor=compositeLayer(metaWear(q,vec3(0.),metaCloth,metaLightColor),metaWear(q,vec3(1.),metaCloth,metaLightColor));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`);
  const veil=layer('void main(){if(displayDistance(eyeRay())>0.)discard;gl_FragColor=vec4(metaLightColor,metaVeil);}',{toneMapped:false});
  const prescription=layer(`void main(){vec2 q=wearPoint(eyeRay());gl_FragColor=compositeLayer(auraPrescriptionWear(q,vec3(0.)),auraPrescriptionWear(q,vec3(1.)));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`);
  const guide=layer(`void main(){vec3 ray=eyeRay();float d=displayDistance(ray),w=max(fwidth(d),.0005);float edge=1.-smoothstep(w,w*2.5,abs(d));
    vec2 a=ray.xy/max(-ray.z,.0001),aa=max(fwidth(a),vec2(.0004));
    float center=max((1.-smoothstep(aa.x,aa.x*2.,abs(a.x)))*(1.-step(.009,abs(a.y))),(1.-smoothstep(aa.y,aa.y*2.,abs(a.y)))*(1.-step(.009,abs(a.x))));
    gl_FragColor=vec4(device>1.5?vec3(.76,.63,.38):vec3(.51,.73,.83),max(edge*.85,center*.7));}`,{toneMapped:false});
  const originals=new Map();let profile='quest3',guides=true,vision='off',pitchDegrees=0;
  contentScene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){
    if(!originals.has(m)){
      originals.set(m,Object.fromEntries(['transparent','blending','premultipliedAlpha','blendSrc','blendDst','blendEquation','blendSrcAlpha','blendDstAlpha','blendEquationAlpha','stencilWrite','stencilRef','stencilFunc','stencilZPass'].map(key=>[key,m[key]])));
      // Three r180's sprite shader omits this chunk (mesh/points include it).
      // Without it, transparent city-label pixels still emit a solid rectangle.
      if(m.isSpriteMaterial){const compile=m.onBeforeCompile;m.onBeforeCompile=function(shader,r){
        compile.call(this,shader,r);
        shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\n#include <premultiplied_alpha_fragment>');
      };m.needsUpdate=true;}
    }
  }});
  const apertureMesh=aperture.children[0];
  apertureMesh.name='XR display stencil';apertureMesh.renderOrder=-Infinity;
  apertureMesh.visible=false;contentScene.add(apertureMesh);
  function update(state){
    profile=state.profile;guides=state.guides;vision=state.vision||'off';const target=xrTarget(profile),ar=profile==='aura';
    const ambient=metaAmbient(state.timeOfDay);u.metaCloth.value=ambient.cloth;u.metaVeil.value=ambient.veil;u.metaLightColor.value.fromArray(ambient.color);
    u.device.value=ar?2:1;u.transmission.value=auraTransmission(state.dim);u.passthrough.value=usesPassthrough(state)?1:0;
    if(target)u.bounds.value.fromArray(target.frustum);
    apertureMesh.visible=!!target;
    for(const [material,original] of originals){
      const wasPremultiplied=material.premultipliedAlpha;
      Object.assign(material,original);
      if(target)Object.assign(material,{stencilWrite:true,stencilRef:1,stencilFunc:T.EqualStencilFunc,stencilZPass:T.KeepStencilOp});
      if(ar){
        // Screen = display + dimmed room * (1 - display), matching the 2D
        // compositor. Premultiply first so transparent edges don't darken the
        // room; black pixels reveal it. The stencil remains in this render pass.
        Object.assign(material,{transparent:true,premultipliedAlpha:true,blending:T.CustomBlending,
          blendEquation:T.AddEquation,blendSrc:T.OneFactor,blendDst:T.OneMinusSrcColorFactor,
          blendEquationAlpha:T.AddEquation,blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor});
      }
      if(material.premultipliedAlpha!==wasPremultiplied)material.needsUpdate=true;
    }
  }
  return {update,
    setAlignment(pitch){pitchDegrees=pitch;u.alignmentRotation.value.set(Math.cos(pitch*Math.PI/180),Math.sin(pitch*Math.PI/180));},
    beforeContent(camera){if(profile==='quest3')return;renderer.render(surround,camera);renderer.clearDepth();},
    afterContent(camera){if(profile==='quest3')return;if(profile==='aura'){renderer.render(frame,camera);if(vision==='inserts')renderer.render(prescription,camera);}else{renderer.render(cloth,camera);renderer.render(veil,camera);}if(guides)renderer.render(guide,camera);},
    snapshot:()=>({profile,guides,geometryRevision:RENDER_ASSUMPTIONS.wearing.revision,displayCenterDegrees:profile==='quest3'?null:[0,pitchDegrees],targetDisplayDegrees:profile==='quest3'?null:{h:xrTarget(profile).h,v:xrTarget(profile).v},overlapModel:'No device-specific per-eye reconstruction; the same angular envelope and pitch are applied to both native eye projections.',periphery:profile==='quest3'?'native headset':'open virtual room',peripheralOpenings:profile==='quest3'?null:['lower','temporal (estimated)'],contentClipping:profile==='quest3'?'none':'per-eye stencil in content pass',auraTransmission:profile==='aura'?u.transmission.value:null,metaPassthrough:u.passthrough.value===1,metaAmbient:profile==='meta'?{cloth:u.metaCloth.value,veil:u.metaVeil.value}:null}),
  };
}

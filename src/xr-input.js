import * as T from 'three';

const chains=[['wrist','thumb-metacarpal','thumb-phalanx-proximal','thumb-phalanx-distal','thumb-tip'],
 ...['index','middle','ring','pinky'].map(f=>['wrist',`${f}-finger-metacarpal`,`${f}-finger-phalanx-proximal`,`${f}-finger-phalanx-intermediate`,`${f}-finger-phalanx-distal`,`${f}-finger-tip`])];
const jointNames=[...new Set(chains.flat())],links=chains.flatMap(c=>c.slice(1).map((n,i)=>[c[i],n]));

function controllerModel(){
 const g=new T.Group(),body=new T.MeshBasicMaterial({color:'#d7dfdc'}),dark=new T.MeshBasicMaterial({color:'#324b50'});
 const handle=new T.Mesh(new T.CapsuleGeometry(.023,.065,4,10),body);handle.position.y=-.025;handle.rotation.x=-.35;g.add(handle);
 const top=new T.Mesh(new T.SphereGeometry(.031,12,8),dark);top.scale.set(1,.4,1);top.position.set(0,.029,-.016);g.add(top);
 const button=new T.Mesh(new T.SphereGeometry(.007,8,6),new T.MeshBasicMaterial({color:'#b9ebd6'}));button.position.set(0,.043,-.016);g.add(button);
 return g;
}

// Local joint/bone geometry avoids a CDN model dependency. Only valid, currently
// tracked joint poses are drawn; no inferred hand is shown after tracking loss.
function handModel(hand){
 const material=new T.MeshBasicMaterial({color:'#c3e0d6'}),tips=new T.MeshBasicMaterial({color:'#e6fbf3'});
 const joints=new T.InstancedMesh(new T.SphereGeometry(1,8,6),tips,jointNames.length);
 const bones=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,6),material,links.length);
 for(const mesh of [joints,bones]){mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;hand.add(mesh);}
 const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3(),direction=new T.Vector3(),up=new T.Vector3(0,1,0);
 return ()=>{
  let jointCount=0,boneCount=0;
  for(const name of jointNames){const j=hand.joints[name];if(!j?.visible)continue;
   s.setScalar(Math.max(.004,j.jointRadius||.007));m.compose(j.position,j.quaternion,s);joints.setMatrixAt(jointCount++,m);
  }
  for(const [a,b] of links){const from=hand.joints[a],to=hand.joints[b];if(!from?.visible||!to?.visible)continue;
   direction.subVectors(to.position,from.position);const length=direction.length();if(length<.001)continue;
   p.copy(from.position).add(to.position).multiplyScalar(.5);q.setFromUnitVectors(up,direction.divideScalar(length));
   const radius=Math.max(.003,Math.min(from.jointRadius||.007,to.jointRadius||.007)*.7);
   m.compose(p,q,s.set(radius,length,radius));bones.setMatrixAt(boneCount++,m);
  }
  joints.count=jointCount;bones.count=boneCount;joints.instanceMatrix.needsUpdate=bones.instanceMatrix.needsUpdate=true;
  return jointCount;
 };
}

export function createXRMenuInput(renderer,rig,scene,{hitTest,onSelect,onToggle,canSummon,onHover,onMode,now=()=>performance.now()}){
 const inputRig=new T.Group();inputRig.matrixAutoUpdate=false;scene.add(inputRig);
 const entries=[];let lastSelection=null,mode='none',hoverKey=null;
 for(let i=0;i<2;i++){
  const controller=renderer.xr.getController(i),grip=renderer.xr.getControllerGrip(i),hand=renderer.xr.getHand(i);
  inputRig.add(controller,grip,hand);
  const body=controllerModel();grip.add(body);const updateHand=handModel(hand);
  const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]),new T.LineBasicMaterial({color:'#aadfc9',transparent:true,opacity:.7,depthTest:false}));
  const dot=new T.Mesh(new T.SphereGeometry(.006,10,8),new T.MeshBasicMaterial({color:'#e9fff5',depthTest:false}));
  line.visible=dot.visible=false;line.renderOrder=dot.renderOrder=20;scene.add(line,dot);
  const input={controller,grip,hand,body,line,dot,source:null,pressed:false,pressHit:null,consumed:false,downAt:0,joints:0};entries.push(input);
  const cancel=()=>{input.pressed=false;input.pressHit=null;input.consumed=false;line.visible=dot.visible=false;};
  controller.addEventListener('connected',e=>{cancel();input.source=e.data;});
  controller.addEventListener('disconnected',()=>{cancel();input.source=null;});
  controller.addEventListener('squeezestart',()=>{if(renderer.xr.isPresenting&&input.source&&!input.source.hand&&controller.visible)onToggle();});
  controller.addEventListener('selectstart',()=>{
   if(!renderer.xr.isPresenting||!input.source||!controller.visible)return;
   input.pressed=true;input.downAt=now();input.consumed=false;
   const hit=input.pressHit=hitTest(controller);
   lastSelection={slot:i,kind:input.source?.hand?'hand':'controller',handedness:input.source?.handedness,hit:!!hit,target:hit?.key||null};
   if(hit){input.consumed=true;onSelect(hit);}
  });
  // Activate buttons once on primary press (controller trigger / hand pinch).
  // Neither select nor Three's geometric pinch event also activates the button.
  // Releasing a long pinch that summoned the menu can never select a new item.
  controller.addEventListener('selectend',cancel);
  input.updateHand=updateHand;
 }
 function reset(){
  for(const entry of entries){entry.pressed=false;entry.consumed=false;entry.pressHit=null;entry.line.visible=entry.dot.visible=false;}
  hoverKey=null;onHover(null);lastSelection=null;
 }
 renderer.xr.addEventListener('sessionend',reset);
 return {
  update(menuOpen){
   inputRig.matrix.copy(rig.matrixWorld);inputRig.updateMatrixWorld(true);
   let hands=0,controllers=0,hover=null;
   for(const input of entries){
    const {controller,grip,hand,body,line,dot,source}=input,tracked=!!source&&controller.visible;
    body.visible=tracked&&!source.hand;
    input.joints=hand.visible&&source?.hand?input.updateHand():0;
    if(tracked){if(source.hand)hands++;else controllers++;}
    if(!tracked){input.pressed=false;input.pressHit=null;input.consumed=true;}
    if(input.pressed&&source?.hand&&!input.pressHit&&!input.consumed&&canSummon()&&now()-input.downAt>=800){input.consumed=true;onToggle();}
    const hit=tracked?hitTest(controller):null;
    controller.matrixWorld.decompose(line.position,line.quaternion,line.scale);
    // A short aiming cue and a visible hand/controller remain while watching.
    // Only menu interaction extends a ray across the content.
    line.scale.z=hit?.distance||(menuOpen?1.8:.16);line.material.opacity=(hit||menuOpen) ? .72 : .35;
    line.visible=tracked;dot.visible=!!hit;
    if(hit){dot.position.copy(hit.point);hover=hit.key;}
    if(!source?.hand)hand.visible=false;
   }
   const next=hands?'hands':controllers?'controllers':'none';if(mode!==next){mode=next;onMode(mode);}
   if(hover!==hoverKey){hoverKey=hover;onHover(hover);}
  },
  snapshot:()=>({mode,lastSelection,sources:entries.filter(e=>e.source).map(e=>({kind:e.source.hand?'hand':'controller',handedness:e.source.handedness,rayTracked:e.controller.visible,gripTracked:e.grip.visible,joints:e.joints,pressed:e.pressed})),raysVisible:entries.filter(e=>e.line.visible).length,longRaysVisible:entries.filter(e=>e.line.visible&&e.line.scale.z>.2).length}),
  reset,
 };
}

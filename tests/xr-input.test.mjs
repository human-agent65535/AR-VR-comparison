import test from 'node:test';
import assert from 'node:assert/strict';
import {EventDispatcher,Group,Scene,Vector3} from 'three';
import {createXRMenuInput} from '../src/xr-input.js';

function setup(kind){
 const rays=[new Group(),new Group()],grips=[new Group(),new Group()],hands=[new Group(),new Group()];
 for(const h of hands)h.joints={};
 const xr=Object.assign(new EventDispatcher(),{isPresenting:true,getController:i=>rays[i],getControllerGrip:i=>grips[i],getHand:i=>hands[i]});
 let time=0,hit=null,open=false,toggles=0;const selections=[];
 const input=createXRMenuInput({xr},new Group(),new Scene(),{hitTest:()=>hit,onSelect:h=>selections.push(h.key),onToggle:()=>{open=!open;toggles++;},canSummon:()=>!open,onHover:()=>{},onMode:()=>{},now:()=>time});
 const event=type=>rays[0].dispatchEvent({type});
 rays[0].dispatchEvent({type:'connected',data:{handedness:'right',...(kind==='hand'?{hand:{}}:{})}});
 return {input,event,selections,setTime:t=>time=t,setHit:key=>hit=key?{key,point:new Vector3(0,0,-1),distance:1}:null,get toggles(){return toggles;},get open(){return open;}};
}

test('long hand pinch summons once, ignores hand squeeze, and cannot select on release',()=>{
 for(const order of [['selectend','select'],['select','selectend']]){
  const h=setup('hand');h.event('squeezestart');assert.equal(h.toggles,0);
  h.event('selectstart');h.setTime(799);h.input.update(false);assert.equal(h.open,false);
  h.setTime(801);h.input.update(false);assert.equal(h.open,true);assert.equal(h.toggles,1);
  h.setHit('menu:exit');h.input.update(true);for(const event of order)h.event(event);
  assert.deepEqual(h.selections,[],'releasing the summoning pinch must not activate a menu item');
 }
});

test('controller and hand press selects once despite release jitter and runtime event order',()=>{
 for(const kind of ['hand','controller'])for(const order of [['selectstart','selectend','select'],['selectstart','select','selectend'],['select','selectstart','selectend']]){
  const h=setup(kind);h.setHit('menu:aura');
  for(const event of order){h.event(event);if(event==='selectstart')h.setHit('menu:exit');}h.event('select');
  assert.deepEqual(h.selections,['menu:aura'],'one primary action activates the original target exactly once');
  h.event('squeezestart');assert.equal(h.toggles,kind==='controller'?1:0);
 }
});

test('disconnect cancels pending selection and removes stale input visuals',()=>{
 const h=setup('hand');h.event('selectstart');h.event('disconnected');h.setHit('menu:aura');h.event('selectend');h.event('select');h.event('selectstart');h.input.update(false);
 assert.deepEqual(h.selections,[]);assert.equal(h.input.snapshot().mode,'none');assert.equal(h.input.snapshot().raysVisible,0);assert.deepEqual(h.input.snapshot().sources,[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTint} from '../src/display-prefs.js';
import {renderResolution} from '../src/render-quality.js';

test('tint defaults to strong dimming, respects saved choices and allows an explicit shared link',()=>{
  assert.equal(initialTint(null,null),5);
  assert.equal(initialTint(null,'3'),3);
  assert.equal(initialTint('5','3'),5);
  for(const invalid of ['',0,6,-2,'x',2.5])assert.equal(initialTint(invalid,null),5);
});
test('text capture gets an independent resolution budget without unbounded mobile allocations',()=>{
  const args={quality:'auto',coarse:true,pixelRatio:3,cellWidth:390,fieldH:124};
  const phone=renderResolution(args);assert.equal(phone.room,512);assert.equal(phone.content,1024);assert.equal(phone.dpr,1.5);
  const desktop=renderResolution({...args,coarse:false,cellWidth:880,pixelRatio:2});assert.equal(desktop.content,1536);assert.equal(desktop.room,1024);
  const low=renderResolution({...args,quality:'low'});assert.equal(low.content,512);assert.equal(low.room,256);assert.equal(low.dpr,1);
  assert.ok(renderResolution({...args,quality:'high',cellWidth:8000}).content<=2048);
  assert.ok(renderResolution({...args,maxCubeSize:512}).content<=512);
});

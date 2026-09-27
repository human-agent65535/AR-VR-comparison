import test from 'node:test';
import assert from 'node:assert/strict';
import {XR_VISION_MODES,XR_MYOPIA,visionBlurEnabled} from '../src/xr-vision.js';
import {metaAmbient} from '../src/room-lighting.js';
import {xrTarget} from '../src/xr-math.js';

test('fixed myopia has one prescription; correction restores the sealed Quest baseline',()=>{
 assert.deepEqual(XR_VISION_MODES,['off','uncorrected','inserts']);assert.equal(XR_MYOPIA.diopters,4);
 assert.ok(XR_MYOPIA.radiusRadians>0&&XR_MYOPIA.radiusRadians<.01);
 for(const profile of ['quest3','meta','aura']){
  const target=JSON.stringify(xrTarget(profile));assert.equal(visionBlurEnabled('off',profile),false);assert.equal(visionBlurEnabled('uncorrected',profile),true);
  assert.equal(visionBlurEnabled('inserts',profile),profile!=='quest3');assert.equal(JSON.stringify(xrTarget(profile)),target);
 }
});

test('open-side ambient response is modest and decreases from day to night',()=>{
 const day=metaAmbient('day'),dusk=metaAmbient('dusk'),night=metaAmbient('night');
 assert.ok(day.cloth>dusk.cloth&&dusk.cloth>night.cloth&&night.cloth>0);
 assert.ok(day.veil>dusk.veil&&dusk.veil>night.veil&&day.veil<.04&&night.veil>0);
 assert.equal(metaAmbient('bad'),dusk);
});

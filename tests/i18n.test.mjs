import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLanguage,translateEnglish,setLanguage,t} from '../src/i18n.js';
import {XR_CONTENTS,xrMenuButtons} from '../src/xr-menu.js';
test('English is the default while an explicit Chinese choice is retained',()=>{
 for(const saved of [null,undefined,'en','fr',''])assert.equal(initialLanguage(saved),'en');
 assert.equal(initialLanguage('zh'),'zh');
 setLanguage('zh');assert.equal(t('并排对比'),'并排对比');
 setLanguage('en');assert.equal(t('并排对比'),'Compare');
});
test('all contextual Canvas menu labels have English translations',()=>{
 for(const profile of ['quest3','meta','aura'])for(const content of XR_CONTENTS)for(const style of ['auto','vr','passthrough']){
  const buttons=xrMenuButtons({profile,content,style,dim:5,earthLayout:'wide',place:'tokyo',guides:false});
  for(const b of buttons)for(const line of b.label.split('\n'))assert.doesNotMatch(translateEnglish(line),/[\u4e00-\u9fff]/,line);
 }
});
test('dynamic vision values keep their prescription units in English',()=>{
 assert.equal(translateEnglish('−3.00 D · 300 度'),'−3.00 D');
 assert.equal(translateEnglish('已戴处方片 · AURA 三层框 · 近视 300 度 / 散光 100 度'),'Prescription inserts · AURA three layers · Myopia 3.00 D / Cylinder 1.00 D');
});

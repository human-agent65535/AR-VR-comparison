import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoomTime,ROOM_TIMES,ROOM_TIME_LABELS,ROOM_LIGHTING} from '../src/room-lighting.js';
import {translateEnglish} from '../src/i18n.js';
import {xrMenuButtons} from '../src/xr-menu.js';

test('room time keeps the familiar dusk default, persists choices and honours valid shared links',()=>{
  assert.equal(initialRoomTime(null,null),'dusk');
  for(const time of ROOM_TIMES){
    assert.equal(initialRoomTime(null,time),time);
    assert.equal(initialRoomTime(time,'dusk'),time);
    assert.equal(initialRoomTime('invalid',time),time);
  }
  for(const invalid of [undefined,'','sunset','__proto__',0])assert.equal(initialRoomTime(invalid,invalid),'dusk');
});

test('day, dusk and night pair less daylight with practical room lighting, not display exposure',()=>{
  const {day,dusk,night}=ROOM_LIGHTING;
  assert.ok(day.ambient>dusk.ambient&&dusk.ambient>night.ambient);
  assert.ok(day.environment>dusk.environment&&dusk.environment>night.environment);
  assert.equal(day.lamp,0);assert.ok(night.lamp>dusk.lamp&&dusk.lamp>0);
  assert.ok(night.sunIntensity<dusk.sunIntensity*.1);
  for(const time of ROOM_TIMES){
    const p=ROOM_LIGHTING[time];
    assert.ok(p.ambient>0&&p.environment>0,'night remains navigable');
    assert.ok(!('fov' in p)&&!('exposure' in p)&&!('contentScale' in p),'room lighting cannot change display framing');
    const b=xrMenuButtons({profile:'aura',content:'cinema',timeOfDay:time,dim:5,guides:false}).find(b=>b.id==='time');
    assert.ok(b.label.endsWith(ROOM_TIME_LABELS[time]));
    for(const line of b.label.split('\n'))assert.doesNotMatch(translateEnglish(line),/[\u4e00-\u9fff]/);
  }
});

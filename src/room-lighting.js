// Artistic lighting presets for the existing apartment, not measured daylight
// or headset passthrough calibration. Keep display exposure/FOV independent.
export const ROOM_TIMES=['day','dusk','night'];
export const ROOM_TIME_LABELS={day:'白天',dusk:'黄昏',night:'夜晚'};
// Qualitative open-side ambient-light response, not measured transmission or
// panel auto-brightness. Veiling light raises black level only modestly.
export const META_AMBIENT={
 day:{cloth:.95,veil:.028,color:[.94,.98,1]},
 dusk:{cloth:.68,veil:.012,color:[1,.88,.74]},
 night:{cloth:.30,veil:.0025,color:[.75,.84,1]},
};
export const metaAmbient=time=>META_AMBIENT[time]||META_AMBIENT.dusk;
export const ROOM_LIGHTING={
  day:{sky:'#b9d3e5',ground:'#a79b88',ambient:1.1,sun:'#fff3df',sunIntensity:2.15,sunPosition:[-8,12,-12],environment:.42,ceiling:.25,desk:.65,lamp:0,fixtures:.12,shade:0,backdrop:[1,0]},
  dusk:{sky:'#d9e4ec',ground:'#958371',ambient:.755,sun:'#ffe2bc',sunIntensity:2.25,sunPosition:[-8,4.8,-12],environment:.376,ceiling:6,desk:1.4,lamp:9,fixtures:.65,shade:.08,backdrop:[0,0]},
  night:{sky:'#8195b5',ground:'#80654b',ambient:.24,sun:'#adc5ed',sunIntensity:.12,sunPosition:[-8,10,-12],environment:.12,ceiling:28,desk:2.2,lamp:15,fixtures:1,shade:.28,backdrop:[0,1]}
};
const STORAGE_KEY='skyroom-room-time';
export function initialRoomTime(query,saved){return [query,saved].find(value=>ROOM_TIMES.includes(value))||'dusk';}
export function readRoomTime(params){let saved;try{saved=localStorage.getItem(STORAGE_KEY);}catch{}return initialRoomTime(params.get('time'),saved);}
export function saveRoomTime(value){
  const time=initialRoomTime(value);
  try{localStorage.setItem(STORAGE_KEY,time);}catch{}
  const url=new URL(location.href);if(url.searchParams.has('time')){url.searchParams.set('time',time);history.replaceState({},'',url);}
}

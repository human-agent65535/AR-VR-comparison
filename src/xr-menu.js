import {ROOM_TIME_LABELS} from './room-lighting.js';
import {XR_VISION_LABELS} from './xr-vision.js';
export const XR_CONTENTS=['earth','cinema','fov','work','vision'];
export const XR_MENU={width:1680,height:600,pixelRatio:2,worldWidth:1.48,distance:1.5,verticalOffset:0,
 dock:{width:.32,height:.09,distance:1.5,verticalOffset:-.86}};
export function xrControls(state){
 return {earth:state.content==='earth',style:state.profile==='meta'&&state.content!=='earth',tint:state.profile==='aura',guides:state.profile!=='quest3',room:state.profile!=='quest3'||state.content!=='earth'};
}
export function xrMenuButtons(state){
 const visible=xrControls(state),contentNames={earth:'全景地球',cinema:'公寓影院',fov:'视野标尺',work:'空间桌面',vision:'视力标靶'};
 const rows=[[
  {id:'quest3',label:'Quest 3\n原生视野',active:state.profile==='quest3'},
  {id:'meta',label:'VR Glasses\n70° × 66°',active:state.profile==='meta'},
  {id:'aura',label:'AURA\n≈61° × 41°',active:state.profile==='aura'}
 ],[
  {id:'content',label:'切换内容 ↻\n'+contentNames[state.content]},
  {id:'recenter',label:'内容回正'},
  {id:'exit',label:'退出 VR'}
 ]];
 const settings=[];
 if(visible.earth){
  settings.push({id:'place',label:'目的地 ↻\n'+({atlantic:'大西洋',newyork:'纽约',tokyo:'东京'}[state.place])});
  settings.push({id:'layout',label:'应用布局\n'+(state.earthLayout==='compact'?'完整界面':'周边展开')});
 }
 if(visible.style)settings.push({id:'style',label:'显示背景\n'+({auto:'跟随应用',vr:'VR 黑底',passthrough:'视频透视示意'}[state.style])});
 if(visible.tint)settings.push({id:'tint',label:`镜片调光\n${state.dim} / 5`});
 if(visible.room)settings.push({id:'time',label:'时间 ↻\n'+ROOM_TIME_LABELS[state.timeOfDay||'dusk']});
 if(visible.guides)settings.push({id:'guides',label:'视野边界\n'+(state.guides?'已显示':'已隐藏'),active:state.guides});
 settings.push({id:'eyes',label:'视力模拟\n'+XR_VISION_LABELS[state.vision||'off'],active:!!state.vision&&state.vision!=='off'});
 for(let i=0;i<settings.length;i+=3)rows.push(settings.slice(i,i+3));
 const w=(XR_MENU.width-40-28)/3;
 return [{id:'hide',label:'收起菜单',header:true,x:1412,y:12,w:248,h:48},
  ...rows.flatMap((row,r)=>row.map((b,i)=>({...b,x:(XR_MENU.width-(row.length*w+(row.length-1)*14))/2+i*(w+14),y:74+r*126,w,h:112})))];
}

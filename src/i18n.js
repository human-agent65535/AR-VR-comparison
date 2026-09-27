import {EN} from './translations.js';
const normalize=s=>String(s).replace(/\s+/g,' ').trim();
const entries=Object.entries(EN).map(([a,b])=>[normalize(a),b]);
const dictionary=new Map(entries),reverse=new Map(entries.map(([a,b])=>[normalize(b),a]));
const fragments=[...entries].sort((a,b)=>b[0].length-a[0].length);
const key='skyroom-language';
export function initialLanguage(saved){return saved==='zh'?'zh':'en';}
let language='en';
try{if(typeof window!=='undefined')language=initialLanguage(window.localStorage.getItem(key));}catch{}
export function translateEnglish(source){
 let s=normalize(source);if(dictionary.has(s))return dictionary.get(s);
 s=s.replace(/(已戴处方片|未矫正) · AURA (三|两)层框 · 近视 (\d+) 度 \/ 散光 (\d+) 度/,(_,mode,layers,sphere,cyl)=>`${mode==='已戴处方片'?'Prescription inserts':'Uncorrected'} · AURA ${layers==='三'?'three':'two'} layers · Myopia ${(Number(sphere)/100).toFixed(2)} D / Cylinder ${(Number(cyl)/100).toFixed(2)} D`)
 .replace(/\s*·\s*\d+ 度/g,'')
 .replace(/(上移|下移) (\d+)% 框高/g,(_,dir,n)=>`${dir==='上移'?'Up':'Down'} ${n}% of frame height`)
 .replace(/(\d+) 款已绘制/g,'$1 devices plotted').replace(/(\d+) 款轴向未知/g,'$1 with unknown axes')
 .replace(/(右|左)眼周边视野参考 · 上 60° \/ 下 75°/g,(_,eye)=>`${eye==='右'?'Right':'Left'} eye reference · 60° up / 75° down`);
 for(const [a,b] of fragments)if(s.includes(a))s=s.split(a).join(b);
 return s.replace(/：/g,': ').replace(/；/g,'; ').replace(/，/g,', ').replace(/。/g,'. ').replace(/、/g,' / ').replace(/（/g,' (').replace(/）/g,')');
}
export function t(source){return language==='en'?translateEnglish(source):String(source);}
export function getLanguage(){return language;}
export function setLanguage(next){
 language=initialLanguage(next);try{if(typeof window!=='undefined')window.localStorage.setItem(key,language);}catch{}
 if(typeof document!=='undefined'){refresh();window.dispatchEvent(new CustomEvent('languagechange',{detail:{language}}));}
}
const textSources=new WeakMap(),attributeSources=new WeakMap();
const skip='script,style,code,[data-no-translate]';
function translated(source){return language==='en'?translateEnglish(source):source;}
function updateText(node){
 if(!node.parentElement||node.parentElement.closest(skip)||!node.textContent.trim())return;
 const pre=node.parentElement.closest('pre');if(pre&&/^[\s]*[\[{]/.test(pre.textContent))return;
 const current=node.textContent,previous=textSources.get(node);
 const source=previous&&current===previous.output?previous.source:(reverse.get(normalize(current))||current);
 const prefix=source.match(/^\s*/)[0],suffix=source.match(/\s*$/)[0];
 const output=prefix+translated(source.trim())+suffix;
 textSources.set(node,{source,output});if(current!==output)node.textContent=output;
}
function visit(node){
 if(node.nodeType===3){updateText(node);return;}
 if(node.nodeType!==1||node.matches(skip))return;
 let sources=attributeSources.get(node);if(!sources){sources=new Map();attributeSources.set(node,sources);}
 for(const name of ['title','aria-label','alt','placeholder'])if(node.hasAttribute(name)){
  const value=node.getAttribute(name),previous=sources.get(name),source=previous&&value===previous.output?previous.source:(reverse.get(normalize(value))||value),output=translated(source);
  sources.set(name,{source,output});if(value!==output)node.setAttribute(name,output);
 }
 for(const child of node.childNodes)visit(child);
}
function refresh(){
 document.documentElement.lang=language==='en'?'en':'zh-CN';visit(document.documentElement);
 document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lang===language));
}
if(typeof document!=='undefined'){
 refresh();
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-lang]');if(button)setLanguage(button.dataset.lang);});
 new MutationObserver(records=>{for(const record of records){if(record.type==='childList')record.addedNodes.forEach(visit);else visit(record.target);}}).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','alt','placeholder']});
}

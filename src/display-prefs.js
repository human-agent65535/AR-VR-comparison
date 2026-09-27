const TINT_KEY='skyroom-aura-tint';
export function initialTint(query,saved){
  for(const value of [query,saved])if(value!==null&&value!==undefined&&value!==''&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=5)return Number(value);
  return 5;
}
export function readTint(params){
  let saved;try{saved=localStorage.getItem(TINT_KEY);}catch{}
  return initialTint(params.get('dim'),saved);
}
export function saveTint(level){
  try{localStorage.setItem(TINT_KEY,String(level));}catch{}
  // Keep an explicit shared-link override in step with later user adjustments.
  const url=new URL(location.href);if(url.searchParams.has('dim')){url.searchParams.set('dim',level);history.replaceState({},'',url);}
}

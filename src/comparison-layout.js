export const COMPARISON_DEVICES=['quest3','meta','aura'];
export const COMPARISON_PAIRS={
  'quest3-meta':['quest3','meta'],
  'quest3-aura':['quest3','aura'],
  'meta-aura':['meta','aura'],
};
export const THREE_VIEW_MIN_WIDTH=1140;
export function comparisonLayout(width,height,pair='quest3-meta'){
  const devices=width>=THREE_VIEW_MIN_WIDTH?COMPARISON_DEVICES:(COMPARISON_PAIRS[pair]||COMPARISON_PAIRS['quest3-meta']);
  const stacked=width<660,count=devices.length;
  // Equal pane dimensions keep pixels per degree identical, including odd widths.
  const extent=Math.floor(((stacked?height:width)-(count-1))/count);
  const margin=Math.floor(((stacked?height:width)-(extent*count+count-1))/2);
  return devices.map((type,i)=>({type,x:stacked?0:margin+i*(extent+1),y:stacked?margin+i*(extent+1):0,w:stacked?width:extent,h:stacked?extent:height}));
}

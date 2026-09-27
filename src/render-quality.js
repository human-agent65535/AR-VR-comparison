// The room is inexpensive to reuse at lower resolution. Text and virtual panels
// need their own capture budget: sharing the room's low-power cubemap made apps
// soft even though no optical blur was enabled. Limit mobile allocation.
export function renderResolution({quality,coarse,pixelRatio,cellWidth,fieldH,maxCubeSize=2048}){
  const dpr=Math.min(pixelRatio,quality==='low'?1:coarse&&quality!=='high'?1.5:2);
  const room=Math.min(maxCubeSize,quality==='low'?256:quality==='high'?1024:coarse?512:1024);
  const cap=quality==='low'?512:quality==='high'?2048:coarse?1024:1536;
  const needed=Math.ceil(cellWidth*dpr/fieldH*(360/Math.PI)/256)*256;
  const content=Math.min(maxCubeSize,cap,Math.max(quality==='low'?512:1024,needed));
  return {dpr,room,content};
}

// CPU reference for qualitative composition. Optical input colors are separately
// mapped to screen output before combining; transmission is a visual tint ratio,
// not calibrated physical transmittance. A bounded screen blend avoids adding
// encoded values past white. It is an appearance model, not radiometry: black
// emits nothing, white stays white and tint never attenuates the display itself.
export function composePixel({route,real,emitted,alpha=1,transmission=1,enabled=true,pass=true}) {
 const virtual=enabled?emitted:[0,0,0],a=enabled?alpha:0;
 return real.map((c,i)=>route==='optical'?c*transmission*(1-virtual[i])+virtual[i]:virtual[i]+(pass?c:0)*(1-a));
}

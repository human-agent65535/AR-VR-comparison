export const rad = Math.PI / 180;
export const tanHalf = degrees => Math.tan(degrees * rad / 2);
export function diagonalFov(d, ratio) {
  if (!(d > 0 && d < 180 && ratio > 0)) throw new RangeError('Invalid diagonal FOV / aspect');
  return {h: 2*Math.atan(tanHalf(d)*ratio/Math.hypot(ratio,1))/rad,
    v: 2*Math.atan(tanHalf(d)/Math.hypot(ratio,1))/rad, d};
}
// Signed OpenXR-style angles: left/down negative, right/up positive, in radians.
export function profileFromAngles({left,right,up,down}) {
  if (![left,right,up,down].every(Number.isFinite) || left>=right || down>=up || Math.max(...[left,right,up,down].map(Math.abs))>=Math.PI/2) throw new RangeError('Invalid FOV boundaries');
  const h=(right-left)/rad,v=(up-down)/rad;
  return {h,v,angles:{left,right,up,down},anglesUnit:'rad',frustum:[Math.tan(left),Math.tan(right),Math.tan(down),Math.tan(up)],tangent:[tanHalf(h),tanHalf(v)]};
}
export function symmetricProfile(h,v) {return {...profileFromAngles({left:-h*rad/2,right:h*rad/2,down:-v*rad/2,up:v*rad/2}),d:2*Math.atan(Math.hypot(tanHalf(h),tanHalf(v)))/rad};}
export function virtualPlaneSize(profile,distance) {
  if (!(distance>0)) throw new RangeError('Invalid virtual distance');
  const f=profile.frustum||symmetricProfile(profile.h,profile.v).frustum;
  return {width:distance*(f[1]-f[0]),height:distance*(f[3]-f[2])};
}

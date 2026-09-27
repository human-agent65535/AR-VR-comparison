import {Euler,Quaternion,Vector3,MathUtils} from 'three';
const deviceCorrection=new Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5));
const zAxis=new Vector3(0,0,1);
export function deviceQuaternion(alpha,beta,gamma,screenAngle=0){
  const e=new Euler(MathUtils.degToRad(beta),MathUtils.degToRad(alpha),-MathUtils.degToRad(gamma),'YXZ');
  return new Quaternion().setFromEuler(e).multiply(deviceCorrection).multiply(new Quaternion().setFromAxisAngle(zAxis,-MathUtils.degToRad(screenAngle)));
}
export function recenterOffset(raw,current=new Quaternion()) {return current.clone().multiply(raw.clone().invert());}
export function relativeOrientation(raw,offset){return offset.clone().multiply(raw).normalize();}

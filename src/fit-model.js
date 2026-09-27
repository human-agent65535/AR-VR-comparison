import {physicalGeometry,MODEL_WORLD_SCALE,ROOT_Z} from './device-data.js';
export {MODEL_WORLD_SCALE,ROOT_Z};
export const EYE_REFERENCE=Object.fromEntries(Object.entries(physicalGeometry).map(([id,d])=>[id,d.eye]));
// Percent of each reconstructed frame's height, not a measured eye-relief value.
export const fitOffset=(device,value=0)=>physicalGeometry[device].frameHeight*value/100;

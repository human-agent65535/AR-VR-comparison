import {rad} from '../../src/optics.js';
import {RENDER_ASSUMPTIONS} from '../../src/device-data.js';
// Illustrative geometric defocus for a 4 mm pupil; not a visual-acuity prediction.
export function blurAxes({sphere=0,cylinder=0,axis=0},distance=Infinity,strength=1){
 const demand=Number.isFinite(distance)?1/Math.max(.1,distance):0,k=RENDER_ASSUMPTIONS.prescription.pupilMm/2000/rad*Math.max(1,strength);
 return {minor:Math.max(0,sphere-demand)*k,major:Math.max(0,sphere+cylinder-demand)*k,axis:((axis%180)+180)%180};
}

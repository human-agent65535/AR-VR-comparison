import {Shape} from 'three';

// Photo-derived contours for the hardware viewer only. Positive x is temporal;
// the opposite lens is mirrored as a complete assembly. No display FOV inputs.
// The lower edge is a continuous bowl, with a sloping nasal edge and a wider
// upper temporal shoulder, rather than four equal rounded rectangle corners.
export function auraLensOutline(w,h,upperLift=0){
 const s=new Shape(),p=(x,y)=>[x*w,y*h+upperLift*Math.max(0,2*y)];
 s.moveTo(...p(-.485,.18));
 s.bezierCurveTo(...p(-.465,.405),...p(-.235,.50),...p(.075,.50));
 s.bezierCurveTo(...p(.325,.50),...p(.485,.415),...p(.50,.235));
 s.bezierCurveTo(...p(.515,.045),...p(.46,-.245),...p(.325,-.385));
 s.bezierCurveTo(...p(.19,-.52),...p(-.085,-.52),...p(-.26,-.405));
 s.bezierCurveTo(...p(-.39,-.31),...p(-.485,-.025),...p(-.485,.18));
 s.closePath();return s;
}

export function auraFrameOutline(w,h,upperLift=0){
 const s=new Shape(),p=(x,y)=>[x*w,y*h+upperLift*Math.max(0,2*y)];
 s.moveTo(...p(-.49,.18));
 s.bezierCurveTo(...p(-.465,.405),...p(-.245,.50),...p(.07,.50));
 s.bezierCurveTo(...p(.32,.50),...p(.54,.49),...p(.57,.375));
 s.bezierCurveTo(...p(.595,.27),...p(.555,.205),...p(.515,.17));
 s.bezierCurveTo(...p(.51,-.015),...p(.45,-.29),...p(.315,-.407));
 s.bezierCurveTo(...p(.18,-.53),...p(-.105,-.525),...p(-.28,-.403));
 s.bezierCurveTo(...p(-.415,-.29),...p(-.49,-.015),...p(-.49,.18));
 s.closePath();return s;
}

export function auraBrowOutline(prismTop=.094){
 const s=new Shape();
 // Rear photographs show a deep continuous upper housing. Its lower face
 // above each prism is almost straight, not a thin wave-shaped brow rim.
 s.moveTo(-.848,prismTop+.056);
 s.bezierCurveTo(-.86,.323,-.64,.352,-.43,.343);
 s.bezierCurveTo(-.23,.337,-.13,.313,0,.312);
 s.bezierCurveTo(.13,.313,.23,.337,.43,.343);
 s.bezierCurveTo(.64,.352,.86,.323,.848,prismTop+.056);
 s.quadraticCurveTo(.835,prismTop+.003,.77,prismTop);
 s.lineTo(.06,prismTop);s.quadraticCurveTo(0,prismTop-.017,-.06,prismTop);
 s.lineTo(-.77,prismTop);s.quadraticCurveTo(-.835,prismTop+.003,-.848,prismTop+.056);
 s.closePath();return s;
}

// Flat upper entrance with soft lower corners. This optical body is distinct
// from the bowed outer sunglasses; the hidden display/chip stack is not drawn.
export function auraPrismOutline(w,h){
 const s=new Shape(),p=(x,y)=>[x*w,y*h];
 s.moveTo(...p(-.478,.5));s.lineTo(...p(.478,.5));
 s.quadraticCurveTo(...p(.5,.5),...p(.5,.455));s.lineTo(...p(.5,-.04));
 s.bezierCurveTo(...p(.5,-.34),...p(.39,-.5),...p(.25,-.5));
 s.lineTo(...p(-.25,-.5));
 s.bezierCurveTo(...p(-.39,-.5),...p(-.5,-.34),...p(-.5,-.04));
 s.lineTo(...p(-.5,.455));s.quadraticCurveTo(...p(-.5,.5),...p(-.478,.5));
 s.closePath();return s;
}

// Side profile of the broad electronics temple and curved ear tip. x here is
// distance behind the hinge; the mesh is remapped to z after extrusion.
export function auraTempleOutline(){
 const s=new Shape();
 s.moveTo(0,.205);s.lineTo(.40,.212);
 s.bezierCurveTo(.74,.215,1.1,.216,1.34,.185);
 s.bezierCurveTo(1.60,.156,1.66,.075,1.79,-.095);
 s.lineTo(1.94,-.305);
 s.bezierCurveTo(1.968,-.345,1.916,-.393,1.873,-.346);
 s.lineTo(1.665,-.108);
 s.bezierCurveTo(1.542,.036,1.385,.045,1.234,.016);
 s.bezierCurveTo(1.102,-.011,1.055,-.092,.924,-.088);
 s.bezierCurveTo(.63,-.047,.29,.012,0,.056);
 s.closePath();return s;
}

// Rigid registration to the newest supplied folded assembly.
export const ARM_REFERENCE_ROTATION=0.8792762963334925;
const offset=[0,-65.04892047469858,-391.2976518843271];
export function calibrateArmDirection([x,y,z]){return [x,y*Math.cos(ARM_REFERENCE_ROTATION)-z*Math.sin(ARM_REFERENCE_ROTATION),y*Math.sin(ARM_REFERENCE_ROTATION)+z*Math.cos(ARM_REFERENCE_ROTATION)];}
export function calibrateArmPoint(point){return calibrateArmDirection(point).map((v,i)=>v+offset[i]);}

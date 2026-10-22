export const openingPercent=progress=>Math.round((1-progress)*100);
export const openingAngles=angles=>({base:90-angles.base,upper:180-angles.upper});
export const internalJointAngle=(joint,degrees)=>(joint==='base'?90:180)-degrees;

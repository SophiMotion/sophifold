import {isScrewComponent} from './model-data.js';

export const componentGroups=['chassis','folding','arm','electronics','fasteners'];
const electronics=new Set([48,49,57,58,59,60,61,71,72,73,74,84,97]);
export function componentGroup(part){
 if(isScrewComponent(part)||part.id===51)return 'fasteners';
 if(electronics.has(part.id))return 'electronics';
 if(part.id>=85&&part.id<=96)return 'arm';
 if(part.id>=62)return 'folding';
 return 'chassis';
}
const labels={12:'deck',13:'driveMotor',14:'motorMount',19:'driveMotor',20:'drivePart',25:'driveGear',26:'driveMount',27:'driveGear',28:'driveMount',29:'track',30:'driveMotor',31:'motorMount',36:'driveMotor',37:'drivePart',42:'drivePart',43:'drivePart',44:'drivePart',45:'drivePart',46:'track',47:'bottomPlate',48:'screen',49:'screenMount',50:'frameMount',51:'locknut',57:'button',58:'buttonMount',59:'emergencyStop',60:'usb',61:'voltage',64:'hingeHousing',65:'stepper',66:'gearbox',67:'hingeCover',68:'bearing',69:'bearingConnector',70:'motorConnector',71:'mainBoard',72:'auxBoard',73:'motorDriver',74:'motorDriver',75:'lowerShell',76:'lowerLid',77:'upperShell',78:'stepper',79:'gearbox',80:'hingeCover',81:'bearingConnector',82:'shellConnector',83:'foldPart',84:'sensor',85:'armPart',86:'armPart',87:'gripperJaw',88:'armPart',89:'elbowPart',90:'elbowPart',91:'shoulder',92:'armBase',93:'armMount',94:'armMount',95:'armHardware',96:'armMount',97:'sensor',98:'upperLid'};
export function componentLabel(part,t){
 let label=labels[part.id];
 if(part.id<12||part.id===62||part.id===63)label='rail';
 if(label)return `${t('part_'+label)} · ${part.id+1}`;
 return part.name.trim().replace(/\s+v1\b/gi,'').replace(/\(镜像\)/g,'(mirror)');
}
export function matchingComponents(meshes,query,t){
 const q=query.trim().toLowerCase();
 return meshes.filter(p=>!q||[p.name,componentLabel(p,t),t('group_'+componentGroup(p))].some(s=>s.toLowerCase().includes(q)));
}

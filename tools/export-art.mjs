import { SCENES,STAGES,PERSONALITIES,WEARABLES,FPS,FRAME_COUNT,artKey,renderMori } from '../studio-art/mori.ts';
import { writeFileSync } from 'node:fs';
const all={};
for(const scene of SCENES)for(const stage of STAGES)for(const personality of PERSONALITIES)for(const wearable of WEARABLES){
  all[artKey(scene,stage,personality,wearable)]={fps:FPS[scene],frames:Array.from({length:FRAME_COUNT},(_,i)=>renderMori(scene,i,stage,personality,wearable))};
}
all.idle=all['idle/seedling/gentle/none'];
for(const anim of Object.values(all))for(const f of anim.frames)if(f.length!==391||f.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid frame');
for(const [key,anim] of Object.entries(all))if(new Set(anim.frames.map(f=>f.join(','))).size<2)throw Error(`${key}: pet animation has no motion`);
writeFileSync(new URL('../app/assets/pet-frames.json',import.meta.url),JSON.stringify(all));
console.log(`${Object.keys(all).length-1} Mori appearance animations + fallback exported; 17×23 frames validated`);

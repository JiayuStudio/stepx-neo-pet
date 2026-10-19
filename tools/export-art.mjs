import { SCENES,STAGES,PERSONALITIES,WEARABLES,CHARACTERS,FPS,FRAME_COUNT,artKey,renderMori } from '../studio-art/mori.ts';
import { writeFileSync } from 'node:fs';
const all={};
const EGG_SCENE_SET=['egg','crack','hatch'];
for(const character of CHARACTERS)for(const scene of SCENES)for(const stage of STAGES)for(const personality of PERSONALITIES)for(const wearable of WEARABLES){
  if(EGG_SCENE_SET.indexOf(scene)>=0){
    // 蛋阶段与养成维度无关，每角色一套（键 <scene>/<character>）
    all[artKey(character,scene,stage,personality,wearable,false)]={fps:FPS[scene],frames:Array.from({length:FRAME_COUNT},(_,i)=>renderMori(character,scene,i,stage,personality,wearable,false))};
    continue;
  }
  const base={fps:FPS[scene],frames:Array.from({length:FRAME_COUNT},(_,i)=>renderMori(character,scene,i,stage,personality,wearable,false))};
  all[artKey(character,scene,stage,personality,wearable,false)]=base;
  // 耳机帧 = 基础帧 + 增量叠加（与身体共用变换生成后取 diff，控制资产体积）
  const hpFrames=Array.from({length:FRAME_COUNT},(_,i)=>renderMori(character,scene,i,stage,personality,wearable,true));
  const overlay=hpFrames.map((f,i)=>{const pairs=[];for(let p=0;p<f.length;p++)if(f[p]!==base.frames[i][p])pairs.push(p,f[p]);return pairs;});
  all[artKey(character,scene,stage,personality,wearable,true)]={fps:FPS[scene],overlay};
}
// PetArt 的兜底键：星跃幼苗
all.idle=all[artKey('star','idle','seedling','gentle','none')];
for(const anim of Object.values(all)){
  if(anim.frames){for(const f of anim.frames)if(f.length!==391||f.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Invalid frame');}
  else if(anim.overlay){for(const pairs of anim.overlay)for(let i=0;i<pairs.length;i+=2){if(pairs[i]<0||pairs[i]>=391||pairs[i+1]<0||pairs[i+1]>255)throw Error('Invalid overlay');}}
  else throw Error('Entry without frames or overlay');
}
for(const [key,anim] of Object.entries(all))if(anim.frames&&new Set(anim.frames.map(f=>f.join(','))).size<2)throw Error(`${key}: pet animation has no motion`);
// 两角色同场景帧必须不同（外形确实换掉了；蛋阶段为角色着色蛋，单独校验）
for(const scene of EGG_SCENE_SET)for(const character of CHARACTERS){
  const a=all[artKey(character,scene,'seedling','gentle','none',false)];
  if(!a||!a.frames)throw Error(scene+'/'+character+': egg scene missing');
  if(new Set(a.frames.map(f=>f.join(','))).size<2)throw Error(scene+'/'+character+': egg animation has no motion');
}
for(const scene of SCENES.filter(x=>EGG_SCENE_SET.indexOf(x)<0))for(const stage of STAGES)for(const personality of PERSONALITIES)for(const wearable of WEARABLES){
  const a=all[artKey('star',scene,stage,personality,wearable)],b=all[artKey('block',scene,stage,personality,wearable)];
  if(!a||!b)throw Error('missing character variant');
  if(a.frames.every((f,i)=>f.join(',')===b.frames[i].join(',')))throw Error(`${scene}/${stage}: star and block identical`);
  // 耳机增量必须非空、随身体一起动（第 0 与第 3 帧不同），且包含黑橙耳机像素
  const hp=all[artKey('star',scene,stage,personality,wearable,true)];
  if(!hp.overlay||hp.overlay.length!==FRAME_COUNT)throw Error(`${scene}/${stage}: headphones overlay missing`);
  if(hp.overlay.some(pairs=>pairs.length===0))throw Error(`${scene}/${stage}: headphones overlay empty`);
  if(hp.overlay[0].join(',')===hp.overlay[3].join(','))throw Error(`${scene}/${stage}: headphones do not move with body`);
  if(!hp.overlay.some(pairs=>pairs.some((v,i)=>i%2===1&&(v===26||v===242))))throw Error(`${scene}/${stage}: headphones pixels missing`);
}
writeFileSync(new URL('../app/assets/pet-frames.json',import.meta.url),JSON.stringify(all));
console.log(`${Object.keys(all).length-1} character appearance animations (star+block) + fallback exported; 17×23 frames validated`);

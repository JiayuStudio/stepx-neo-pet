import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const all = JSON.parse(readFileSync(process.argv[2] || new URL('../app/assets/pet-frames.json', import.meta.url)));
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const scenes=['idle','eat','play','sleep','happy','pet','hungry'];
const stages=['seedling','bloom','luminary'];
const personalities=['gentle','playful','curious'];
const wearables=['none','star-ribbon','sprout-crown','moon-charm'];
const characters=['star','block'];
for(const character of characters)for(const scene of scenes)for(const stage of stages)for(const personality of personalities)for(const wearable of wearables){
  const key=[character,scene,stage,personality,wearable].join('/'), a=all[key];
  check(!!a, `${key}: appearance is packaged`);
  check(Number.isFinite(a.fps)&&a.fps>0&&a.fps<=5,`${key}: bounded frame rate`);
  check(a.frames.length>=4 && a.frames.every(f=>f.length===391&&f.every(v=>Number.isInteger(v)&&v>=0&&v<=255)),`${key}: valid matrix data`);
  const body=a.frames.map(f=>f.filter((_,i)=>i%17>=2&&i%17<=14&&Math.floor(i/17)>=5&&Math.floor(i/17)<=20));
  check(new Set(body.map(f=>f.join(','))).size>1,`${key}: body moves without incident marker`);
  // 耳机增量条目（hp/角色/…）：与基础帧 diff、非空、随身体动、含黑橙像素
  const hp=all['hp/'+key];
  check(!!hp,`hp/${key}: overlay packaged`);
  check(hp.overlay.length===a.frames.length,`hp/${key}: overlay frame count matches`);
  check(hp.overlay.every(pairs=>pairs.length>=2&&pairs.length%2===0),`hp/${key}: overlay pairs well-formed`);
  check(hp.overlay.every(pairs=>{for(let i=0;i<pairs.length;i+=2){if(pairs[i]<0||pairs[i]>=391||pairs[i+1]<0||pairs[i+1]>255)return false;}return true}),`hp/${key}: overlay bounds valid`);
  check(hp.overlay.some(pairs=>pairs.some((v,i)=>i%2===1&&(v===26||v===242))),`hp/${key}: black-orange headphone pixels present`);
  check(hp.overlay[0].join(',')!==hp.overlay[3].join(','),`hp/${key}: headphones move with body`);
  const applied=a.frames.map((f,i)=>{const out=f.slice();for(let p=0;p+1<hp.overlay[i].length;p+=2)out[hp.overlay[i][p]]=hp.overlay[i][p+1];return out;});
  check(applied[0].join(',')!==a.frames[0].join(','),`hp/${key}: overlay visibly changes frame`);
}
// 星跃：白色竖眼（两眼列在 idle 有 255 亮条）；方跃：深色方眼（眼位为 0）
{
  const star=all['star/idle/seedling/gentle/none'].frames[0];
  const block=all['block/idle/seedling/gentle/none'].frames[0];
  const white=(f)=>f.filter(v=>v===255).length;
  // 星跃：两只 2×3 白竖眼（共 12 格 255），位于脸部两侧（0.3.4 圆团子造型：脸居中稍低）
  check(white(star)===12,`star: two white vertical eyes (${white(star)} lit, expect 12)`);
  const leftEye=[6,7].every(x=>{for(let y=9;y<=11;y++)if(star[y*17+x]!==255)return false;return true});
  const rightEye=[9,10].every(x=>{for(let y=9;y<=11;y++)if(star[y*17+x]!==255)return false;return true});
  check(leftEye&&rightEye,'star: both eyes are 2x3 white bars');
  // 0.3.4：小嘴仅 1~3 像素，位于两眼正下方中央（暗色，不写胡须）
  const mouth=star.filter((v,i)=>Math.floor(i/17)===12&&i%17>=6&&i%17<=10&&v>0&&v<120).length;
  check(mouth>=1&&mouth<=3,`star: tiny mouth is 1 to 3 pixels (${mouth})`);
  // 细暗边：每眼外侧 1 列熄灭（不扩大成大洞）
  check([5,8,11].every(x=>star[9*17+x]<=30),'star: thin dark eye rims');
  const body=star.map((v,i)=>({v,x:i%17,y:Math.floor(i/17)})).filter(p=>p.v>0);
  check(Math.max(...body.map(p=>p.x))-Math.min(...body.map(p=>p.x))+1<=13 && Math.max(...body.map(p=>p.y))-Math.min(...body.map(p=>p.y))+1<=15,'star: compact body fits 13 by 15 cells');
  for(const stage of stages){const frames=all['star/idle/'+stage+'/gentle/none'].frames;
    for(let i=0;i<frames.length;i++)check(white(frames[i])===(i===5?4:12),'star: both eyes survive every growth and blink frame');
  }
  check([6,7,9,10].every(x=>block[9*17+x]===0&&block[10*17+x]===0),'block: two visible 2 by 2 dark eyes');
  check(white(block)===0,`block: dark square eyes, no white bars (${white(block)})`);
  check(star.join(',')!==block.join(','),'star and block silhouettes differ');
}
// 蛋阶段三场景 × 两角色：键存在、有动画、裂纹递增、破壳露雏形
for(const scene of ['egg','crack','hatch'])for(const character of ['star','block']){
  const a=all[scene+'/'+character];
  check(!!a,`${scene}/${character}: egg appearance packaged`);
  check(a.frames.length>=4 && a.frames.every(f=>f.length===391&&f.every(v=>Number.isInteger(v)&&v>=0&&v<=255)),`${scene}/${character}: valid matrix data`);
  check(new Set(a.frames.map(f=>f.join(','))).size>1,`${scene}/${character}: egg animation moves`);
}
{
  const intact=all['egg/star'].frames[0].filter(v=>v>0).length;
  const cracked=all['crack/star'].frames[7].filter(v=>v===0).length;
  check(cracked>0,'crack frames contain crack pixels');
  const hatch=all['hatch/star'].frames[5];
  check(hatch.filter(v=>v>0).length>0,'hatch frame shows shell and baby');
}
const base=all['star/idle/seedling/gentle/none'].frames[0];
for(const wearable of wearables.slice(1)){
  const f=all[`star/idle/seedling/gentle/${wearable}`].frames[0];
  check(f.some((v,i)=>v!==base[i]),`${wearable}: visible wearable`);
}
check(JSON.stringify(all.idle)===JSON.stringify(all['star/idle/seedling/gentle/none']),'fallback matches star seedling');
console.log(`${checks} packaged 0.3.4 character appearance and animation checks passed`);

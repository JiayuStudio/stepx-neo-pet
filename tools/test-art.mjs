import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const all = JSON.parse(readFileSync(process.argv[2] || new URL('../app/assets/pet-frames.json', import.meta.url)));
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const scenes=['idle','eat','play','sleep','happy','pet','hungry'];
const stages=['seedling','bloom','luminary'];
const personalities=['gentle','playful','curious'];
const wearables=['none','star-ribbon','sprout-crown','moon-charm'];
for(const scene of scenes)for(const stage of stages)for(const personality of personalities)for(const wearable of wearables){
  const key=[scene,stage,personality,wearable].join('/'), a=all[key];
  check(!!a, `${key}: appearance is packaged`);
  check(Number.isFinite(a.fps)&&a.fps>0&&a.fps<=5,`${key}: bounded frame rate`);
  check(a.frames.length>=4 && a.frames.every(f=>f.length===391&&f.every(v=>Number.isInteger(v)&&v>=0&&v<=255)),`${key}: valid matrix data`);
  const body=a.frames.map(f=>f.filter((_,i)=>i%17>=2&&i%17<=14&&Math.floor(i/17)>=5&&Math.floor(i/17)<=20));
  check(new Set(body.map(f=>f.join(','))).size>1,`${key}: body moves without incident marker`);
}
const base=all['idle/seedling/gentle/none'].frames[0];
for(const wearable of wearables.slice(1)){
  const f=all[`idle/seedling/gentle/${wearable}`].frames[0];
  check(f.some((v,i)=>v!==base[i]),`${wearable}: visible wearable`);
}
const bow=all['idle/seedling/gentle/star-ribbon'].frames[0];
check(bow.filter((v,i)=>v!==base[i]&&i%17<=7&&Math.floor(i/17)<=9).length>=4,'bow stays on upper-left of head');
for(const stage of stages.slice(1))check(all[`idle/${stage}/gentle/none`].frames[0].some((v,i)=>v!==base[i]&&i%17>1&&i%17<15),'growth changes body, not only edge markers');
check(JSON.stringify(all.idle)===JSON.stringify(all['idle/seedling/gentle/none']),'fallback matches Mori');
console.log(`${checks} packaged Mori appearance and animation checks passed`);

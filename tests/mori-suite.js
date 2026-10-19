var checks=0;
function check(ok,label){if(!ok)throw new Error('FAIL: '+label);checks++;}
var now=1790000000000;Date.now=function(){return now;};
function boot(patch){var s=save.freshSnapshot(now);Object.keys(patch||{}).forEach(function(k){s[k]=patch[k];});initGame(JSON.stringify(s),'');return state;}
function act(name,args){return JSON.parse(dispatchGame(name,JSON.stringify(args||[])));}
function throws(fn){try{fn();return false;}catch(e){return true;}}
initGame('',JSON.stringify({satiety:81,mood:68,energy:70,intimacy:7,updatedAt:now}));
check(state.bond===7&&state.needs.hunger===81,'legacy needs and bond migrated');
check(state.petName==='星跃'&&state.character==='star'&&state.headphones===false,'legacy default name migrates to current character');

/* ---- 0.3.3 角色 / 耳机 / 默认名迁移回归 ---- */
boot();act('setCharacter',['block']);
check(state.character==='block'&&state.petName==='方跃','character switch renames untouched default name');
boot({petName:'阿橘'});act('setCharacter',['block']);
check(state.petName==='阿橘','custom name survives character switch');
boot({petName:'阿橘'});var keep=state.petName;
check(state.petName===keep,'custom name preserved on reload');
boot({petName:'点点',character:'block'});
check(state.petName==='方跃','known default 点点 migrates with existing character');
boot({petName:'星跃',character:'block'});
check(state.petName==='方跃','other-character default name migrates');
boot({petName:'Mori',character:'star'});
check(state.petName==='星跃','Mori default migrates to star name');
act('setHeadphones',[true]);
check(state.headphones===true,'headphones toggle on');
act('setHeadphones',[false]);
check(state.headphones===false,'headphones toggle off');
check(throws(function(){act('setCharacter',['dragon']);}),'invalid character rejected');
act('setCharacter',['block']);act('setHeadphones',[true]);
var hpExport=act('exportSave').result.contents;
boot();check(act('importSave',[hpExport]).result.ok&&state.character==='block'&&state.headphones===true,'backup round trip keeps character and headphones');
initGame('',JSON.stringify({satiety:81,mood:68,energy:70,intimacy:7,updatedAt:now})); /* 还原 legacy 初始状态，后续断言沿用 */
check(state.needs.health===92&&state.needs.hygiene===84,'new needs initialized');
var before=state.needs.hygiene;act('care',['wash']);check(state.needs.hygiene===100&&state.needs.joy===72,'wash rules retained');
check(state.growthPoints===4,'first care growth');act('care',['feed']);check(state.growthPoints===4,'care growth cooldown');
now+=60000;act('care',['cuddle']);check(state.growthPoints===8,'care growth after cooldown');
boot();now+=60000;act('tick');check(Math.abs(state.needs.hunger-(78-.55*.58))<.00001,'cozy time decay');
var timestamp=state.lastUpdated,hunger=state.needs.hunger;now-=30000;act('tick');check(state.lastUpdated===timestamp&&state.needs.hunger===hunger,'clock rollback');now=timestamp;
boot();now+=86400000*7;act('tick');check(state.needs.hunger===18&&state.needs.energy===18&&state.needs.health>0,'cozy long absence floors');
boot({mode:'classic'});now+=60000;act('tick');check(Math.abs(state.needs.hunger-77.45)<.00001,'classic time decay');
boot();now+=120000;act('tick');check(state.activeIncident!==null,'timed incident');
var incident=state.activeIncident.id;act('care',[progression.INCIDENT_BY_ID[incident].action]);check(state.activeIncident===null&&state.sparks===8&&state.growthPoints===14,'incident resolution reward');
check(state.nextIncidentAt>now,'incident rescheduled');
boot();act('completeActivity',['star-catch',40]);check(state.sparks===20&&state.growthPoints===6&&state.activityBest['star-catch']===40,'arcade score reward');
act('completeActivity',['memory-flip',20]);check(state.sparks===30&&state.growthPoints===6,'daily growth capped across games');
act('purchaseKeepsake',['star-ribbon']);check(state.sparks===16&&state.ownedItemIds[0]==='star-ribbon','purchase');
act('purchaseKeepsake',['star-ribbon']);check(state.sparks===16,'no duplicate payment');
act('toggleKeepsake',['star-ribbon']);check(state.equippedWearable==='star-ribbon','equip');
act('toggleKeepsake',['moon-charm']);check(state.equippedWearable==='star-ribbon','cannot equip unowned');
var exported=act('exportSave').result.contents;boot();check(act('importSave',[exported]).result.ok&&state.equippedWearable==='star-ribbon'&&state.sparks===16,'backup round trip');
var saveBefore=JSON.stringify(state);check(!act('importSave',['not JSON']).result.ok&&JSON.stringify(state)===saveBefore,'invalid import preserves save');
check(!act('importSave',[new Array(200002).join('x')]).result.ok,'oversize backup rejected');
boot();check(throws(function(){act('chooseStory',[0]);act('chooseStory',[0]);act('chooseStory',[0]);}),'locked story cannot be advanced');
boot();act('chooseStory',[0]);check(state.storyIndex===1&&state.growthPoints===12&&state.bond===12,'story choice rewards');
check(progression.getGrowthStage(120).id==='bloom'&&progression.getGrowthStage(320).id==='luminary','growth stages');
boot();act('completeActivity',['star-catch',1000000]);check(state.activityBest['star-catch']===100&&state.sparks===50,'score clamped');
check(throws(function(){act('care',['bad']);})&&throws(function(){act('constructor',[]);}), 'bridge actions validated');
check(throws(function(){act('setTheme',['remote']);})&&throws(function(){act('setMode',['unknown']);}),'invalid modes rejected');
boot();act('completeActivity',['memory-flip',20]);now+=86400000;act('completeActivity',['memory-flip',20]);check(state.growthPoints===12&&state.playStreak===2,'next-day growth and streak');

/* ---- 0.3.3 孵化回归（可控时钟，不实际等待） ---- */
initGame('',''); // 全新存档
check(state.egg!==null&&state.hatched===false&&state.egg.durationMs===60000,'new save starts as egg (60s)');
check(progression.eggPhase(state.egg,state.hatched,now)==='egg','phase egg at 0s');
now+=49999;act('tick');
check(progression.eggPhase(state.egg,state.hatched,now)==='egg','still egg at 49.999s');
now+=1;act('tick');
check(progression.eggPhase(state.egg,state.hatched,now)==='crack','crack at 50s');
now+=7999;act('tick');
check(progression.eggPhase(state.egg,state.hatched,now)==='crack','still crack at 57.999s');
now+=1;act('tick');
check(progression.eggPhase(state.egg,state.hatched,now)==='hatch','hatch at 58s');
now+=2000;act('tick');
check(state.hatched===true&&state.egg===null,'hatched at 60s (timestamp settled)');
check(progression.eggPhase(null,true,now)==='hatched','phase hatched after');
// 破壳不重置成长与角色
boot({egg:{startedAt:now,durationMs:60000},hatched:false,character:'block',growthPoints:40});
act('setHeadphones',[true]);now+=60000;act('tick');
check(state.hatched===true&&state.character==='block'&&state.headphones===true&&state.growthPoints===40,'hatching keeps character/headphones/growth');
// 切换角色不重置孵化
boot({egg:{startedAt:now,durationMs:60000},hatched:false});
var eggRef=state.egg;act('setCharacter',['block']);
check(state.egg===eggRef&&state.hatched===false,'character switch does not reset egg');
// 旧存档（无 egg 字段）视作已孵化
initGame(JSON.stringify({petName:'阿橘',needs:{hunger:60,joy:60,hygiene:60,energy:60,health:60},bond:9,growthPoints:30,character:'star',lastUpdated:now}),'');
check(state.hatched===true&&state.egg===null&&state.growthPoints===30,'legacy save treated as hatched');
// 导出导入保留孵化中状态
boot({egg:{startedAt:now,durationMs:60000},hatched:false});
var eggBackup=act('exportSave').result.contents;boot();
check(act('importSave',[eggBackup]).result.ok&&state.hatched===false&&state.egg!==null,'backup round trip keeps egg ok='+act('importSave',[eggBackup]).result.ok);
// 安抚只在蛋阶段有效
boot({egg:{startedAt:now,durationMs:60000},hatched:false});
act('sootheEgg');
check(state.eggSoothedAt===now&&state.hatched===false&&state.lastReply!==null,'soothe egg records feedback without hatching');
boot({egg:null,hatched:true});var beforeSoothe=state.actionNonce;act('sootheEgg');
check(state.actionNonce===beforeSoothe,'soothe on hatched is a no-op');
check(throws(function(){act('sootheEgg',['x']);})===false,'sootheEgg takes no args');
function testResult(){return JSON.stringify({passed:checks,engine:'Rhino/headless Mori',upstreamModules:6});}

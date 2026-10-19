var checks=0;
function check(ok,label){if(!ok)throw new Error('FAIL: '+label);checks++;}
var now=1790000000000;Date.now=function(){return now;};
function boot(patch){var s=save.freshSnapshot(now);Object.keys(patch||{}).forEach(function(k){s[k]=patch[k];});initGame(JSON.stringify(s),'');return state;}
function act(name,args){return JSON.parse(dispatchGame(name,JSON.stringify(args||[])));}
function throws(fn){try{fn();return false;}catch(e){return true;}}
initGame('',JSON.stringify({satiety:81,mood:68,energy:70,intimacy:7,updatedAt:now}));
check(state.bond===7&&state.needs.hunger===81&&state.petName==='点点','legacy needs and bond migrated');
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
function testResult(){return JSON.stringify({passed:checks,engine:'Rhino/headless Mori',upstreamModules:6});}

var game = require('store').useGameStore;
var save = require('save');
var progression = require('progression');
var stories = require('stories');
var allowed = ['tick','care','completeActivity','chooseStory','purchaseKeepsake','toggleKeepsake','openStory','closeStory','setTheme','setMode','exportSave','importSave','reset'];
function initGame(saved, legacy) {
  var snapshot = saved ? save.normalizeSnapshot(JSON.parse(saved)) : save.freshSnapshot();
  if (!saved) {
    snapshot.petName = '点点';
    snapshot.themeId = 'moss';
    snapshot.storyOpen = false;
    if (legacy) {
      var old = JSON.parse(legacy);
      snapshot.needs.hunger = old.satiety;
      snapshot.needs.joy = old.mood;
      snapshot.needs.energy = old.energy;
      snapshot.bond = old.intimacy;
      snapshot.lastUpdated = old.updatedAt;
      snapshot = save.normalizeSnapshot(snapshot);
    }
  }
  game.setState(snapshot);
  game.getState().tick();
  return JSON.stringify(game.getState());
}
function snapshotGame() { game.getState().tick(); return JSON.stringify(game.getState()); }
function dispatchGame(action, argumentsJson) {
  if (allowed.indexOf(action) < 0) throw new Error('不支持的操作');
  var args = JSON.parse(argumentsJson);
  if (!Array.isArray(args) || args.length > 2) throw new Error('操作参数错误');
  if (action === 'care' && !progression.CARE_TRAIT[args[0]]) throw new Error('照料方式错误');
  if (action === 'setMode' && ['cozy','classic'].indexOf(args[0]) < 0) throw new Error('模式错误');
  if (action === 'setTheme' && ['sakura','cyber','moss','moon'].indexOf(args[0]) < 0) throw new Error('主题错误');
  if (action === 'completeActivity' && ['star-catch','memory-flip'].indexOf(args[0]) < 0) throw new Error('游戏类型错误');
  if (action === 'chooseStory' && !stories.isStoryUnlocked(state.storyIndex, state.bond)) throw new Error('这段回忆尚未解锁');
  var result = game.getState()[action].apply(null, args);
  if (action === "reset") game.setState({petName:"点点",storyOpen:false});
  return JSON.stringify({ snapshot: game.getState(), result: result === undefined ? null : result });
}

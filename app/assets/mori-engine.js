// Native host for Mori's unmodified MIT game rules. No browser or timer required.
var state, factory;
function create() {
  return function (initializer) {
    function get() { return state; }
    function set(change) {
      var patch = typeof change === 'function' ? change(state) : change;
      state = Object.assign({}, state, patch);
    }
    state = initializer(set, get);
    return { getState: get, setState: set };
  };
}
function persist(initializer) { return initializer; }
var modules = {}, loaded = {};
function require(id) {
  if (id === 'zustand') return { create: create };
  if (id === 'zustand/middleware') return { persist: persist };
  id = id.replace(/^\.\//, '');
  if (loaded[id]) return loaded[id].exports;
  var module = { exports: {} };
  loaded[id] = module;
  if (!modules[id]) throw new Error('Unknown module: ' + id);
  modules[id](module, module.exports, require);
  return module.exports;
}
if (!Object.fromEntries) Object.fromEntries = function (entries) {
  var result = {};
  entries.forEach(function (entry) { result[entry[0]] = entry[1]; });
  return result;
};

modules["types"] = function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMood = exports.clampNeed = void 0;
var clampNeed = function (value) { return Math.max(0, Math.min(100, value)); };
exports.clampNeed = clampNeed;
var getMood = function (needs) {
    if (needs.health < 30)
        return 'unwell';
    if (needs.energy < 24)
        return 'sleepy';
    if (needs.hunger < 28)
        return 'peckish';
    if (needs.joy < 28 || needs.hygiene < 22)
        return 'grumpy';
    var average = Object.values(needs).reduce(function (sum, value) { return sum + value; }, 0) / 5;
    return average > 88 ? 'radiant' : average > 64 ? 'happy' : 'peckish';
};
exports.getMood = getMood;

};

modules["progression"] = function(module, exports, require) {
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEquippable = exports.canPurchaseKeepsake = exports.scheduleIncidentAfterResolution = exports.settleTimedState = exports.clampPercent = exports.selectIncidentId = exports.getIncidentDelayMs = exports.utcDateKey = exports.getGrowthProgress = exports.getGrowthStage = exports.applyTraitAward = exports.getDominantPersonality = exports.isKeepsakeId = exports.isIncidentId = exports.isPersonalityId = exports.KEEPSAKE_BY_ID = exports.INCIDENT_BY_ID = exports.KEEPSAKE_IDS = exports.INCIDENT_IDS = exports.PERSONALITY_IDS = exports.CARE_TRAIT = exports.KEEPSAKES = exports.INCIDENTS = exports.GROWTH_STAGES = exports.PERSONALITIES = exports.INCIDENT_REWARD_GROWTH = exports.INCIDENT_REWARD_SPARKS = exports.CARE_GROWTH_COOLDOWN_MS = exports.INITIAL_INCIDENT_DELAY_MS = exports.isCharacterId = exports.DEFAULT_CHARACTER_NAMES = exports.CHARACTERS = exports.EGG_HATCH_MS = exports.EGG_CRACK_MS = exports.EGG_DURATION_MS = exports.MINUTE_MS = void 0;
exports.eggPhase = eggPhase;
exports.MINUTE_MS = 60000;
exports.EGG_DURATION_MS = 60000; // 新领养默认 60 秒孵化
exports.EGG_CRACK_MS = 50000; // 前 50 秒完好的蛋逐渐裂纹
exports.EGG_HATCH_MS = 58000; // 最后段破壳动画
exports.CHARACTERS = ['star', 'block'];
exports.DEFAULT_CHARACTER_NAMES = { star: '星跃', block: '方跃' };
var isCharacterId = function (value) {
    return typeof value === 'string' && exports.CHARACTERS.includes(value);
};
exports.isCharacterId = isCharacterId;
exports.INITIAL_INCIDENT_DELAY_MS = 2 * exports.MINUTE_MS;
exports.CARE_GROWTH_COOLDOWN_MS = exports.MINUTE_MS;
exports.INCIDENT_REWARD_SPARKS = 8;
exports.INCIDENT_REWARD_GROWTH = 10;
exports.PERSONALITIES = [
    { id: 'gentle', name: 'Gentle', glyph: '♥', description: 'Patient care leaves a warm, steady glow.' },
    { id: 'playful', name: 'Playful', glyph: '✦', description: 'Games and bright surprises make Mori sparkle.' },
    { id: 'curious', name: 'Curious', glyph: '↗', description: 'Discovery and thoughtful rituals open new paths.' },
];
exports.GROWTH_STAGES = [
    { id: 'seedling', name: 'Seedling', minimum: 0, nextAt: 120 },
    { id: 'bloom', name: 'Bloom', minimum: 120, nextAt: 320 },
    { id: 'luminary', name: 'Luminary', minimum: 320, nextAt: null },
];
exports.INCIDENTS = [
    { id: 'static-cloud', title: 'A Static Cloud', glyph: '⌁', story: 'A fuzzy little storm is following Mori around the room.', action: 'cuddle' },
    { id: 'tangled-sprout', title: 'The Tangled Sprout', glyph: '≈', story: 'Silver garden threads have wrapped around Mori’s paws.', action: 'wash' },
    { id: 'wandering-signal', title: 'A Wandering Signal', glyph: '◇', story: 'A tiny signal is calling from just beyond the pocket world.', action: 'explore' },
];
exports.KEEPSAKES = [
    { id: 'star-ribbon', name: 'Star Ribbon', glyph: '✦', category: 'wearable', cost: 14, description: 'A bright bow for playful days.' },
    { id: 'sprout-crown', name: 'Sprout Crown', glyph: '♧', category: 'wearable', cost: 24, description: 'Two brave leaves grown from a memory.' },
    { id: 'moon-charm', name: 'Moon Charm', glyph: '☾', category: 'wearable', cost: 36, description: 'A quiet orbit worn close to the heart.' },
    { id: 'memory-lantern', name: 'Memory Lantern', glyph: '□', category: 'room', cost: 18, description: 'Keeps one soft story glowing nearby.' },
    { id: 'tiny-garden', name: 'Tiny Garden', glyph: '❋', category: 'room', cost: 30, description: 'A pocket patch of impossible flowers.' },
    { id: 'dream-mobile', name: 'Dream Mobile', glyph: '⋆', category: 'room', cost: 48, description: 'Catches sleepy signals above the room.' },
];
exports.CARE_TRAIT = {
    feed: 'gentle',
    play: 'playful',
    wash: 'curious',
    rest: 'gentle',
    cuddle: 'gentle',
    explore: 'curious',
};
exports.PERSONALITY_IDS = exports.PERSONALITIES.map(function (_a) {
    var id = _a.id;
    return id;
});
exports.INCIDENT_IDS = exports.INCIDENTS.map(function (_a) {
    var id = _a.id;
    return id;
});
exports.KEEPSAKE_IDS = exports.KEEPSAKES.map(function (_a) {
    var id = _a.id;
    return id;
});
exports.INCIDENT_BY_ID = Object.fromEntries(exports.INCIDENTS.map(function (incident) { return [incident.id, incident]; }));
exports.KEEPSAKE_BY_ID = Object.fromEntries(exports.KEEPSAKES.map(function (item) { return [item.id, item]; }));
var isPersonalityId = function (value) { return typeof value === 'string' && exports.PERSONALITY_IDS.includes(value); };
exports.isPersonalityId = isPersonalityId;
var isIncidentId = function (value) { return typeof value === 'string' && exports.INCIDENT_IDS.includes(value); };
exports.isIncidentId = isIncidentId;
var isKeepsakeId = function (value) { return typeof value === 'string' && exports.KEEPSAKE_IDS.includes(value); };
exports.isKeepsakeId = isKeepsakeId;
var getDominantPersonality = function (scores, focus) {
    var _a;
    var highest = Math.max.apply(Math, __spreadArray([], __read(exports.PERSONALITY_IDS.map(function (id) { return scores[id]; })), false));
    if (scores[focus] === highest)
        return focus;
    return (_a = exports.PERSONALITY_IDS.find(function (id) { return scores[id] === highest; })) !== null && _a !== void 0 ? _a : 'gentle';
};
exports.getDominantPersonality = getDominantPersonality;
var applyTraitAward = function (scores, trait, amount) {
    var reduction = amount / 2;
    return {
        gentle: Math.max(1, scores.gentle + (trait === 'gentle' ? amount : -reduction)),
        playful: Math.max(1, scores.playful + (trait === 'playful' ? amount : -reduction)),
        curious: Math.max(1, scores.curious + (trait === 'curious' ? amount : -reduction)),
    };
};
exports.applyTraitAward = applyTraitAward;
var getGrowthStage = function (points) {
    if (points >= 320)
        return exports.GROWTH_STAGES[2];
    if (points >= 120)
        return exports.GROWTH_STAGES[1];
    return exports.GROWTH_STAGES[0];
};
exports.getGrowthStage = getGrowthStage;
var getGrowthProgress = function (points) {
    var stage = (0, exports.getGrowthStage)(points);
    if (stage.nextAt === null)
        return { stage: stage, percent: 100, remaining: 0 };
    var range = stage.nextAt - stage.minimum;
    var progress = Math.max(0, points - stage.minimum);
    return { stage: stage, percent: Math.min(100, progress / range * 100), remaining: Math.max(0, stage.nextAt - points) };
};
exports.getGrowthProgress = getGrowthProgress;
var utcDateKey = function (timestamp) { return new Date(timestamp).toISOString().slice(0, 10); };
exports.utcDateKey = utcDateKey;
var getIncidentDelayMs = function (seed) { return (12 + Math.abs(Math.trunc(seed)) % 7) * exports.MINUTE_MS; };
exports.getIncidentDelayMs = getIncidentDelayMs;
var selectIncidentId = function (seed) { return exports.INCIDENTS[Math.abs(Math.trunc(seed)) % exports.INCIDENTS.length].id; };
exports.selectIncidentId = selectIncidentId;
var clampPercent = function (value) { return Math.max(0, Math.min(100, value)); };
exports.clampPercent = clampPercent;
var settleTimedState = function (state, sampledNow) {
    var _a;
    var now = Math.max(state.lastUpdated, sampledNow);
    // 0.3.3 孵化计时（真实时间戳）：到点破壳，离开前台 / 锁屏 / 重启后一致
    var hatchSettled = !state.hatched && state.egg !== null && state.egg !== undefined && now >= state.egg.startedAt + state.egg.durationMs;
    var rawMinutes = Math.max(0, (now - state.lastUpdated) / exports.MINUTE_MS);
    var elapsedMinutes = state.mode === 'cozy' ? Math.min(rawMinutes, 12 * 60) : rawMinutes;
    var pace = state.mode === 'cozy' ? 0.58 : 1;
    var floor = state.mode === 'cozy' ? 18 : 0;
    var hunger = Math.max(floor, state.needs.hunger - elapsedMinutes * 0.55 * pace);
    var joy = Math.max(floor, state.needs.joy - elapsedMinutes * 0.38 * pace);
    var hygiene = Math.max(floor, state.needs.hygiene - elapsedMinutes * 0.28 * pace);
    var energy = Math.max(floor, state.needs.energy - elapsedMinutes * 0.32 * pace);
    var struggling = hunger < 18 || hygiene < 16;
    var healthDelta = elapsedMinutes * (struggling ? -0.4 : 0.08) * pace;
    var health = (0, exports.clampPercent)(state.needs.health + healthDelta);
    var activeIncident = state.activeIncident;
    var nextIncidentAt = state.nextIncidentAt;
    if (activeIncident) {
        var penaltyStart = Math.max(activeIncident.lastPenaltyAt, state.lastUpdated);
        var penaltyMinutes = Math.min(60, Math.max(0, (now - penaltyStart) / exports.MINUTE_MS));
        if (state.mode === 'classic')
            health = (0, exports.clampPercent)(health - penaltyMinutes * 0.12);
        activeIncident = __assign(__assign({}, activeIncident), { lastPenaltyAt: Math.max(activeIncident.lastPenaltyAt, now) });
        nextIncidentAt = null;
    }
    else if (nextIncidentAt !== null && now >= nextIncidentAt) {
        var seed = state.actionNonce + state.storyIndex + Math.floor(state.ageMinutes + rawMinutes) + state.ownedItemIds.length;
        activeIncident = { id: (0, exports.selectIncidentId)(seed), startedAt: now, lastPenaltyAt: now };
        nextIncidentAt = null;
    }
    return {
        needs: { hunger: hunger, joy: joy, hygiene: hygiene, energy: energy, health: health },
        lastUpdated: now,
        ageMinutes: state.ageMinutes + rawMinutes,
        activeIncident: activeIncident,
        nextIncidentAt: nextIncidentAt,
        egg: hatchSettled ? null : ((_a = state.egg) !== null && _a !== void 0 ? _a : null),
        hatched: hatchSettled ? true : state.hatched === true
    };
};
exports.settleTimedState = settleTimedState;
var scheduleIncidentAfterResolution = function (now, actionNonce, storyIndex, incidentId, ownedItemCount) {
    var incidentIndex = exports.INCIDENT_IDS.indexOf(incidentId);
    var seed = actionNonce + storyIndex + Math.max(0, incidentIndex) + ownedItemCount;
    return now + (0, exports.getIncidentDelayMs)(seed);
};
exports.scheduleIncidentAfterResolution = scheduleIncidentAfterResolution;
var canPurchaseKeepsake = function (sparks, owned, itemId) {
    var item = exports.KEEPSAKE_BY_ID[itemId];
    return !owned.includes(itemId) && sparks >= item.cost;
};
exports.canPurchaseKeepsake = canPurchaseKeepsake;
var isEquippable = function (owned, itemId, category) { return (owned.includes(itemId) && exports.KEEPSAKE_BY_ID[itemId].category === category); };
exports.isEquippable = isEquippable;
/** 蛋阶段判定（真实时间戳，离开前台 / 锁屏 / 重启后一致） */
function eggPhase(egg, hatched, now) {
    if (hatched || !egg)
        return 'hatched';
    var elapsed = Math.max(0, now - egg.startedAt);
    if (elapsed >= egg.durationMs)
        return 'hatched';
    if (elapsed >= exports.EGG_HATCH_MS)
        return 'hatch';
    if (elapsed >= exports.EGG_CRACK_MS)
        return 'crack';
    return 'egg';
}

};

modules["stories"] = function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStoryUnlocked = exports.getStoryBondRequirement = exports.STORY_COUNT = exports.STORY_EVENTS = void 0;
exports.STORY_EVENTS = [
    {
        eyebrow: 'A SMALL BEGINNING',
        title: 'Something is tapping from inside the shell…',
        body: 'Two bright eyes appear. The little creature waits for the first sound of its new life.',
        choices: [
            { label: 'Hum a soft hello', reply: 'Mori sways to the tune and remembers it.', bond: 8, joy: 10, trait: 'gentle' },
            { label: 'Tap back twice', reply: 'Tap. Tap. A secret greeting is born.', bond: 6, joy: 14, trait: 'playful' },
        ],
    },
    {
        eyebrow: 'STORY 01 · THE LOST LIGHT',
        title: 'A tiny light falls from the sky.',
        body: 'Mori cups the flickering spark. It could warm the room—or guide another creature home.',
        choices: [
            { label: 'Hang it by the window', reply: 'The room glows like a remembered summer.', bond: 9, joy: 6, trait: 'gentle' },
            { label: 'Send it home', reply: 'Far away, another pocket world blinks thank you.', bond: 12, joy: 4, trait: 'curious' },
        ],
    },
    {
        eyebrow: 'STORY 02 · RAIN MUSIC',
        title: 'The rain has forgotten its rhythm.',
        body: 'Drops hover silently above the garden. Mori looks to you for the missing beat.',
        choices: [
            { label: 'Dance the rhythm', reply: 'The rain tumbles down in a laughing chorus.', bond: 10, joy: 12, trait: 'playful' },
            { label: 'Listen together', reply: 'In the quiet, the rain finds its own song.', bond: 14, joy: 7, trait: 'curious' },
        ],
    },
    {
        eyebrow: 'STORY 03 · THE PAPER GARDEN',
        title: 'A folded flower will not open.',
        body: 'Mori found it tucked under the room’s floorboards. The creases still remember another pair of hands.',
        choices: [
            { label: 'Fold a friend for it', reply: 'Two paper flowers lean together and finally bloom.', bond: 11, joy: 11, trait: 'playful' },
            { label: 'Trace every crease', reply: 'Mori learns the old pattern and keeps it safe.', bond: 15, joy: 5, trait: 'curious' },
            { label: 'Warm it patiently', reply: 'Held close, the paper softens and opens on its own.', bond: 13, joy: 8, trait: 'gentle' },
        ],
    },
    {
        eyebrow: 'STORY 04 · THE LONG SIGNAL',
        title: 'A voice from an older pocket world.',
        body: 'The device hums with a message recorded long before Mori hatched. It is asking whether anyone is still listening.',
        choices: [
            { label: 'Answer with your song', reply: 'Mori sends back the very first hum you shared.', bond: 16, joy: 10, trait: 'gentle' },
            { label: 'Map where it came from', reply: 'Mori sketches a route toward a world nobody has visited.', bond: 14, joy: 8, trait: 'curious' },
            { label: 'Reply in secret taps', reply: 'Tap. Tap. The old signal laughs and taps back.', bond: 12, joy: 15, trait: 'playful' },
        ],
    },
];
exports.STORY_COUNT = exports.STORY_EVENTS.length;
var getStoryBondRequirement = function (storyIndex) { return storyIndex * 10 + 4; };
exports.getStoryBondRequirement = getStoryBondRequirement;
var isStoryUnlocked = function (storyIndex, bond) { return (storyIndex < exports.STORY_COUNT && bond >= (0, exports.getStoryBondRequirement)(storyIndex)); };
exports.isStoryUnlocked = isStoryUnlocked;

};

modules["save"] = function(module, exports, require) {
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSnapshot = exports.freshSnapshot = void 0;
var progression_1 = require("./progression");
var stories_1 = require("./stories");
var MODES = ['cozy', 'classic'];
var THEMES = ['sakura', 'cyber', 'moss', 'moon'];
var MINI_GAMES = ['star-catch', 'memory-flip'];
var ACTIONS = ['feed', 'play', 'wash', 'rest', 'cuddle', 'explore', 'story', 'activity', 'workshop', null];
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
var isRecord = function (value) { return typeof value === 'object' && value !== null && !Array.isArray(value); };
var finite = function (value, fallback) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; };
var bounded = function (value, fallback, minimum, maximum) { return Math.max(minimum, Math.min(maximum, finite(value, fallback))); };
var integer = function (value, fallback, minimum, maximum) { return Math.floor(bounded(value, fallback, minimum, maximum)); };
var validDate = function (value, now) {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value))
        return null;
    var timestamp = Date.parse("".concat(value, "T00:00:00Z"));
    if (!Number.isFinite(timestamp))
        return null;
    var exactDate = new Date(timestamp).toISOString().slice(0, 10);
    return exactDate === value && value <= (0, progression_1.utcDateKey)(now) ? value : null;
};
var validTimestamp = function (value, fallback, now, futureLimit) {
    if (futureLimit === void 0) { futureLimit = now; }
    return bounded(value, fallback, 0, futureLimit);
};
var freshSnapshot = function (now) {
    if (now === void 0) { now = Date.now(); }
    return ({
        petName: progression_1.DEFAULT_CHARACTER_NAMES.star,
        character: 'star',
        headphones: false,
        egg: { startedAt: now, durationMs: progression_1.EGG_DURATION_MS },
        hatched: false,
        eggSoothedAt: null,
        needs: { hunger: 78, joy: 72, hygiene: 84, energy: 76, health: 92 },
        bond: 4,
        ageMinutes: 0,
        mode: 'cozy',
        themeId: 'sakura',
        lastUpdated: now,
        lastAction: null,
        actionNonce: 0,
        storyIndex: 0,
        storyOpen: true,
        lastReply: null,
        sparks: 0,
        playStreak: 0,
        lastActivityDate: null,
        activityBest: { 'star-catch': 0, 'memory-flip': 0 },
        personalityScores: { gentle: 1, playful: 1, curious: 1 },
        personalityFocus: 'gentle',
        growthPoints: 0,
        growthCooldownUntil: now,
        lastGrowthActivityDate: null,
        activeIncident: null,
        nextIncidentAt: now + progression_1.INITIAL_INCIDENT_DELAY_MS,
        ownedItemIds: [],
        equippedWearable: null,
        equippedRoomItem: null,
    });
};
exports.freshSnapshot = freshSnapshot;
var normalizeNeeds = function (value, fallback) {
    var needs = isRecord(value) ? value : {};
    return {
        hunger: bounded(needs.hunger, fallback.hunger, 0, 100),
        joy: bounded(needs.joy, fallback.joy, 0, 100),
        hygiene: bounded(needs.hygiene, fallback.hygiene, 0, 100),
        energy: bounded(needs.energy, fallback.energy, 0, 100),
        health: bounded(needs.health, fallback.health, 0, 100),
    };
};
var normalizeActivityBest = function (value) {
    var best = isRecord(value) ? value : {};
    return Object.fromEntries(MINI_GAMES.map(function (id) { return [id, integer(best[id], 0, 0, 1000000)]; }));
};
var normalizeScores = function (value) {
    var scores = isRecord(value) ? value : {};
    return {
        gentle: bounded(scores.gentle, 1, 1, 999),
        playful: bounded(scores.playful, 1, 1, 999),
        curious: bounded(scores.curious, 1, 1, 999),
    };
};
var normalizeOwnedItems = function (value) {
    if (!Array.isArray(value))
        return [];
    return __spreadArray([], __read(new Set(value.filter(progression_1.isKeepsakeId))), false);
};
var normalizeIncident = function (value, now) {
    if (!isRecord(value) || !(0, progression_1.isIncidentId)(value.id))
        return null;
    var startedAt = finite(value.startedAt, Number.NaN);
    var lastPenaltyAt = finite(value.lastPenaltyAt, Number.NaN);
    if (!Number.isFinite(startedAt) || !Number.isFinite(lastPenaltyAt) || startedAt < 0 || startedAt > now)
        return null;
    return {
        id: value.id,
        startedAt: startedAt,
        lastPenaltyAt: Math.max(startedAt, Math.min(now, lastPenaltyAt)),
    };
};
var normalizeEquipment = function (value, owned, category) {
    if (!(0, progression_1.isKeepsakeId)(value) || !owned.includes(value))
        return null;
    return progression_1.KEEPSAKE_BY_ID[value].category === category ? value : null;
};
var normalizeSnapshot = function (value, now) {
    if (now === void 0) { now = Date.now(); }
    var fresh = (0, exports.freshSnapshot)(now);
    var source = isRecord(value) ? value : {};
    var needs = normalizeNeeds(source.needs, fresh.needs);
    var bond = bounded(source.bond, fresh.bond, 0, 100);
    var storyIndex = integer(source.storyIndex, 0, 0, stories_1.STORY_COUNT);
    var ownedItemIds = normalizeOwnedItems(source.ownedItemIds);
    var activeIncident = normalizeIncident(source.activeIncident, now);
    var rawGrowth = finite(source.growthPoints, Number.NaN);
    var growthPoints = Number.isFinite(rawGrowth)
        ? Math.max(0, Math.min(100000, rawGrowth))
        : Math.min(119, Math.floor(bond * 0.4) + storyIndex * 12);
    var rawDeadline = finite(source.nextIncidentAt, Number.NaN);
    var nextIncidentAt = activeIncident
        ? null
        : Number.isFinite(rawDeadline) && rawDeadline >= 0 && rawDeadline <= now + 24 * 60 * 60000
            ? rawDeadline
            : now + progression_1.INITIAL_INCIDENT_DELAY_MS;
    var lastUpdated = validTimestamp(source.lastUpdated, now, now);
    var action = ACTIONS.includes(source.lastAction) ? source.lastAction : null;
    var reply = typeof source.lastReply === 'string' && source.lastReply.length <= 500 ? source.lastReply : null;
    // 0.3.2 旧存档没有 character/headphones：默认星跃、关闭耳机（无损迁移）
    var legacy = !(0, progression_1.isCharacterId)(source.character);
    var character = legacy ? fresh.character : source.character;
    var headphones = typeof source.headphones === 'boolean' ? source.headphones : fresh.headphones;
    // 孵化迁移：完全没有 egg/hatched 字段的旧存档（0.3.2 / 早期 0.3.3）视作已孵化，保留进度
    var hasEggFields = 'egg' in source || 'hatched' in source;
    var legacyHatched = !hasEggFields;
    var egg = legacyHatched || !isRecord(source.egg) || typeof source.egg.startedAt !== 'number'
        ? null
        : {
            startedAt: validTimestamp(source.egg.startedAt, now, now, now + progression_1.EGG_DURATION_MS),
            durationMs: progression_1.EGG_DURATION_MS,
        };
    var hatched = legacyHatched ? true : typeof source.hatched === 'boolean' ? source.hatched : egg === null;
    var eggSoothedAt = typeof source.eggSoothedAt === 'number' && Number.isFinite(source.eggSoothedAt)
        ? validTimestamp(source.eggSoothedAt, now, now, now + progression_1.EGG_DURATION_MS)
        : null;
    var rawName = typeof source.petName === 'string' && source.petName.trim() ? source.petName.trim().slice(0, 30) : fresh.petName;
    // 已知系统默认名（点点 / Mori / 另一角色默认名）一律迁移为当前角色默认名；自定义名保留
    var otherDefault = progression_1.DEFAULT_CHARACTER_NAMES[character === 'star' ? 'block' : 'star'];
    var petName = rawName === '点点' || rawName === 'Mori' || rawName === otherDefault
        ? progression_1.DEFAULT_CHARACTER_NAMES[character]
        : rawName;
    var mode = MODES.includes(source.mode) ? source.mode : fresh.mode;
    var themeId = THEMES.includes(source.themeId) ? source.themeId : fresh.themeId;
    var personalityFocus = (0, progression_1.isPersonalityId)(source.personalityFocus) ? source.personalityFocus : fresh.personalityFocus;
    return {
        petName: petName,
        character: character,
        headphones: headphones,
        egg: egg,
        hatched: hatched,
        eggSoothedAt: eggSoothedAt,
        needs: needs,
        bond: bond,
        ageMinutes: bounded(source.ageMinutes, 0, 0, 10000000),
        mode: mode,
        themeId: themeId,
        lastUpdated: lastUpdated,
        lastAction: action,
        actionNonce: integer(source.actionNonce, 0, 0, Number.MAX_SAFE_INTEGER),
        storyIndex: storyIndex,
        storyOpen: typeof source.storyOpen === 'boolean' ? source.storyOpen : storyIndex === 0,
        lastReply: reply,
        sparks: integer(source.sparks, 0, 0, 1000000),
        playStreak: integer(source.playStreak, 0, 0, 1000000),
        lastActivityDate: validDate(source.lastActivityDate, now),
        activityBest: normalizeActivityBest(source.activityBest),
        personalityScores: normalizeScores(source.personalityScores),
        personalityFocus: personalityFocus,
        growthPoints: growthPoints,
        growthCooldownUntil: validTimestamp(source.growthCooldownUntil, now, now, now + 5 * 60000),
        lastGrowthActivityDate: validDate(source.lastGrowthActivityDate, now),
        activeIncident: activeIncident,
        nextIncidentAt: nextIncidentAt,
        ownedItemIds: ownedItemIds,
        equippedWearable: normalizeEquipment(source.equippedWearable, ownedItemIds, 'wearable'),
        equippedRoomItem: normalizeEquipment(source.equippedRoomItem, ownedItemIds, 'room'),
    };
};
exports.normalizeSnapshot = normalizeSnapshot;

};

modules["transfer"] = function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSaveTransfer = exports.saveFileName = exports.serializeSave = exports.createSaveTransferFile = exports.SAVE_SCHEMA_VERSION = exports.SAVE_TRANSFER_FORMAT = exports.SAVE_TRANSFER_APP = void 0;
var save_1 = require("./save");
exports.SAVE_TRANSFER_APP = 'tamagochi';
exports.SAVE_TRANSFER_FORMAT = 1;
exports.SAVE_SCHEMA_VERSION = 3;
var MAX_TRANSFER_LENGTH = 200000;
var isRecord = function (value) { return (typeof value === 'object' && value !== null && !Array.isArray(value)); };
/** Builds the portable save file wrapper around a normalized snapshot. */
var createSaveTransferFile = function (snapshot, now) {
    if (now === void 0) { now = Date.now(); }
    return ({
        app: exports.SAVE_TRANSFER_APP,
        format: exports.SAVE_TRANSFER_FORMAT,
        saveVersion: exports.SAVE_SCHEMA_VERSION,
        exportedAt: new Date(now).toISOString(),
        snapshot: snapshot,
    });
};
exports.createSaveTransferFile = createSaveTransferFile;
var serializeSave = function (snapshot, now) {
    if (now === void 0) { now = Date.now(); }
    return (JSON.stringify((0, exports.createSaveTransferFile)(snapshot, now), null, 2));
};
exports.serializeSave = serializeSave;
var saveFileName = function (petName, now) {
    if (now === void 0) { now = Date.now(); }
    var safeName = petName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mori';
    return "tamagochi-".concat(safeName, "-").concat(new Date(now).toISOString().slice(0, 10), ".json");
};
exports.saveFileName = saveFileName;
/**
 * Reads exported save text. Backup files are treated as untrusted input: the
 * payload is only accepted when it is recognizable, and every field is then
 * normalized by the same rules used for browser storage.
 */
var parseSaveTransfer = function (text, now) {
    if (now === void 0) { now = Date.now(); }
    var trimmed = text.trim();
    if (!trimmed)
        return { ok: false, error: 'Paste or choose an exported Tamagochi save first.' };
    if (trimmed.length > MAX_TRANSFER_LENGTH)
        return { ok: false, error: 'That file is too large to be a Tamagochi save.' };
    var parsed;
    try {
        parsed = JSON.parse(trimmed);
    }
    catch (_a) {
        return { ok: false, error: 'That does not look like save data. Expected a Tamagochi JSON file.' };
    }
    if (!isRecord(parsed))
        return { ok: false, error: 'That save file is not in a readable format.' };
    var wrapped = isRecord(parsed.snapshot) ? parsed.snapshot : null;
    if (wrapped && parsed.app !== undefined && parsed.app !== exports.SAVE_TRANSFER_APP) {
        return { ok: false, error: 'That backup belongs to a different app.' };
    }
    var candidate = wrapped !== null && wrapped !== void 0 ? wrapped : parsed;
    var looksLikeSave = 'needs' in candidate || 'petName' in candidate || 'growthPoints' in candidate;
    if (!looksLikeSave)
        return { ok: false, error: 'No Tamagochi save data was found in that file.' };
    return { ok: true, snapshot: (0, save_1.normalizeSnapshot)(candidate, now) };
};
exports.parseSaveTransfer = parseSaveTransfer;

};

modules["store"] = function(module, exports, require) {
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGameStore = exports.STORY_EVENTS = exports.STORY_COUNT = exports.isStoryUnlocked = exports.getStoryBondRequirement = void 0;
var zustand_1 = require("zustand");
var middleware_1 = require("zustand/middleware");
var progression_1 = require("./progression");
var save_1 = require("./save");
var stories_1 = require("./stories");
var transfer_1 = require("./transfer");
var types_1 = require("./types");
var stories_2 = require("./stories");
Object.defineProperty(exports, "getStoryBondRequirement", { enumerable: true, get: function () { return stories_2.getStoryBondRequirement; } });
Object.defineProperty(exports, "isStoryUnlocked", { enumerable: true, get: function () { return stories_2.isStoryUnlocked; } });
Object.defineProperty(exports, "STORY_COUNT", { enumerable: true, get: function () { return stories_2.STORY_COUNT; } });
Object.defineProperty(exports, "STORY_EVENTS", { enumerable: true, get: function () { return stories_2.STORY_EVENTS; } });
var ACTIVITY_SCORE_LIMIT = {
    'star-catch': 100,
    'memory-flip': 20,
};
var normalizeActivityScore = function (gameId, score) {
    if (!Number.isFinite(score))
        return 0;
    return Math.max(0, Math.min(ACTIVITY_SCORE_LIMIT[gameId], Math.floor(score)));
};
var CARE_EFFECTS = {
    feed: { hunger: 26, health: 3, hygiene: -4 },
    play: { joy: 28, energy: -10, hunger: -4 },
    wash: { hygiene: 34, joy: 4 },
    rest: { energy: 30, health: 4, hunger: -6 },
    cuddle: { joy: 16, health: 3, energy: 2 },
    explore: { joy: 22, energy: -13, hunger: -9, hygiene: -3 },
};
var applyCareEffects = function (current, action) {
    var e_1, _a;
    var _b;
    var needs = __assign({}, current);
    var effects = CARE_EFFECTS[action];
    try {
        for (var _c = __values(Object.keys(effects)), _d = _c.next(); !_d.done; _d = _c.next()) {
            var key = _d.value;
            needs[key] = (0, types_1.clampNeed)(needs[key] + ((_b = effects[key]) !== null && _b !== void 0 ? _b : 0));
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return needs;
};
exports.useGameStore = (0, zustand_1.create)()((0, middleware_1.persist)(function (set, get) { return (__assign(__assign({}, (0, save_1.freshSnapshot)()), { tick: function () { return set(function (state) { return (0, progression_1.settleTimedState)(state, Date.now()); }); }, care: function (action) { return set(function (state) {
        var sampledNow = Date.now();
        var settled = (0, progression_1.settleTimedState)(state, sampledNow);
        var now = settled.lastUpdated;
        var growthReady = now >= state.growthCooldownUntil;
        var trait = progression_1.CARE_TRAIT[action];
        var growthPoints = state.growthPoints + (growthReady ? 4 : 0);
        var personalityScores = growthReady ? (0, progression_1.applyTraitAward)(state.personalityScores, trait, 3) : state.personalityScores;
        var personalityFocus = growthReady ? trait : state.personalityFocus;
        var sparks = state.sparks;
        var activeIncident = settled.activeIncident;
        var nextIncidentAt = settled.nextIncidentAt;
        var lastReply = growthReady ? "".concat(trait[0].toUpperCase()).concat(trait.slice(1), " imprint \u00B7 +4 growth.") : null;
        if (activeIncident && progression_1.INCIDENT_BY_ID[activeIncident.id].action === action) {
            var resolvedId = activeIncident.id;
            sparks += progression_1.INCIDENT_REWARD_SPARKS;
            growthPoints += progression_1.INCIDENT_REWARD_GROWTH;
            activeIncident = null;
            nextIncidentAt = (0, progression_1.scheduleIncidentAfterResolution)(now, state.actionNonce, state.storyIndex, resolvedId, state.ownedItemIds.length);
            lastReply = "".concat(progression_1.INCIDENT_BY_ID[resolvedId].title, " cleared with ").concat(action, ". +").concat(progression_1.INCIDENT_REWARD_SPARKS, " Sparks \u00B7 +").concat(progression_1.INCIDENT_REWARD_GROWTH, " growth.");
        }
        var bondGain = action === 'cuddle' ? 4 : action === 'play' || action === 'explore' ? 3 : 1.5;
        var nextBond = (0, types_1.clampNeed)(state.bond + bondGain);
        var storyReady = (0, stories_1.isStoryUnlocked)(state.storyIndex, nextBond);
        return __assign(__assign({}, settled), { needs: applyCareEffects(settled.needs, action), bond: nextBond, sparks: sparks, growthPoints: growthPoints, growthCooldownUntil: growthReady ? now + progression_1.CARE_GROWTH_COOLDOWN_MS : state.growthCooldownUntil, personalityScores: personalityScores, personalityFocus: personalityFocus, activeIncident: activeIncident, nextIncidentAt: nextIncidentAt, lastAction: action, actionNonce: state.actionNonce + 1, storyOpen: state.storyOpen || storyReady, lastReply: lastReply });
    }); }, completeActivity: function (gameId, score) { return set(function (state) {
        var _a;
        var settled = (0, progression_1.settleTimedState)(state, Date.now());
        var safeScore = normalizeActivityScore(gameId, score);
        var today = (0, progression_1.utcDateKey)(settled.lastUpdated);
        var previousActivity = state.lastActivityDate
            ? Date.parse("".concat(state.lastActivityDate, "T00:00:00Z"))
            : null;
        var daysSinceLastActivity = previousActivity === null
            ? null
            : Math.round((Date.parse("".concat(today, "T00:00:00Z")) - previousActivity) / 86400000);
        var playStreak = 1;
        if (daysSinceLastActivity === 0)
            playStreak = state.playStreak;
        if (daysSinceLastActivity === 1)
            playStreak = state.playStreak + 1;
        var reward = Math.max(3, Math.floor(safeScore / 2));
        var canEarnDailyGrowth = state.lastGrowthActivityDate !== today;
        var growthAward = canEarnDailyGrowth ? 6 : 0;
        var trait = gameId === 'star-catch' ? 'playful' : 'curious';
        var personalityScores = canEarnDailyGrowth
            ? (0, progression_1.applyTraitAward)(state.personalityScores, trait, 3)
            : state.personalityScores;
        var personalityFocus = canEarnDailyGrowth ? trait : state.personalityFocus;
        var lastGrowthActivityDate = canEarnDailyGrowth ? today : state.lastGrowthActivityDate;
        var growthMessage = canEarnDailyGrowth ? ' and a +6 growth echo' : '';
        return __assign(__assign({}, settled), { sparks: state.sparks + reward, playStreak: playStreak, lastActivityDate: today, lastGrowthActivityDate: lastGrowthActivityDate, growthPoints: state.growthPoints + growthAward, personalityScores: personalityScores, personalityFocus: personalityFocus, activityBest: __assign(__assign({}, state.activityBest), (_a = {}, _a[gameId] = Math.max(state.activityBest[gameId], safeScore), _a)), needs: __assign(__assign({}, settled.needs), { joy: (0, types_1.clampNeed)(settled.needs.joy + Math.min(28, 8 + safeScore)), energy: (0, types_1.clampNeed)(settled.needs.energy - 6), hunger: (0, types_1.clampNeed)(settled.needs.hunger - 2) }), bond: (0, types_1.clampNeed)(state.bond + 2 + safeScore / 10), lastAction: 'activity', actionNonce: state.actionNonce + 1, lastReply: "".concat(state.petName, " found ").concat(reward, " Sparks").concat(growthMessage, " in the Tamagochi Arcade!") });
    }); }, chooseStory: function (choiceIndex) { return set(function (state) {
        var event = stories_1.STORY_EVENTS[state.storyIndex];
        var choice = event === null || event === void 0 ? void 0 : event.choices[choiceIndex];
        if (!choice)
            return state;
        var settled = (0, progression_1.settleTimedState)(state, Date.now());
        return __assign(__assign({}, settled), { bond: (0, types_1.clampNeed)(state.bond + choice.bond), needs: __assign(__assign({}, settled.needs), { joy: (0, types_1.clampNeed)(settled.needs.joy + choice.joy) }), personalityScores: (0, progression_1.applyTraitAward)(state.personalityScores, choice.trait, 5), personalityFocus: choice.trait, growthPoints: state.growthPoints + 12, storyIndex: state.storyIndex + 1, storyOpen: false, lastAction: 'story', actionNonce: state.actionNonce + 1, lastReply: "".concat(choice.reply, " \u00B7 +12 growth.") });
    }); }, purchaseKeepsake: function (itemId) { return set(function (state) {
        if (!(0, progression_1.isKeepsakeId)(itemId) || !(0, progression_1.canPurchaseKeepsake)(state.sparks, state.ownedItemIds, itemId))
            return state;
        var item = progression_1.KEEPSAKE_BY_ID[itemId];
        return {
            sparks: state.sparks - item.cost,
            ownedItemIds: __spreadArray(__spreadArray([], __read(state.ownedItemIds), false), [itemId], false),
            lastAction: 'workshop',
            actionNonce: state.actionNonce + 1,
            lastReply: "".concat(item.name, " joined Mori\u2019s keepsake collection."),
        };
    }); }, toggleKeepsake: function (itemId) { return set(function (state) {
        var _a;
        if (!(0, progression_1.isKeepsakeId)(itemId))
            return state;
        var item = progression_1.KEEPSAKE_BY_ID[itemId];
        if (!(0, progression_1.isEquippable)(state.ownedItemIds, itemId, item.category))
            return state;
        var key = item.category === 'wearable' ? 'equippedWearable' : 'equippedRoomItem';
        var equipped = state[key] === itemId ? null : itemId;
        return _a = {},
            _a[key] = equipped,
            _a.lastAction = 'workshop',
            _a.actionNonce = state.actionNonce + 1,
            _a.lastReply = equipped ? "".concat(item.name, " is now part of Mori\u2019s world.") : "".concat(item.name, " returned to the keepsake drawer."),
            _a;
    }); }, openStory: function () { return set(function (state) { return ({ storyOpen: (0, stories_1.isStoryUnlocked)(state.storyIndex, state.bond) }); }); }, closeStory: function () { return set({ storyOpen: false }); }, setTheme: function (themeId) { return set({ themeId: themeId, lastReply: null }); }, setMode: function (mode) { return set(function (state) { return (__assign(__assign({}, (0, progression_1.settleTimedState)(state, Date.now())), { mode: mode })); }); }, 
    // 0.3.3 角色切换：仍在用默认名时跟随角色默认名（星跃/方跃），手动命名过则保留
    setCharacter: function (character) { return set(function (state) {
        if (!(0, progression_1.isCharacterId)(character) || character === state.character)
            return state;
        var petName = state.petName === progression_1.DEFAULT_CHARACTER_NAMES[state.character] ? progression_1.DEFAULT_CHARACTER_NAMES[character] : state.petName;
        return __assign(__assign({}, (0, progression_1.settleTimedState)(state, Date.now())), { character: character, petName: petName, lastAction: 'workshop', actionNonce: state.actionNonce + 1, lastReply: null });
    }); }, 
    // 蛋阶段轻触安抚：只记录时间戳与反馈，不加速孵化、不影响成长
    sootheEgg: function () { return set(function (state) {
        if (state.hatched || !state.egg)
            return state;
        return __assign(__assign({}, state), { eggSoothedAt: Date.now(), actionNonce: state.actionNonce + 1, lastAction: null, lastReply: '蛋轻轻晃了晃，好像在回应你。' });
    }); }, setHeadphones: function (on) { return set(function (state) { return (state.headphones === on === true ? state : __assign(__assign({}, state), { headphones: on === true, lastAction: 'workshop', actionNonce: state.actionNonce + 1, lastReply: null })); }); }, exportSave: function () {
        var now = Date.now();
        var snapshot = (0, save_1.normalizeSnapshot)(get(), now);
        return {
            contents: (0, transfer_1.serializeSave)(snapshot, now),
            fileName: (0, transfer_1.saveFileName)(snapshot.petName, now),
        };
    }, importSave: function (contents) {
        var parsed = (0, transfer_1.parseSaveTransfer)(contents, Date.now());
        if (!parsed.ok)
            return parsed;
        set(__assign(__assign({}, parsed.snapshot), { storyOpen: false, lastAction: null, lastReply: "".concat(parsed.snapshot.petName, " woke up from a restored backup.") }));
        return { ok: true };
    }, reset: function () { return set((0, save_1.freshSnapshot)()); } })); }, {
    name: 'pocket-worlds-save-v1',
    version: 3,
    migrate: function (persistedState) { return (0, save_1.normalizeSnapshot)(persistedState); },
    merge: function (persistedState, currentState) { return (__assign(__assign({}, currentState), (0, save_1.normalizeSnapshot)(persistedState))); },
}));

};
var game = require('store').useGameStore;
var save = require('save');
var progression = require('progression');
var stories = require('stories');
var allowed = ['tick','care','completeActivity','chooseStory','purchaseKeepsake','toggleKeepsake','openStory','closeStory','setTheme','setMode','setCharacter','setHeadphones','sootheEgg','exportSave','importSave','reset'];
function initGame(saved, legacy) {
  var snapshot = saved ? save.normalizeSnapshot(JSON.parse(saved)) : save.freshSnapshot();
  if (!saved) {
    snapshot.petName = '星跃';
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
  if (action === 'setCharacter' && ['star','block'].indexOf(args[0]) < 0) throw new Error('角色错误');
  if (action === 'completeActivity' && ['star-catch','memory-flip'].indexOf(args[0]) < 0) throw new Error('游戏类型错误');
  if (action === 'chooseStory' && !stories.isStoryUnlocked(state.storyIndex, state.bond)) throw new Error('这段回忆尚未解锁');
  var result = game.getState()[action].apply(null, args);
  return JSON.stringify({ snapshot: game.getState(), result: result === undefined ? null : result });
}

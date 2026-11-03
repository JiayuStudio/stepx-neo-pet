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

modules["companion-life"] = function(module, exports, require) {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CYCLE_RHYTHM = exports.LIFE_RHYTHM = exports.needsAttention = exports.composeMessages = exports.mergeMessages = exports.MESSAGE_LEDGER_LIMIT = exports.MESSAGE_SCENE = exports.markNotificationSent = exports.canSendNotification = exports.rollNotifyWindow = exports.startOfLocalDay = exports.NOTIFY_LIMITS = exports.DEFAULT_NOTIFY = exports.quietKeepsCompanion = exports.quietStateAt = exports.inScheduledQuiet = exports.formatMinute = exports.clampMinute = exports.DEFAULT_QUIET = exports.pushMemorial = exports.lifeStageCopy = exports.lifeStartForMode = exports.shouldFarewell = exports.lifeStage = exports.lifeDays = exports.LIFE_FAREWELL_DAYS = exports.LIFE_TWILIGHT_DAYS = exports.LIFE_ADULT_DAYS = exports.LIFE_CHILD_DAYS = exports.HOUR_MS = exports.DAY_MS = void 0;
exports.DAY_MS = 86400000;
exports.HOUR_MS = 3600000;
exports.LIFE_CHILD_DAYS = 3;
exports.LIFE_ADULT_DAYS = 21;
exports.LIFE_TWILIGHT_DAYS = 55;
exports.LIFE_FAREWELL_DAYS = 60;
var STAGE_COPY = {
    child: { name: '幼年', note: '还在熟悉这个世界，多陪它说说话就很好。' },
    adult: { name: '成年', note: '最自在的年纪，喜欢和你一起做点小事。' },
    elder: { name: '老年', note: '步子慢下来了，安静待着也很舒服。' },
    twilight: { name: '暮年', note: '它开始喜欢晒太阳和旧回忆，按自己的节奏就好。' },
    farewell: { name: '告别后', note: '它把相处的日子留在了纪念里。' },
};
/** 相处天数：生命周期模式从选择时刻起算，其它模式按领养以来的真实时间 */
var lifeDays = function (snapshot, now) {
    if (snapshot.lifeMode === 'cycle' && snapshot.lifeStartedAt !== null) {
        return Math.max(0, Math.floor((Math.max(now, snapshot.lifeStartedAt) - snapshot.lifeStartedAt) / exports.DAY_MS));
    }
    return Math.max(0, Math.floor((snapshot.ageMinutes * 60000) / exports.DAY_MS));
};
exports.lifeDays = lifeDays;
/** 温情模式的阶段：幼年 → 成年 → 老年；不会告别 */
var lifeStage = function (snapshot, now) {
    if (snapshot.farewellAt !== null) {
        var days_1 = (0, exports.lifeDays)(snapshot, snapshot.farewellAt);
        return __assign({ stage: 'farewell', days: days_1 }, STAGE_COPY.farewell);
    }
    var days = (0, exports.lifeDays)(snapshot, now);
    var cycle = snapshot.lifeMode === 'cycle';
    if (days >= exports.LIFE_ADULT_DAYS) {
        var stage = cycle && days >= exports.LIFE_TWILIGHT_DAYS ? 'twilight' : 'elder';
        return __assign({ stage: stage, days: days }, STAGE_COPY[stage]);
    }
    if (days >= exports.LIFE_CHILD_DAYS)
        return __assign({ stage: 'adult', days: days }, STAGE_COPY.adult);
    return __assign({ stage: 'child', days: days }, STAGE_COPY.child);
};
exports.lifeStage = lifeStage;
/** 是否到了自然告别的时刻（仅生命周期模式，且必须已过完整告别门槛） */
var shouldFarewell = function (snapshot, now) { return (snapshot.hatched
    && snapshot.lifeMode === 'cycle'
    && snapshot.farewellAt === null
    && snapshot.lifeStartedAt !== null
    && now - snapshot.lifeStartedAt >= exports.LIFE_FAREWELL_DAYS * exports.DAY_MS); };
exports.shouldFarewell = shouldFarewell;
/** 切换生命周期模式时的年龄起点：进入 cycle 一律从此刻重新起算，不用旧档年龄判死 */
var lifeStartForMode = function (mode, now) { return (mode === 'cycle' ? now : null); };
exports.lifeStartForMode = lifeStartForMode;
var lifeStageCopy = function (stage) { return STAGE_COPY[stage]; };
exports.lifeStageCopy = lifeStageCopy;
var pushMemorial = function (existing, entry) { return (__spreadArray([entry], __read(existing.filter(function (item) { return item.id !== entry.id; })), false)); };
exports.pushMemorial = pushMemorial;
exports.DEFAULT_QUIET = {
    manual: false,
    schedule: true,
    startMinute: 22 * 60,
    endMinute: 8 * 60,
    weekdaysOnly: false,
};
var clampMinute = function (value, fallback) {
    var number = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
    return Math.max(0, Math.min(1439, number));
};
exports.clampMinute = clampMinute;
var formatMinute = function (minute) {
    var hour = Math.floor(minute / 60) % 24;
    var rest = minute % 60;
    return "".concat(String(hour).padStart(2, '0'), ":").concat(String(rest).padStart(2, '0'));
};
exports.formatMinute = formatMinute;
var localParts = function (timestamp) {
    var date = new Date(timestamp);
    return {
        minute: date.getHours() * 60 + date.getMinutes(),
        weekday: date.getDay(),
        dayKey: "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'), "-").concat(String(date.getDate()).padStart(2, '0')),
    };
};
/** 定时窗口：跨午夜用两段区间表示 */
var isWeekday = function (weekday) { return weekday >= 1 && weekday <= 5; };
/** 定时勿扰窗口。
 *  - 起止相同视为「全天勿扰」（开启即整段静默），避免含糊的保存结果；
 *  - 跨午夜窗口归属**开始日**：周五 22:00–周六 08:00 算工作日，
 *    周日 22:00 不生效、周一 00:00 也不生效（归周日）。 */
var inScheduledQuiet = function (quiet, timestamp) {
    if (!quiet.schedule)
        return false;
    var _a = localParts(timestamp), minute = _a.minute, weekday = _a.weekday;
    if (quiet.startMinute === quiet.endMinute) {
        return !quiet.weekdaysOnly || isWeekday(weekday);
    }
    if (quiet.startMinute < quiet.endMinute) {
        if (quiet.weekdaysOnly && !isWeekday(weekday))
            return false;
        return minute >= quiet.startMinute && minute < quiet.endMinute;
    }
    if (minute >= quiet.startMinute)
        return !quiet.weekdaysOnly || isWeekday(weekday);
    if (minute < quiet.endMinute) {
        // 这段属于前一天开启的窗口：工作日判定看开始日
        var startWeekday = (weekday + 6) % 7;
        return !quiet.weekdaysOnly || isWeekday(startWeekday);
    }
    return false;
};
exports.inScheduledQuiet = inScheduledQuiet;
var quietStateAt = function (quiet, timestamp) {
    if (quiet.manual)
        return { quiet: true, reason: '已开启一键勿扰' };
    if ((0, exports.inScheduledQuiet)(quiet, timestamp)) {
        return {
            quiet: true,
            reason: quiet.startMinute === quiet.endMinute
                ? "\u5168\u5929\u52FF\u6270".concat(quiet.weekdaysOnly ? '（仅工作日）' : '')
                : "\u5B9A\u65F6\u52FF\u6270 ".concat((0, exports.formatMinute)(quiet.startMinute), "\u2013").concat((0, exports.formatMinute)(quiet.endMinute)).concat(quiet.weekdaysOnly ? '（仅工作日）' : ''),
        };
    }
    if (quiet.schedule) {
        return {
            quiet: false,
            reason: quiet.startMinute === quiet.endMinute
                ? "\u5168\u5929\u52FF\u6270\u672A\u751F\u6548".concat(quiet.weekdaysOnly ? '（仅工作日）' : '')
                : "\u5B9A\u65F6\u52FF\u6270\u672A\u751F\u6548 \u00B7 ".concat((0, exports.formatMinute)(quiet.startMinute), "\u2013").concat((0, exports.formatMinute)(quiet.endMinute)).concat(quiet.weekdaysOnly ? '（仅工作日）' : ''),
        };
    }
    return { quiet: false, reason: '未开启勿扰' };
};
exports.quietStateAt = quietStateAt;
/** 勿扰只让通知安静，不停止背屏陪伴 */
exports.quietKeepsCompanion = true;
exports.DEFAULT_NOTIFY = {
    enabled: false,
    vibrate: false,
    frequency: 'low',
    sentCount: 0,
    windowStartedAt: 0,
    lastSentAt: null,
};
exports.NOTIFY_LIMITS = {
    low: { max: 2, gapMs: 6 * exports.HOUR_MS, label: '低频：每天最多 2 条，间隔至少 6 小时' },
    normal: { max: 4, gapMs: 3 * exports.HOUR_MS, label: '普通：每天最多 4 条，间隔至少 3 小时' },
};
var startOfLocalDay = function (timestamp) {
    var date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};
exports.startOfLocalDay = startOfLocalDay;
/** 把计数窗口推进到「今天」；跨重启 / 跨天都能自愈 */
var rollNotifyWindow = function (notify, now) {
    var today = (0, exports.startOfLocalDay)(now);
    if (notify.windowStartedAt >= today && notify.windowStartedAt <= now)
        return notify;
    return __assign(__assign({}, notify), { sentCount: 0, windowStartedAt: today });
};
exports.rollNotifyWindow = rollNotifyWindow;
/** 判断现在是否允许主动发一条通知。用户主动操作不经过这里，因此不占限额。 */
var canSendNotification = function (notify, quiet, now, systemQuiet) {
    var settings = (0, exports.rollNotifyWindow)(notify, now);
    if (!settings.enabled)
        return { ok: false, reason: '未开启主动通知', settings: settings };
    if (systemQuiet)
        return { ok: false, reason: '系统勿扰中，消息留在应用内', settings: settings };
    var quietNow = (0, exports.quietStateAt)(quiet, now);
    if (quietNow.quiet)
        return { ok: false, reason: "".concat(quietNow.reason, "\uFF0C\u6D88\u606F\u7559\u5728\u5E94\u7528\u5185"), settings: settings };
    var limit = exports.NOTIFY_LIMITS[settings.frequency];
    if (settings.sentCount >= limit.max)
        return { ok: false, reason: "\u4ECA\u5929\u5DF2\u53D1\u9001 ".concat(settings.sentCount, " \u6761\uFF0C\u8FBE\u5230\u4E0A\u9650"), settings: settings };
    if (settings.lastSentAt !== null && now - settings.lastSentAt < limit.gapMs) {
        return { ok: false, reason: '距离上一条通知还不到最小间隔', settings: settings };
    }
    return { ok: true, reason: '可以发送', settings: settings };
};
exports.canSendNotification = canSendNotification;
var markNotificationSent = function (settings, now) { return (__assign(__assign({}, (0, exports.rollNotifyWindow)(settings, now)), { sentCount: (0, exports.rollNotifyWindow)(settings, now).sentCount + 1, lastSentAt: now })); };
exports.markNotificationSent = markNotificationSent;
exports.MESSAGE_SCENE = {
    morning: 'happy',
    night: 'sleep',
    miss: 'pet',
    care: 'unhappy',
    recover: 'happy',
    growth: 'happy',
    farewell: 'dead',
    idle: 'idle',
};
var messageDayKey = function (timestamp) { return localParts(timestamp).dayKey; };
/** 消息账本上限：足够覆盖近期事件，同时避免存档膨胀 */
exports.MESSAGE_LEDGER_LIMIT = 80;
/**
 * 事件只记录一次：同 id 的新事件不会覆盖旧时间戳，也不会在清空消息列表后重放。
 * ledger 是持久化的「已产生事件 id」，messages 只是展示用的近期记录。
 */
var mergeMessages = function (existing, incoming, ledger) {
    var e_1, _a;
    var seen = new Set(ledger);
    var added = [];
    try {
        for (var incoming_1 = __values(incoming), incoming_1_1 = incoming_1.next(); !incoming_1_1.done; incoming_1_1 = incoming_1.next()) {
            var item = incoming_1_1.value;
            if (seen.has(item.id))
                continue;
            seen.add(item.id);
            added.push(item);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (incoming_1_1 && !incoming_1_1.done && (_a = incoming_1.return)) _a.call(incoming_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var messages = __spreadArray(__spreadArray([], __read(added), false), __read(existing), false).filter(function (item, index, list) { return list.findIndex(function (other) { return other.id === item.id; }) === index; })
        .sort(function (a, b) { return b.at - a.at; })
        .slice(0, 20);
    var nextLedger = __spreadArray(__spreadArray([], __read(added.map(function (item) { return item.id; })), false), __read(ledger), false).slice(0, exports.MESSAGE_LEDGER_LIMIT);
    return { messages: messages, ledger: nextLedger, added: added };
};
exports.mergeMessages = mergeMessages;
/** 由状态推导消息：同一天同一类只产生一条 */
var composeMessages = function (context) {
    var previous = context.previous, next = context.next, now = context.now, stageChanged = context.stageChanged, stageName = context.stageName;
    var day = messageDayKey(now);
    var hour = new Date(now).getHours();
    var out = [];
    var add = function (kind, text, action) {
        if (action === void 0) { action = exports.MESSAGE_SCENE[kind]; }
        return out.push({ id: "".concat(kind, ":").concat(day), kind: kind, at: now, text: text, action: action });
    };
    if (next.farewellAt !== null) {
        if (previous.farewellAt === null)
            add('farewell', '它安静地睡着了。相处的日子都留在纪念里。');
        return out;
    }
    if (!previous.hatched)
        return out;
    if (hour >= 6 && hour < 11)
        add('morning', '早安呀，今天也一起慢慢过。');
    if (hour >= 21)
        add('night', '夜深了，我把灯调暗一点，陪你到困为止。');
    // 想念看的是「上次互动」，不是每秒推进的 lastUpdated
    var away = Math.max(0, now - previous.lastInteractionAt);
    if (away >= 6 * exports.HOUR_MS)
        add('miss', '有一阵子没见到你了，我一直在这里等你。');
    var needs = next.needs;
    if (needs.health < 30)
        add('care', '今天有点不舒服，安静陪一会儿就好。', 'sick');
    else if (needs.hunger < 24)
        add('care', '肚子在轻轻叫，想吃点东西。', 'hungry');
    else if (needs.hygiene < 20)
        add('care', '身上有点黏糊糊的，想洗个泡泡澡。');
    else if (needs.energy < 20)
        add('care', '眼皮有点沉，想靠着你打个盹。', 'sleep');
    if (previous.healthBand === 'low' && next.healthBand === 'ok')
        add('recover', '感觉好多了，谢谢你一直照顾我。');
    if (stageChanged)
        add('growth', "\u4ECA\u5929\u662F\u65B0\u7684\u9636\u6BB5\uFF1A".concat(stageName, "\u3002\u6211\u4EEC\u4E00\u8D77\u7EE7\u7EED\u8D70\u5427\u3002"));
    var priority = ['farewell', 'recover', 'growth', 'care', 'miss', 'morning', 'night', 'idle'];
    return out.sort(function (a, b) { return priority.indexOf(a.kind) - priority.indexOf(b.kind); });
};
exports.composeMessages = composeMessages;
/** 当前是否处于「需要照料」的明显状态（用于状态显示，不产生内疚文案） */
var needsAttention = function (needs) { return (needs.health < 30 || needs.hunger < 24 || needs.hygiene < 20 || needs.energy < 20 || needs.joy < 24); };
exports.needsAttention = needsAttention;
/** 成长期望节奏说明（设置页展示） */
exports.LIFE_RHYTHM = "\u5E7C\u5E74 0\u2013".concat(exports.LIFE_CHILD_DAYS, " \u5929 \u00B7 \u6210\u5E74 ").concat(exports.LIFE_CHILD_DAYS, "\u2013").concat(exports.LIFE_ADULT_DAYS, " \u5929 \u00B7 \u8001\u5E74 ").concat(exports.LIFE_ADULT_DAYS, " \u5929\u8D77");
exports.CYCLE_RHYTHM = "\u751F\u547D\u5468\u671F\u6A21\u5F0F\uFF1A".concat(exports.LIFE_TWILIGHT_DAYS, " \u5929\u8D77\u8FDB\u5165\u66AE\u5E74\uFF0C").concat(exports.LIFE_FAREWELL_DAYS, " \u5929\u81EA\u7136\u544A\u522B");

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
exports.CHARACTERS = ['star', 'block', 'sprout', 'bunny', 'fox', 'otter', 'owl', 'drake'];
exports.DEFAULT_CHARACTER_NAMES = {
    star: '星跃', block: '方跃', sprout: '芽灵', bunny: '绒兔', fox: '焰狐', otter: '泡獭', owl: '眠鸮', drake: '角龙',
};
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
exports.normalizeSnapshot = exports.freshSnapshot = void 0;
var progression_1 = require("./progression");
var stories_1 = require("./stories");
var companion_life_1 = require("./companion-life");
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
        lifeMode: 'gentle',
        lifeStartedAt: null,
        farewellAt: null,
        messages: [],
        lastStage: null,
        healthBand: 'ok',
        quiet: __assign({}, companion_life_1.DEFAULT_QUIET),
        notify: __assign({}, companion_life_1.DEFAULT_NOTIFY),
        lastMessageDay: null,
        memorials: [],
        lastNotifiedMessageId: null,
        lastInteractionAt: now,
        messageLedger: [],
    });
};
exports.freshSnapshot = freshSnapshot;
var normalizeQuiet = function (value) {
    var source = isRecord(value) ? value : {};
    return {
        manual: source.manual === true,
        schedule: typeof source.schedule === 'boolean' ? source.schedule : companion_life_1.DEFAULT_QUIET.schedule,
        startMinute: (0, companion_life_1.clampMinute)(source.startMinute, companion_life_1.DEFAULT_QUIET.startMinute),
        endMinute: (0, companion_life_1.clampMinute)(source.endMinute, companion_life_1.DEFAULT_QUIET.endMinute),
        weekdaysOnly: source.weekdaysOnly === true,
    };
};
var normalizeNotify = function (value, now) {
    var source = isRecord(value) ? value : {};
    var frequency = source.frequency === 'normal' ? 'normal' : 'low';
    var sentCount = integer(source.sentCount, 0, 0, 1000);
    var windowStartedAt = finite(source.windowStartedAt, 0);
    var lastSentAt = finite(source.lastSentAt, Number.NaN);
    return {
        enabled: source.enabled === true,
        vibrate: source.vibrate === true,
        frequency: frequency,
        sentCount: sentCount,
        windowStartedAt: windowStartedAt > 0 && windowStartedAt <= now ? windowStartedAt : 0,
        lastSentAt: Number.isFinite(lastSentAt) && lastSentAt > 0 && lastSentAt <= now ? lastSentAt : null,
    };
};
var MESSAGE_KINDS = ['morning', 'night', 'miss', 'care', 'recover', 'growth', 'farewell', 'idle'];
var normalizeMessages = function (value, now) {
    var e_1, _a;
    if (!Array.isArray(value))
        return [];
    var out = [];
    try {
        for (var _b = __values(value.slice(0, 30)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var item = _c.value;
            if (!isRecord(item))
                continue;
            var kind = MESSAGE_KINDS.includes(item.kind) ? item.kind : null;
            var at = finite(item.at, Number.NaN);
            var text = typeof item.text === 'string' ? item.text.slice(0, 160) : '';
            var id = typeof item.id === 'string' ? item.id.slice(0, 80) : null;
            if (!kind || !id || !text || !Number.isFinite(at) || at < 0 || at > now)
                continue;
            var action = typeof item.action === 'string' ? item.action.slice(0, 20) : 'idle';
            out.push({ id: id, kind: kind, at: at, text: text, action: action });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return out.slice(0, 20);
};
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
var normalizeMemorials = function (value, now) {
    var e_2, _a;
    if (!Array.isArray(value))
        return [];
    var out = [];
    try {
        for (var value_1 = __values(value), value_1_1 = value_1.next(); !value_1_1.done; value_1_1 = value_1.next()) {
            var item = value_1_1.value;
            if (!isRecord(item))
                continue;
            var at = finite(item.at, Number.NaN);
            var id = typeof item.id === 'string' ? item.id.slice(0, 80) : null;
            var petName = typeof item.petName === 'string' ? item.petName.slice(0, 30) : '';
            var character = typeof item.character === 'string' ? item.character.slice(0, 20) : 'star';
            if (!id || !petName || !Number.isFinite(at) || at < 0 || at > now)
                continue;
            out.push({
                id: id,
                at: at,
                petName: petName,
                character: character,
                days: integer(item.days, 0, 0, 100000),
                bond: integer(item.bond, 0, 0, 100),
                growthPoints: integer(item.growthPoints, 0, 0, 100000),
                storyIndex: integer(item.storyIndex, 0, 0, stories_1.STORY_COUNT),
                reason: item.reason === 'rehomed' ? 'rehomed' : 'farewell',
            });
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (value_1_1 && !value_1_1.done && (_a = value_1.return)) _a.call(value_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return out;
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
    // 已知系统默认名（点点 / Mori / 任意其他角色默认名）一律迁移为当前角色默认名；自定义名保留
    var knownDefaults = new Set(__spreadArray(['点点', 'Mori'], __read(progression_1.CHARACTERS.map(function (id) { return progression_1.DEFAULT_CHARACTER_NAMES[id]; })), false));
    knownDefaults.delete(progression_1.DEFAULT_CHARACTER_NAMES[character]);
    var petName = knownDefaults.has(rawName) ? progression_1.DEFAULT_CHARACTER_NAMES[character] : rawName;
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
        // 0.3.9：旧存档一律进入温柔陪伴；生命周期模式必须由用户主动选择（lifeStartedAt 只在切换时建立）
        lifeMode: source.lifeMode === 'cycle' ? 'cycle' : 'gentle',
        lifeStartedAt: source.lifeMode === 'cycle' && Number.isFinite(finite(source.lifeStartedAt, Number.NaN))
            ? validTimestamp(source.lifeStartedAt, now, now)
            : null,
        farewellAt: Number.isFinite(finite(source.farewellAt, Number.NaN))
            ? validTimestamp(source.farewellAt, now, now)
            : null,
        messages: normalizeMessages(source.messages, now),
        lastStage: typeof source.lastStage === 'string' ? source.lastStage.slice(0, 20) : null,
        healthBand: source.healthBand === 'low' ? 'low' : 'ok',
        quiet: normalizeQuiet(source.quiet),
        notify: normalizeNotify(source.notify, now),
        lastMessageDay: typeof source.lastMessageDay === 'string' ? source.lastMessageDay.slice(0, 20) : null,
        memorials: normalizeMemorials(source.memorials, now),
        lastNotifiedMessageId: typeof source.lastNotifiedMessageId === 'string' ? source.lastNotifiedMessageId.slice(0, 80) : null,
        lastInteractionAt: validTimestamp(source.lastInteractionAt, lastUpdated, now),
        messageLedger: Array.isArray(source.messageLedger)
            ? source.messageLedger.filter(function (item) { return typeof item === 'string' && item.length > 0; }).slice(0, 80)
            : [],
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
var companion_life_1 = require("./companion-life");
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
/** 0.3.9：每次状态推进后统一结算生命周期、消息与纪念。
 *  patch 只包含本次变化的字段，先与 previous 合并成完整状态再结算，
 *  避免缺失 farewellAt / messages / memorials 导致误判告别或清空历史。 */
var withLife = function (previous, patch, now) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var next = __assign(__assign({}, previous), patch);
    var beforeStage = (_a = previous.lastStage) !== null && _a !== void 0 ? _a : (0, companion_life_1.lifeStage)(previous, previous.lastUpdated).stage;
    var farewellDue = (0, companion_life_1.shouldFarewell)(next, now);
    var farewellAt = farewellDue ? now : next.farewellAt;
    var stageInfo = (0, companion_life_1.lifeStage)(__assign(__assign({}, next), { farewellAt: farewellAt }), now);
    var healthBand = next.needs.health < 30 ? 'low' : 'ok';
    var candidates = (0, companion_life_1.composeMessages)({
        previous: {
            needs: previous.needs,
            lastUpdated: previous.lastUpdated,
            lastInteractionAt: (_b = previous.lastInteractionAt) !== null && _b !== void 0 ? _b : previous.lastUpdated,
            healthBand: (_c = previous.healthBand) !== null && _c !== void 0 ? _c : 'ok',
            lifeMode: (_d = previous.lifeMode) !== null && _d !== void 0 ? _d : 'gentle',
            lifeStartedAt: (_e = previous.lifeStartedAt) !== null && _e !== void 0 ? _e : null,
            ageMinutes: previous.ageMinutes,
            farewellAt: (_f = previous.farewellAt) !== null && _f !== void 0 ? _f : null,
            hatched: previous.hatched,
        },
        next: { needs: next.needs, healthBand: healthBand, farewellAt: farewellAt },
        now: now,
        stageChanged: beforeStage !== stageInfo.stage,
        stageName: stageInfo.name,
    });
    var merged = (0, companion_life_1.mergeMessages)((_g = next.messages) !== null && _g !== void 0 ? _g : [], candidates, (_h = next.messageLedger) !== null && _h !== void 0 ? _h : []);
    // 纪念只写一次：id 绑定生命周期起点，重复结算不会产生多条
    var memorials = farewellDue && next.farewellAt === null
        ? (0, companion_life_1.pushMemorial)((_j = next.memorials) !== null && _j !== void 0 ? _j : [], {
            id: "farewell-".concat((_k = next.lifeStartedAt) !== null && _k !== void 0 ? _k : now),
            at: now,
            petName: next.petName,
            character: next.character,
            days: stageInfo.days,
            bond: Math.round(next.bond),
            growthPoints: Math.round(next.growthPoints),
            storyIndex: next.storyIndex,
            reason: 'farewell',
        })
        : next.memorials;
    return __assign(__assign({}, next), { farewellAt: farewellAt, messages: merged.messages, messageLedger: merged.ledger, memorials: memorials, lastStage: stageInfo.stage, healthBand: healthBand });
};
var applyLife = function (state, now) {
    var settled = (0, progression_1.settleTimedState)(state, now);
    return withLife(state, __assign({}, settled), settled.lastUpdated);
};
/** 重新领养 / 重置时保留纪念与设置，避免静默丢档；同一伙伴不会重复写入 */
var archiveCurrent = function (state, now, reason) {
    var _a;
    var existing = (_a = state.memorials) !== null && _a !== void 0 ? _a : [];
    // 已经为这次告别写过纪念：不再重复
    if (state.farewellAt !== null && existing.some(function (item) { return item.id === "farewell-".concat(state.lifeStartedAt); }))
        return existing;
    var identity = state.farewellAt !== null ? "farewell-".concat(state.farewellAt) : "rehomed-".concat(now);
    if (existing.some(function (item) { return item.id === identity; }))
        return existing;
    return (0, companion_life_1.pushMemorial)(existing, {
        id: identity,
        at: now,
        petName: state.petName,
        character: state.character,
        days: (0, companion_life_1.lifeStage)(state, now).days,
        bond: Math.round(state.bond),
        growthPoints: Math.round(state.growthPoints),
        storyIndex: state.storyIndex,
        reason: reason,
    });
};
exports.useGameStore = (0, zustand_1.create)()((0, middleware_1.persist)(function (set, get) { return (__assign(__assign({}, (0, save_1.freshSnapshot)()), { tick: function () { return set(function (state) { return applyLife(state, Date.now()); }); }, care: function (action) { return set(function (state) {
        if (state.farewellAt !== null)
            return __assign(__assign({}, state), { lastReply: '它正在安静休息。想继续陪伴的话，可以重新领养一位小伙伴。' });
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
        return withLife(state, __assign(__assign({}, settled), { needs: applyCareEffects(settled.needs, action), bond: nextBond, sparks: sparks, growthPoints: growthPoints, growthCooldownUntil: growthReady ? now + progression_1.CARE_GROWTH_COOLDOWN_MS : state.growthCooldownUntil, personalityScores: personalityScores, personalityFocus: personalityFocus, activeIncident: activeIncident, nextIncidentAt: nextIncidentAt, lastAction: action, actionNonce: state.actionNonce + 1, storyOpen: state.storyOpen || storyReady, lastReply: lastReply, lastInteractionAt: now }), now);
    }); }, completeActivity: function (gameId, score) { return set(function (state) {
        var _a;
        if (state.farewellAt !== null)
            return state;
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
        return withLife(state, __assign(__assign({}, settled), { sparks: state.sparks + reward, playStreak: playStreak, lastActivityDate: today, lastGrowthActivityDate: lastGrowthActivityDate, growthPoints: state.growthPoints + growthAward, personalityScores: personalityScores, personalityFocus: personalityFocus, activityBest: __assign(__assign({}, state.activityBest), (_a = {}, _a[gameId] = Math.max(state.activityBest[gameId], safeScore), _a)), needs: __assign(__assign({}, settled.needs), { joy: (0, types_1.clampNeed)(settled.needs.joy + Math.min(28, 8 + safeScore)), energy: (0, types_1.clampNeed)(settled.needs.energy - 6), hunger: (0, types_1.clampNeed)(settled.needs.hunger - 2) }), bond: (0, types_1.clampNeed)(state.bond + 2 + safeScore / 10), lastAction: 'activity', actionNonce: state.actionNonce + 1, lastReply: "".concat(state.petName, " found ").concat(reward, " Sparks").concat(growthMessage, " in the Tamagochi Arcade!"), lastInteractionAt: settled.lastUpdated }), settled.lastUpdated);
    }); }, chooseStory: function (choiceIndex) { return set(function (state) {
        if (state.farewellAt !== null)
            return state;
        var event = stories_1.STORY_EVENTS[state.storyIndex];
        var choice = event === null || event === void 0 ? void 0 : event.choices[choiceIndex];
        if (!choice)
            return state;
        var settled = (0, progression_1.settleTimedState)(state, Date.now());
        return withLife(state, __assign(__assign({}, settled), { bond: (0, types_1.clampNeed)(state.bond + choice.bond), needs: __assign(__assign({}, settled.needs), { joy: (0, types_1.clampNeed)(settled.needs.joy + choice.joy) }), personalityScores: (0, progression_1.applyTraitAward)(state.personalityScores, choice.trait, 5), personalityFocus: choice.trait, growthPoints: state.growthPoints + 12, storyIndex: state.storyIndex + 1, storyOpen: false, lastAction: 'story', actionNonce: state.actionNonce + 1, lastReply: "".concat(choice.reply, " \u00B7 +12 growth."), lastInteractionAt: settled.lastUpdated }), settled.lastUpdated);
    }); }, purchaseKeepsake: function (itemId) { return set(function (state) {
        if (state.farewellAt !== null)
            return state;
        if (!(0, progression_1.isKeepsakeId)(itemId) || !(0, progression_1.canPurchaseKeepsake)(state.sparks, state.ownedItemIds, itemId))
            return state;
        var item = progression_1.KEEPSAKE_BY_ID[itemId];
        return {
            sparks: state.sparks - item.cost,
            ownedItemIds: __spreadArray(__spreadArray([], __read(state.ownedItemIds), false), [itemId], false),
            lastAction: 'workshop',
            actionNonce: state.actionNonce + 1,
            lastInteractionAt: Date.now(),
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
    }); }, setHeadphones: function (on) { return set(function (state) { return (state.headphones === on === true ? state : __assign(__assign({}, state), { headphones: on === true, lastAction: 'workshop', actionNonce: state.actionNonce + 1, lastReply: null })); }); }, setLifeMode: function (mode) { return set(function (state) {
        if (state.lifeMode === mode)
            return state;
        if (state.farewellAt !== null)
            return __assign(__assign({}, state), { lastReply: '它已经安静告别了，模式切换不会让它回来。可以在纪念里回看，或重新领养。' });
        var now = Date.now();
        if (mode !== 'cycle') {
            return __assign(__assign({}, state), { lifeMode: 'gentle', lifeStartedAt: null, lastReply: '已回到温柔陪伴：它会一直陪着你，不会告别。' });
        }
        // 进入生命周期模式一律从当前时刻重新起算，旧档年龄不会立刻判为告别
        return __assign(__assign({}, state), { lifeMode: 'cycle', lifeStartedAt: now, farewellAt: null, lastReply: '生命周期模式已开启：从今天开始记录相处的日子。' });
    }); }, setQuiet: function (patch) { return set(function (state) { return ({ quiet: __assign(__assign({}, state.quiet), patch) }); }); }, setNotify: function (patch) { return set(function (state) { return ({ notify: __assign(__assign({}, state.notify), patch) }); }); }, recordNotification: function (sentAt) { return set(function (state) { return ({
        notify: (0, companion_life_1.markNotificationSent)(state.notify, sentAt),
    }); }); }, takeNotification: function (now, systemQuiet) {
        var state = get();
        var latest = state.messages.length ? state.messages[0] : null;
        if (!latest)
            return { ok: false, reason: '没有新消息' };
        if (latest.id === state.lastNotifiedMessageId)
            return { ok: false, reason: '这条消息已经处理过' };
        // 只发新产生的消息：勿扰期间积压的旧消息不补发
        if (now - latest.at > 90000) {
            set({ lastNotifiedMessageId: latest.id });
            return { ok: false, reason: '消息已过期，不补发' };
        }
        var decision = (0, companion_life_1.canSendNotification)(state.notify, state.quiet, now, systemQuiet);
        if (!decision.ok) {
            // 勿扰 / 达上限时不排队，之后也不补发
            set({ lastNotifiedMessageId: latest.id, notify: decision.settings });
            return { ok: false, reason: decision.reason };
        }
        set({ notify: decision.settings, lastNotifiedMessageId: latest.id });
        return { ok: true, reason: '可以发送', id: latest.id, title: '拓麻歌子', body: latest.text, vibrate: state.notify.vibrate };
    }, notificationPreview: function (now, systemQuiet) { return (0, companion_life_1.canSendNotification)(get().notify, get().quiet, now, systemQuiet); }, clearMessages: function () { return set({ messages: [] }); }, adoptAgain: function () { return set(function (state) {
        var now = Date.now();
        var fresh = (0, save_1.freshSnapshot)(now);
        return __assign(__assign({}, fresh), { 
            // 保留纪念与陪伴设置：重新领养不静默丢档
            memorials: archiveCurrent(state, now, state.farewellAt === null ? 'rehomed' : 'farewell'), quiet: state.quiet, notify: state.notify, lastReply: '新的小生命来到了口袋里。以前的相处记录都留在纪念里。' });
    }); }, exportSave: function () {
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
    }, reset: function () { return set(function (state) {
        var now = Date.now();
        return __assign(__assign({}, (0, save_1.freshSnapshot)(now)), { 
            // 重新领养前先把当前伙伴写入纪念，纪念与设置不会被静默删除
            memorials: archiveCurrent(state, now, 'rehomed'), quiet: state.quiet, notify: state.notify });
    }); } })); }, {
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
var allowed = ['tick','care','completeActivity','chooseStory','purchaseKeepsake','toggleKeepsake','openStory','closeStory','setTheme','setMode','setCharacter','setHeadphones','sootheEgg','setLifeMode','setQuiet','setNotify','recordNotification','takeNotification','notificationPreview','clearMessages','adoptAgain','exportSave','importSave','reset'];
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
  if (action === 'setLifeMode' && ['gentle','cycle'].indexOf(args[0]) < 0) throw new Error('生命周期模式错误');
  if (action === 'recordNotification' && !(typeof args[0] === 'number' && isFinite(args[0]))) throw new Error('通知时间错误');
  if ((action === 'takeNotification' || action === 'notificationPreview') && !(typeof args[0] === 'number' && isFinite(args[0]) && typeof args[1] === 'boolean')) throw new Error('通知参数错误');
  if (action === 'setTheme' && ['sakura','cyber','moss','moon'].indexOf(args[0]) < 0) throw new Error('主题错误');
  if (action === 'setCharacter' && ['star','block','sprout','bunny','fox','otter','owl','drake'].indexOf(args[0]) < 0) throw new Error('角色错误');
  if (action === 'completeActivity' && ['star-catch','memory-flip'].indexOf(args[0]) < 0) throw new Error('游戏类型错误');
  if (action === 'chooseStory' && !stories.isStoryUnlocked(state.storyIndex, state.bond)) throw new Error('这段回忆尚未解锁');
  if (action === 'setQuiet' || action === 'setNotify') {
    var patch = args[0];
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('设置格式错误');
    var keys = Object.keys(patch);
    keys.forEach(function(key) {
      var value = patch[key];
      if (action === 'setQuiet') {
        if (['manual','schedule','weekdaysOnly'].indexOf(key) >= 0 && typeof value === 'boolean') return;
        if (['startMinute','endMinute'].indexOf(key) >= 0 && typeof value === 'number' && isFinite(value) && value >= 0 && value < 1440 && value % 1 === 0) return;
      } else {
        if (['enabled','vibrate'].indexOf(key) >= 0 && typeof value === 'boolean') return;
        if (key === 'frequency' && ['low','normal'].indexOf(value) >= 0) return;
      }
      throw new Error('设置值无效');
    });
  }
  var result = game.getState()[action].apply(null, args);
  return JSON.stringify({ snapshot: game.getState(), result: result === undefined ? null : result });
}

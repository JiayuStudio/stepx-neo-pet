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

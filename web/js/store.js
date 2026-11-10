/* 状态与持久化：所有数据只保存在本机 localStorage，不联网、不上传。
 * 主面板与桌面悬浮窗同源，通过 storage 事件实时同步。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, M = MC.model, H = MC.host, L = MC.lunar;

  var STORAGE_KEY = 'otools-daymark.v1';
  var listeners = [];
  var data = M.emptyData();
  var persistOk = true;

  var ui = {
    ready: false,
    view: 'today',
    theme: 'light',
    host: false,
    lang: 'zh-CN',
    storageOk: true,
    onboarding: false,
    floatMode: false,
    eventFilter: 'all',
    eventQuery: '',
    showArchived: false,
    reminderDismissed: false,
  };

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      persistOk = true;
    } catch (e) {
      persistOk = false;
      ui.storageOk = false;
    }
  }

  function notify() {
    for (var i = 0; i < listeners.length; i += 1) {
      try { listeners[i](); } catch (e) { console.error('[daymark] render error', e); }
    }
  }
  function touch() { persist(); notify(); }
  function subscribe(fn) { listeners.push(fn); }

  function resolveTheme() {
    var mode = data.settings.themeMode;
    if (mode === 'light' || mode === 'dark') return mode;
    var h = H.hostTheme();
    if (h === 'dark' || h === 'light') return h;
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }

  function applyTheme() {
    ui.theme = resolveTheme();
    document.documentElement.setAttribute('data-theme', ui.theme);
    document.documentElement.setAttribute('data-accent', data.settings.accent || 'coral');
  }

  function reloadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = M.normalize(JSON.parse(raw));
    } catch (e) { ui.storageOk = false; }
    applyTheme();
    notify();
  }

  function init(options) {
    var opts = options || {};
    ui.host = H.available();
    ui.lang = H.language();
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = M.normalize(JSON.parse(raw));
    } catch (e) { data = M.emptyData(); ui.storageOk = false; }

    var query = {};
    try { new URLSearchParams(location.search).forEach(function (v, k) { query[k] = v; }); } catch (e) {}
    ui.floatMode = query.float === '1';
    if (query.reset === '1') data = M.emptyData();
    if ((query.demo === '1' || opts.demo) && !data.events.length) { data = MC.demo.build(); data.seen = true; }
    if (query.theme === 'dark' || query.theme === 'light') data.settings.themeMode = query.theme;
    if (query.accent && M.ACCENTS.some(function (a) { return a.id === query.accent; })) data.settings.accent = query.accent;
    if (query.reset === '1' || query.demo === '1') persist();

    applyTheme();
    ui.onboarding = !data.seen && !ui.floatMode;
    ui.ready = true;
    notify();
    return data;
  }

  // 悬浮窗 / 主面板之间：任一窗口写入，另一个窗口立即重绘（不回写，避免循环）。
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY || e.key === null) reloadFromStorage();
  });

  /* ── 设置 ─────────────────────────────────────────────── */
  function setSettings(patch) {
    Object.keys(patch || {}).forEach(function (k) { data.settings[k] = patch[k]; });
    var s = data.settings;
    s.defaultRemind = U.clamp(Math.round(Number(s.defaultRemind) || 0), 0, 30);
    s.floatCount = U.clamp(Math.round(Number(s.floatCount) || 3), 1, 6);
    s.nickname = String(s.nickname || '').slice(0, 20);
    if (!['light', 'dark', 'auto'].includes(s.themeMode)) s.themeMode = 'light';
    if (!M.ACCENTS.some(function (a) { return a.id === s.accent; })) s.accent = 'coral';
    if (!['time', 'created', 'name'].includes(s.sort)) s.sort = 'time';
    if (!['grid', 'list'].includes(s.viewMode)) s.viewMode = 'grid';
    applyTheme();
    touch();
  }

  /* ── 事件 CRUD ────────────────────────────────────────── */
  function getEvent(id) {
    for (var i = 0; i < data.events.length; i += 1) if (data.events[i].id === id) return data.events[i];
    return null;
  }

  function syncLunar(ev) {
    var lunarRepeat = ev.repeat === 'lunar-yearly' || ev.repeat === 'lunar-monthly';
    if (ev.calendar === 'lunar' || lunarRepeat) {
      var l = L.solarToLunar(ev.date);
      ev.lunar = l ? { year: l.year, month: l.month, day: l.day, leap: l.leap } : null;
      if (!l) {
        ev.calendar = 'solar';
        if (ev.repeat === 'lunar-yearly') ev.repeat = 'yearly';
        if (ev.repeat === 'lunar-monthly') ev.repeat = 'monthly';
      }
    } else {
      ev.lunar = null;
    }
    return ev;
  }

  function addEvent(ev) {
    if (ev.mode === 'countup') { ev.repeat = 'none'; ev.repeatEvery = 1; }
    ev.repeatEvery = M.every(ev);
    var v = M.validate(syncLunar(ev));
    if (!v.ok) return v;
    ev.title = String(ev.title).trim().slice(0, 40);
    ev.remindDays = U.clamp(Number(ev.remindDays) || 0, 0, 30);
    data.events.push(ev);
    touch();
    return { ok: true, id: ev.id };
  }

  function updateEvent(id, patch) {
    var cur = getEvent(id);
    if (!cur) return { ok: false, reason: 'not-found' };
    var next = Object.assign({}, cur, patch);
    if (next.mode === 'countup') { next.repeat = 'none'; next.repeatEvery = 1; }
    next.repeatEvery = M.every(next);
    var v = M.validate(syncLunar(next));
    if (!v.ok) return v;
    next.title = String(next.title).trim().slice(0, 40);
    next.remindDays = U.clamp(Number(next.remindDays) || 0, 0, 30);
    data.events[data.events.indexOf(cur)] = next;
    touch();
    return { ok: true };
  }

  function deleteEvent(id) {
    var n = data.events.length;
    data.events = data.events.filter(function (e) { return e.id !== id; });
    if (data.events.length !== n) touch();
  }

  function togglePin(id) { var e = getEvent(id); if (e) { e.pinned = !e.pinned; touch(); } }
  function toggleArchive(id) { var e = getEvent(id); if (e) { e.archived = !e.archived; touch(); } }

  function duplicateEvent(id) {
    var e = getEvent(id);
    if (!e) return;
    var copy = JSON.parse(JSON.stringify(e));
    copy.id = U.uid();
    copy.title = e.title + '（副本）';
    copy.createdAt = Date.now();
    copy.pinned = false; copy.archived = false;
    data.events.push(copy);
    touch();
  }

  /* ── 查询 ─────────────────────────────────────────────── */
  function computed(e) {
    return Object.assign({}, e, M.compute(e, U.today()));
  }

  function listEvents(includeArchived) {
    var q = String(ui.eventQuery || '').trim().toLowerCase();
    var out = data.events.filter(function (e) {
      if (e.archived && !includeArchived) return false;
      if (ui.eventFilter !== 'all' && e.category !== ui.eventFilter) return false;
      if (q && (e.title + ' ' + (e.note || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).map(computed);
    var sort = data.settings.sort;
    if (sort === 'created') {
      out.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    } else if (sort === 'name') {
      out.sort(function (a, b) { return a.title.localeCompare(b.title, 'zh-CN'); });
    } else {
      out.sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return Math.abs(a.days) - Math.abs(b.days);
      });
    }
    return out;
  }

  function activeEvents() { return data.events.filter(function (e) { return !e.archived; }); }

  function upcoming(limit) {
    return activeEvents().map(computed)
      .filter(function (e) { return e.mode === 'countdown' && e.days >= 0; })
      .sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.days - b.days;
      })
      .slice(0, limit || 5);
  }

  function reminders() {
    return activeEvents().map(computed).filter(function (e) {
      return e.mode === 'countdown' && e.days >= 0 && e.days <= e.remindDays;
    }).sort(function (a, b) { return a.days - b.days; });
  }

  function stats() {
    var all = data.events;
    var active = activeEvents();
    var byCat = {};
    M.CATEGORIES.forEach(function (c) { byCat[c.id] = 0; });
    active.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + 1; });
    var countup = active.filter(function (e) { return e.mode === 'countup'; }).length;
    var repeating = active.filter(function (e) { return e.repeat !== 'none'; }).length;
    var week = active.filter(function (e) {
      return e.mode === 'countdown' && e.days >= 0 && e.days <= 7;
    }).length;
    return {
      total: all.length, active: active.length, archived: all.length - active.length,
      countup: countup, countdown: active.length - countup, repeating: repeating,
      week: week, byCat: byCat,
    };
  }

  /** 下一个整百 / 整千天里程碑（正数日） */
  function milestones() {
    var out = [];
    activeEvents().forEach(function (e) {
      if (e.mode !== 'countup') return;
      var c = computed(e);
      var marks = [100, 365, 500, 1000, 2000, 3000, 5000, 10000];
      for (var i = 0; i < marks.length; i += 1) {
        if (marks[i] > c.abs && marks[i] - c.abs <= 365) {
          out.push({ title: e.title, mark: marks[i], left: marks[i] - c.abs, color: e.color });
          break;
        }
      }
    });
    return out.sort(function (a, b) { return a.left - b.left; }).slice(0, 5);
  }

  /* ── 数据管理 ─────────────────────────────────────────── */
  function serialize() {
    return JSON.stringify({ app: 'otools-daymark', version: 1, exportedAt: new Date().toISOString(), data: data }, null, 2);
  }
  function parseImport(text) {
    var obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object') throw new Error('文件内容不是有效的 JSON');
    var n = M.normalize(obj);
    if (!n.events.length) throw new Error('文件里没有可导入的日子');
    return n;
  }
  function importData(text) {
    var next = parseImport(text);
    var keep = { themeMode: data.settings.themeMode, accent: data.settings.accent, privacyMode: data.settings.privacyMode };
    next.settings = Object.assign(next.settings, keep);
    next.seen = true;
    data = next;
    ui.onboarding = false;
    ui.eventFilter = 'all'; ui.eventQuery = '';
    touch();
    return { events: data.events.length };
  }
  function resetRecords() {
    var settings = JSON.parse(JSON.stringify(data.settings));
    data = M.emptyData();
    data.settings = settings;
    data.seen = true;
    ui.onboarding = false;
    ui.eventFilter = 'all'; ui.eventQuery = ''; ui.showArchived = false;
    touch();
  }
  function loadDemo() {
    var keep = { themeMode: data.settings.themeMode, accent: data.settings.accent, privacyMode: data.settings.privacyMode };
    data = MC.demo.build();
    data.settings = Object.assign(data.settings, keep);
    ui.onboarding = false;
    touch();
  }
  function markSeen() { if (data.seen) return; data.seen = true; touch(); }
  function setRoute(view) { ui.view = view; notify(); }

  MC.store = {
    STORAGE_KEY: STORAGE_KEY,
    ui: ui,
    get data() { return data; },
    get persistOk() { return persistOk; },
    init: init, subscribe: subscribe, notify: notify, applyTheme: applyTheme,
    reloadFromStorage: reloadFromStorage, setSettings: setSettings,
    getEvent: getEvent, addEvent: addEvent, updateEvent: updateEvent, deleteEvent: deleteEvent,
    togglePin: togglePin, toggleArchive: toggleArchive, duplicateEvent: duplicateEvent,
    computed: computed, listEvents: listEvents, activeEvents: activeEvents,
    upcoming: upcoming, reminders: reminders, stats: stats, milestones: milestones,
    serialize: serialize, parseImport: parseImport, importData: importData,
    resetRecords: resetRecords, loadDemo: loadDemo, markSeen: markSeen, setRoute: setRoute,
  };
})();

/* 朝夕 · 倒数日：事件模型、模板、重复规则、天数与进度计算。
 * 周期倒数统一用「第 k 次发生日」模型：按周 / 月 / 季度 / 年（公历与农历），
 * 并支持 repeatEvery（每 N 个周期重复一次，1–12）。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;

  var CATEGORIES = [
    { id: 'birthday', name: '生日', color: '#E8845F', icon: 'cake', repeat: 'yearly' },
    { id: 'anniversary', name: '纪念日', color: '#D9607E', icon: 'heart', repeat: 'yearly' },
    { id: 'exam', name: '考试', color: '#5B72C8', icon: 'graduation', repeat: 'none' },
    { id: 'work', name: '工作', color: '#3D8C86', icon: 'briefcase', repeat: 'none' },
    { id: 'trip', name: '旅行', color: '#C9973F', icon: 'plane', repeat: 'none' },
    { id: 'festival', name: '节日', color: '#9B6FC4', icon: 'sparkle', repeat: 'yearly' },
    { id: 'other', name: '其他', color: '#7C8493', icon: 'star', repeat: 'none' },
  ];

  var REPEATS = [
    { id: 'none', name: '不重复' },
    { id: 'weekly', name: '按周（公历）' },
    { id: 'monthly', name: '按月（公历）' },
    { id: 'quarterly', name: '按季度（公历）' },
    { id: 'yearly', name: '按年（公历）' },
    { id: 'lunar-monthly', name: '按月（农历）' },
    { id: 'lunar-yearly', name: '按年（农历）' },
  ];

  var REPEAT_UNIT = {
    weekly: '周', monthly: '个月', quarterly: '季度', yearly: '年',
    'lunar-monthly': '个农历月', 'lunar-yearly': '年',
  };

  var MODES = [
    { id: 'countdown', name: '倒数日', hint: '还有多少天' },
    { id: 'countup', name: '正数日', hint: '已经多少天' },
  ];

  var ACCENTS = [
    { id: 'coral', name: '珊瑚', color: '#E8654B' },
    { id: 'indigo', name: '靛蓝', color: '#4F6BED' },
    { id: 'jade', name: '青绿', color: '#2FA37C' },
    { id: 'violet', name: '紫藤', color: '#8B5CF6' },
  ];

  /* 快捷模板：一键创建时预填分类 / 图标 / 重复规则 */
  var TEMPLATES = [
    { id: 'birthday', name: '生日', desc: '每年重复，可切农历', category: 'birthday', icon: 'cake', repeat: 'yearly', mode: 'countdown', title: '' },
    { id: 'anniversary', name: '纪念日', desc: '恋爱、结婚、相识', category: 'anniversary', icon: 'heart', repeat: 'yearly', mode: 'countdown', title: '' },
    { id: 'exam', name: '考试', desc: '中考、考研、资格证', category: 'exam', icon: 'graduation', repeat: 'none', mode: 'countdown', title: '' },
    { id: 'work', name: '项目 / 截止日', desc: '交付、汇报、还款', category: 'work', icon: 'briefcase', repeat: 'none', mode: 'countdown', title: '' },
    { id: 'quarterly', name: '季度 / 周期', desc: '按周、月、季度、年重复', category: 'work', icon: 'repeat', repeat: 'quarterly', mode: 'countdown', title: '' },
    { id: 'trip', name: '旅行', desc: '出发日与行程', category: 'trip', icon: 'plane', repeat: 'none', mode: 'countdown', title: '' },
    { id: 'festival', name: '节日', desc: '每年重复的日子', category: 'festival', icon: 'sparkle', repeat: 'yearly', mode: 'countdown', title: '' },
    { id: 'countup', name: '正数日', desc: '记录已经过去多少天', category: 'anniversary', icon: 'clock', repeat: 'none', mode: 'countup', title: '' },
  ];

  var COLORS = ['#E8654B', '#E8845F', '#C9973F', '#2FA37C', '#3D8C86',
    '#4F6BED', '#5B72C8', '#8B5CF6', '#D9607E', '#9B6FC4', '#7C8493'];

  var ICONS = ['star', 'heart', 'cake', 'gift', 'graduation', 'briefcase', 'plane',
    'flag', 'target', 'sparkle', 'bell', 'clock', 'hourglass', 'sun', 'moon', 'flower'];

  var DEFAULT_SETTINGS = {
    themeMode: 'light',
    accent: 'coral',
    privacyMode: false,
    showLunar: true,
    defaultRemind: 3,
    sort: 'time',
    viewMode: 'grid',
    floatCount: 3,
    floatAlwaysOnTop: true,
    floatAutoOpen: false,
    nickname: '',
  };

  function mod(n, m) { return ((n % m) + m) % m; }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  /** 构造 y-m-d；日超出当月天数时收敛到月末（每月重复的 31 号） */
  function clampDate(y, m, d) {
    while (m > 12) { y += 1; m -= 12; }
    while (m < 1) { y -= 1; m += 12; }
    return U.key(new Date(y, m - 1, Math.min(d, daysInMonth(y, m))));
  }

  function categoryOf(id) {
    for (var i = 0; i < CATEGORIES.length; i += 1) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }

  /** 每 N 个周期；旧数据没有该字段时按 1 处理 */
  function every(ev) { return U.clamp(Math.round(Number(ev && ev.repeatEvery) || 1), 1, 12); }

  function repeatLabel(ev) {
    if (!ev || ev.mode === 'countup' || ev.repeat === 'none') return ev && ev.mode === 'countup' ? '正数日' : '仅一次';
    var n = every(ev);
    var base = REPEATS.filter(function (r) { return r.id === ev.repeat; })[0];
    var name = base ? base.name : '仅一次';
    if (n === 1) return name;
    return '每 ' + n + ' ' + (REPEAT_UNIT[ev.repeat] || '个周期') + '一次';
  }

  function emptyEvent() {
    return {
      id: U.uid(),
      title: '',
      date: U.today(),
      calendar: 'solar',
      lunar: null,
      mode: 'countdown',
      repeat: 'none',
      repeatEvery: 1,
      category: 'other',
      color: categoryOf('other').color,
      icon: 'star',
      note: '',
      remindDays: DEFAULT_SETTINGS.defaultRemind,
      pinned: false,
      archived: false,
      createdAt: Date.now(),
    };
  }

  function fromTemplate(tplId) {
    var tpl = TEMPLATES.filter(function (t) { return t.id === tplId; })[0];
    var ev = emptyEvent();
    if (!tpl) return ev;
    ev.category = tpl.category;
    ev.icon = tpl.icon;
    ev.repeat = tpl.repeat;
    ev.mode = tpl.mode;
    ev.color = categoryOf(tpl.category).color;
    return ev;
  }

  function emptyData() {
    return {
      version: 1,
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      events: [],
      seen: false,
      createdAt: Date.now(),
    };
  }

  /** 第 k 次发生日（k 可为负，用于求上一个周期；k=0 恒为原始日期） */
  function occurrenceAt(ev, k) {
    if (ev.repeat === 'none') return ev.date;
    if (k === 0) return ev.date;
    var n = every(ev);
    var base = U.parse(ev.date);
    var by = base.getFullYear();
    var bm = base.getMonth() + 1;
    var bd = base.getDate();
    var step = ev.repeat === 'monthly' ? n
      : ev.repeat === 'quarterly' ? 3 * n
        : ev.repeat === 'yearly' ? 12 * n : 0;

    if (ev.repeat === 'weekly') return U.addDays(ev.date, k * 7 * n);
    if (step) return clampDate(by, bm + k * step, bd);

    if (ev.lunar && MC.lunar) {
      var L = ev.lunar;
      if (ev.repeat === 'lunar-yearly') {
        return MC.lunar.lunarToSolar(L.year + k * n, L.month, L.day, L.leap) || null;
      }
      if (ev.repeat === 'lunar-monthly') {
        var total = L.year * 12 + (L.month - 1) + k * n;
        var y = Math.floor(total / 12);
        var m = mod(total, 12) + 1;
        // 农历月只有 29 或 30 天：三十在无三十的月份自动收敛到廿九
        return MC.lunar.lunarToSolar(y, m, L.day, false)
          || MC.lunar.lunarToSolar(y, m, Math.min(L.day, 29), false) || null;
      }
    }
    return null;
  }

  /** 估算 from 落在第几个周期，后面再用前后探测做精确修正 */
  function guessIndex(ev, from) {
    var days = U.diff(ev.date, from);
    var n = every(ev);
    var span = {
      weekly: 7 * n, monthly: 30.44 * n, quarterly: 91.31 * n, yearly: 365.25 * n,
      'lunar-monthly': 29.53 * n, 'lunar-yearly': 354.37 * n,
    }[ev.repeat] || 0;
    if (!span) return 0;
    return Math.max(0, Math.floor(days / span));
  }

  /** 找到 >= from 的第一个发生日，并返回它的周期序号（供进度环取上一个周期） */
  function findOccurrence(ev, from) {
    if (ev.repeat === 'none' || from < ev.date) return { key: ev.date, index: 0 };
    var k = guessIndex(ev, from);
    var occ = occurrenceAt(ev, k);
    var guard = 0;
    if (!occ && k > 0) { k -= 1; occ = occurrenceAt(ev, k); }
    // 估算偏小：向后推进
    while (occ && occ < from && guard < 600) { guard += 1; k += 1; occ = occurrenceAt(ev, k); }
    // 估算偏大：向前回退到仍是 >= from 的最小序号
    while (k > 0 && occ && guard < 1200) {
      guard += 1;
      var p = occurrenceAt(ev, k - 1);
      if (p && p >= from) { k -= 1; occ = p; } else break;
    }
    if (!occ) return { key: ev.date, index: 0 };
    return { key: occ, index: k };
  }

  /** 下一次（或当天）发生日 */
  function nextFor(ev, from) { return findOccurrence(ev, from).key; }

  /** 上一次发生日（用于进度环；不重复事件用创建日兜底） */
  function prevFor(ev, today) {
    var t = today || U.today();
    var found = findOccurrence(ev, t);
    if (ev.repeat === 'none') {
      var created = new Date(Number(ev.createdAt) || Date.now());
      var ck = U.key(created);
      return ck < ev.date ? ck : U.addDays(found.key, -100);
    }
    return occurrenceAt(ev, found.index - 1) || U.addDays(found.key, -7 * every(ev));
  }

  /** days = 目标日 − 今天（正数=还有，负数=已过） */
  function compute(ev, today) {
    var t = today || U.today();
    var target = ev.mode === 'countup' ? ev.date : nextFor(ev, t);
    var days = U.diff(t, target);
    var prev = prevFor(ev, t);
    var total = Math.max(1, U.diff(prev, target));
    var elapsed = U.clamp(U.diff(prev, t), 0, total);
    return {
      target: target,
      days: days,
      abs: Math.abs(days),
      state: days > 0 ? 'future' : days < 0 ? 'past' : 'today',
      repeating: ev.repeat !== 'none' && ev.mode === 'countdown',
      prev: prev,
      total: total,
      progress: elapsed / total,
    };
  }

  function validate(ev) {
    if (!ev || !String(ev.title || '').trim()) return { ok: false, reason: '请填写日子名称' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.date || '')) return { ok: false, reason: '日期格式不正确' };
    var lunarRepeat = ev.repeat === 'lunar-yearly' || ev.repeat === 'lunar-monthly';
    if ((ev.calendar === 'lunar' || lunarRepeat) && !ev.lunar) {
      return { ok: false, reason: '农历日期无效，请检查年月日与闰月' };
    }
    return { ok: true };
  }

  function normalize(raw) {
    var base = emptyData();
    if (!raw || typeof raw !== 'object') return base;
    var src = (raw.data && typeof raw.data === 'object') ? raw.data : raw;
    var s = src.settings || {};
    Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(s, k)) base.settings[k] = s[k];
    });
    if (!['light', 'dark', 'auto'].includes(base.settings.themeMode)) base.settings.themeMode = 'light';
    if (!ACCENTS.some(function (a) { return a.id === base.settings.accent; })) base.settings.accent = 'coral';
    if (!['time', 'created', 'name'].includes(base.settings.sort)) base.settings.sort = 'time';
    if (!['grid', 'list'].includes(base.settings.viewMode)) base.settings.viewMode = 'grid';
    base.settings.privacyMode = !!base.settings.privacyMode;
    base.settings.showLunar = base.settings.showLunar !== false;
    base.settings.floatAlwaysOnTop = base.settings.floatAlwaysOnTop !== false;
    base.settings.floatAutoOpen = !!base.settings.floatAutoOpen;
    base.settings.defaultRemind = U.clamp(Number(base.settings.defaultRemind) || 0, 0, 30);
    base.settings.floatCount = U.clamp(Number(base.settings.floatCount) || 3, 1, 6);
    base.settings.nickname = String(base.settings.nickname || '').slice(0, 20);

    var list = Array.isArray(src.events) ? src.events : [];
    base.events = list.filter(function (e) { return e && typeof e === 'object'; }).map(function (e) {
      var ev = emptyEvent();
      Object.keys(ev).forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(e, k)) ev[k] = e[k];
      });
      ev.id = String(e.id || U.uid()).slice(0, 40);
      ev.title = String(e.title || '未命名').slice(0, 40);
      ev.date = /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : U.today();
      ev.calendar = e.calendar === 'lunar' ? 'lunar' : 'solar';
      ev.mode = e.mode === 'countup' ? 'countup' : 'countdown';
      if (ev.mode === 'countup') { ev.repeat = 'none'; ev.repeatEvery = 1; }
      if (!REPEATS.some(function (r) { return r.id === ev.repeat; })) ev.repeat = 'none';
      ev.repeatEvery = U.clamp(Math.round(Number(e.repeatEvery) || 1), 1, 12);
      if (!CATEGORIES.some(function (c) { return c.id === ev.category; })) ev.category = 'other';
      ev.color = /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : categoryOf(ev.category).color;
      ev.icon = typeof e.icon === 'string' && e.icon.length < 30 ? e.icon : 'star';
      ev.note = String(e.note || '').slice(0, 500);
      ev.remindDays = U.clamp(Number(e.remindDays) || 0, 0, 30);
      ev.pinned = !!e.pinned;
      ev.archived = !!e.archived;
      ev.createdAt = Number(e.createdAt) || Date.now();
      ev.lunar = e.lunar && typeof e.lunar === 'object' ? {
        year: U.clamp(Number(e.lunar.year) || U.parse(ev.date).getFullYear(), 1900, 2100),
        month: U.clamp(Number(e.lunar.month) || 1, 1, 12),
        day: U.clamp(Number(e.lunar.day) || 1, 1, 30),
        leap: !!e.lunar.leap,
      } : null;
      return ev;
    });
    base.seen = !!src.seen;
    base.createdAt = Number(src.createdAt) || Date.now();
    return base;
  }

  MC.model = {
    CATEGORIES: CATEGORIES,
    REPEATS: REPEATS,
    REPEAT_UNIT: REPEAT_UNIT,
    MODES: MODES,
    ACCENTS: ACCENTS,
    TEMPLATES: TEMPLATES,
    COLORS: COLORS,
    ICONS: ICONS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    emptyEvent: emptyEvent,
    fromTemplate: fromTemplate,
    emptyData: emptyData,
    normalize: normalize,
    compute: compute,
    nextFor: nextFor,
    prevFor: prevFor,
    every: every,
    repeatLabel: repeatLabel,
    occurrenceAt: occurrenceAt,
    findOccurrence: findOccurrence,
    validate: validate,
    clampDate: clampDate,
    categoryOf: categoryOf,
  };
})();

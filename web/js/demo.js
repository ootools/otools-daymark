/* 示例数据：全部相对「今天」生成，任何时候打开都能看到合理的天数。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, M = MC.model, L = MC.lunar;

  function lunarOf(k) {
    var l = L.solarToLunar(k);
    return l ? { year: l.year, month: l.month, day: l.day, leap: l.leap } : null;
  }

  function ev(o) {
    var base = M.emptyEvent();
    Object.keys(o).forEach(function (k) { base[k] = o[k]; });
    if (base.calendar === 'lunar' || base.repeat === 'lunar-yearly' || base.repeat === 'lunar-monthly') {
      base.lunar = lunarOf(base.date);
      if (!base.lunar) { base.calendar = 'solar'; base.repeat = 'yearly'; }
    }
    return base;
  }

  function build() {
    var t = U.today();
    var y = U.parse(t).getFullYear();
    var M2 = M.CATEGORIES;
    function cat(id) { return M2.filter(function (c) { return c.id === id; })[0]; }

    // 明年春节（农历正月初一）作为农历重复的示例
    var spring = L.lunarToSolar(y + 1, 1, 1, false) || U.addDays(t, 90);
    var momLunar = L.lunarToSolar(y, 8, 15, false) || U.addDays(t, 40);
    if (momLunar < t) momLunar = L.lunarToSolar(y + 1, 8, 15, false) || U.addDays(t, 300);

    var list = [
      ev({
        title: '研究生考试', date: U.addDays(t, 46), category: 'exam',
        icon: 'graduation', color: cat('exam').color, pinned: true,
        repeat: 'none', note: '最后一个月，稳住节奏。', remindDays: 7,
      }),
      ev({
        title: '妈妈的生日', date: momLunar, category: 'birthday', calendar: 'lunar',
        icon: 'cake', color: cat('birthday').color, pinned: true,
        repeat: 'lunar-yearly', note: '农历八月十五，记得提前订蛋糕。', remindDays: 7,
      }),
      ev({
        title: '相识纪念日', date: U.addDays(t, -820), category: 'anniversary',
        icon: 'heart', color: cat('anniversary').color, mode: 'countup',
        repeat: 'none', note: '从那天起，日子有了刻度。',
      }),
      ev({
        title: '春节 · 回家', date: spring, category: 'festival', calendar: 'lunar',
        icon: 'sparkle', color: cat('festival').color, repeat: 'lunar-yearly',
        note: '提前抢票，陪家人吃年夜饭。', remindDays: 15,
      }),
      ev({
        title: '项目交付', date: U.addDays(t, 12), category: 'work',
        icon: 'briefcase', color: cat('work').color, note: '联调 + 验收材料。', remindDays: 3,
      }),
      ev({
        title: '季度复盘', date: U.addDays(t, 34), category: 'work',
        icon: 'repeat', color: cat('work').color, repeat: 'quarterly',
        note: '每三个月回看一次目标与节奏。', remindDays: 5,
      }),
      ev({
        title: '周末长跑', date: U.addDays(t, 3), category: 'other',
        icon: 'target', color: '#2FA37C', repeat: 'weekly', repeatEvery: 2, note: '每两周一次十公里，别偷懒。',
      }),
      ev({
        title: '北海道旅行', date: U.addDays(t, 88), category: 'trip',
        icon: 'plane', color: cat('trip').color, note: '护照、机票、温泉旅馆。', remindDays: 10,
      }),
      ev({
        title: '房租缴纳', date: U.addDays(t, 18), category: 'other',
        icon: 'bell', color: '#C9973F', repeat: 'monthly', note: '每月 10 号前转账。',
      }),
      ev({
        title: '已归档 · 上一次体检', date: U.addDays(t, -120), category: 'other',
        icon: 'heart', color: '#7C8493', archived: true, repeat: 'yearly',
        note: '每年体检一次，留着做记录。',
      }),
    ];

    var data = M.emptyData();
    data.events = list;
    data.seen = true;
    return data;
  }

  MC.demo = { build: build };
})();

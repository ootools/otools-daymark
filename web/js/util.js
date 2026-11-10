/* 通用工具：日期、格式化、转义。全部使用本地时区，避免 toISOString 的 UTC 偏移。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function key(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parse(k) {
    var p = String(k).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  function addDays(k, n) {
    var d = parse(k);
    d.setDate(d.getDate() + n);
    return key(d);
  }

  /** b - a，单位：天 */
  function diff(a, b) {
    return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
  }

  function today() { return key(new Date()); }

  function monthGrid(year, month) {
    var first = new Date(year, month - 1, 1);
    var shift = (first.getDay() + 6) % 7; // 周一为每周第一天
    var start = new Date(year, month - 1, 1 - shift);
    var t = today();
    var out = [];
    for (var i = 0; i < 42; i += 1) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var k = key(d);
      out.push({
        key: k,
        day: d.getDate(),
        inMonth: d.getMonth() === month - 1,
        isToday: k === t,
        weekday: (d.getDay() + 6) % 7,
      });
    }
    return out;
  }

  var WEEK = ['一', '二', '三', '四', '五', '六', '日'];

  function weekdayCN(k) { return '周' + WEEK[(parse(k).getDay() + 6) % 7]; }

  function cnDate(k, withYear) {
    var d = parse(k);
    return (withYear ? d.getFullYear() + '年' : '') + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function cnDateFull(k) { return cnDate(k, true) + ' · ' + weekdayCN(k); }

  function monthLabel(year, month) { return year + ' 年 ' + month + ' 月'; }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function round1(n) { return Math.round(Number(n) * 10) / 10; }

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function mean(list) {
    if (!list.length) return 0;
    var sum = 0;
    for (var i = 0; i < list.length; i += 1) sum += list[i];
    return sum / list.length;
  }

  function stddev(list) {
    if (list.length < 2) return 0;
    var m = mean(list);
    var sum = 0;
    for (var i = 0; i < list.length; i += 1) sum += Math.pow(list[i] - m, 2);
    return Math.sqrt(sum / list.length);
  }

  /** 把日期字符串排序（升序） */
  function sortKeys(list) { return list.slice().sort(); }

  /** 相对今天的自然语言（用于记录列表） */
  function relative(k) {
    var t = today();
    var d = diff(t, k);
    if (d === 0) return '今天';
    if (d === -1) return '昨天';
    if (d === 1) return '明天';
    if (d === -2) return '前天';
    return cnDate(k, k.slice(0, 4) !== t.slice(0, 4));
  }

  MC.util = {
    pad: pad, key: key, parse: parse, addDays: addDays, diff: diff, today: today,
    monthGrid: monthGrid, weekdayCN: weekdayCN, cnDate: cnDate, cnDateFull: cnDateFull,
    monthLabel: monthLabel, esc: esc, clamp: clamp, round1: round1, uid: uid,
    mean: mean, stddev: stddev, sortKeys: sortKeys, relative: relative, WEEK: WEEK,
  };
})();

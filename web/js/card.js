/* 日子卡片：主面板网格 / 列表、时间轴、悬浮窗共用的渲染片段。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, M = MC.model, I = MC.icons.icon;

  var REPEAT_NAME = {
    'none': '仅一次', 'weekly': '每周', 'monthly': '每月', 'quarterly': '每季度',
    'yearly': '每年', 'lunar-monthly': '农历每月', 'lunar-yearly': '农历每年',
  };

  function repeatName(e) {
    if (e.mode === 'countup') return '正数日';
    var n = M.every(e);
    var unit = M.REPEAT_UNIT[e.repeat];
    if (!unit || e.repeat === 'none' || n === 1) return REPEAT_NAME[e.repeat] || '仅一次';
    return '每 ' + n + ' ' + unit;
  }

  function stateText(e) {
    if (e.mode === 'countup') return { label: '已经', num: e.abs, unit: '天' };
    if (e.state === 'today') return { label: '就是今天', num: '', unit: '' };
    if (e.state === 'past') return { label: '已过去', num: e.abs, unit: '天' };
    return { label: '还有', num: e.days, unit: '天' };
  }

  function dateText(e) {
    var s = U.cnDate(e.target, U.parse(e.target).getFullYear() !== new Date().getFullYear());
    var extra = U.weekdayCN(e.target);
    if ((MC.store.data.settings.showLunar || e.calendar === 'lunar') && MC.lunar.inRange(e.target)) {
      var l = MC.lunar.solarToLunar(e.target);
      if (l) extra = '农历' + l.monthCN + l.dayCN;
    }
    return s + ' · ' + extra;
  }

  function privacy(text) {
    return '<span class="privacy-blur">' + U.esc(text) + '</span>';
  }

  function figure(e, size) {
    var s = stateText(e);
    if (e.state === 'today' && e.mode !== 'countup') {
      return '<div class="figure figure-' + (size || 'md') + '">' +
        '<span class="figure-word">就是今天</span></div>';
    }
    return '<div class="figure figure-' + (size || 'md') + '">' +
      (s.label ? '<span class="figure-label">' + s.label + '</span>' : '') +
      '<span class="figure-num">' + s.num + '</span>' +
      (s.unit ? '<span class="figure-unit">' + s.unit + '</span>' : '') +
      '</div>';
  }

  function rail(color) { return '<span class="card-rail" style="background:' + U.esc(color) + '"></span>'; }

  function category(e) { return M.categoryOf(e.category); }

  /** 网格 / 列表卡片 */
  function render(e, mode) {
    var list = mode === 'list';
    var c = category(e);
    var pinned = e.pinned ? '<span class="card-pin" title="已置顶">' + I('pin', 13) + '</span>' : '';
    var archived = e.archived ? '<span class="card-archived">已归档</span>' : '';
    var progress = Math.round(U.clamp(e.progress || 0, 0, 1) * 100);
    return '<article class="event-card' + (list ? ' is-list' : '') + '" style="--card-accent:' + U.esc(e.color) + '" data-id="' + U.esc(e.id) + '">' +
      rail(e.color) +
      '<div class="card-main">' +
        '<div class="card-head">' +
          '<span class="card-icon">' + I(e.icon, 19) + '</span>' +
          '<div class="card-name"><h3>' + privacy(e.title) + '</h3>' +
            '<p>' + U.esc(c.name) + ' · ' + U.esc(repeatName(e)) + archived + '</p></div>' +
          pinned +
        '</div>' +
        figure(e, list ? 'sm' : 'md') +
        '<div class="card-meta">' +
          '<span>' + I('calendar', 13) + U.esc(dateText(e)) + '</span>' +
          (e.remindDays > 0 && e.mode === 'countdown' ? '<span>' + I('bell', 13) + '提前 ' + e.remindDays + ' 天</span>' : '') +
        '</div>' +
        (e.note ? '<p class="card-note">' + privacy(e.note) + '</p>' : '') +
        '<div class="card-progress"><div class="progress-track"><i style="width:' + progress + '%"></i></div>' +
          '<span>已走过 ' + progress + '%</span></div>' +
      '</div>' +
      '<div class="card-actions">' +
        '<button class="mini-btn' + (e.pinned ? ' on' : '') + '" data-action="toggle-pin" data-id="' + U.esc(e.id) + '" title="置顶">' + I('pin', 15) + '</button>' +
        '<button class="mini-btn" data-action="edit-event" data-id="' + U.esc(e.id) + '" title="编辑">' + I('edit', 15) + '</button>' +
        '<button class="mini-btn" data-action="duplicate-event" data-id="' + U.esc(e.id) + '" title="复制">' + I('copy', 15) + '</button>' +
        '<button class="mini-btn" data-action="toggle-archive" data-id="' + U.esc(e.id) + '" title="归档/取消归档">' + I('archive', 15) + '</button>' +
        '<button class="mini-btn danger" data-action="delete-event" data-id="' + U.esc(e.id) + '" title="删除">' + I('trash', 15) + '</button>' +
      '</div>' +
    '</article>';
  }

  /** 时间轴 / 今日速览的紧凑行 */
  function row(e) {
    var s = stateText(e);
    return '<div class="day-row" style="--card-accent:' + U.esc(e.color) + '" data-action="edit-event" data-id="' + U.esc(e.id) + '">' +
      '<span class="row-icon">' + I(e.icon, 16) + '</span>' +
      '<span class="row-name">' + privacy(e.title) + '</span>' +
      '<span class="row-date">' + U.esc(U.cnDate(e.target, false)) + '</span>' +
      '<span class="row-days">' + (s.num === '' ? '今天' : s.label + ' ' + s.num + ' 天') + '</span>' +
    '</div>';
  }

  /** 悬浮窗条目：只展示最关键的标题与天数 */
  function floatRow(e) {
    var s = stateText(e);
    // 数字下的单位要能连起来读：「46 天后」「820 天了」「120 天前」，而不是「还有天」
    var unit = s.num === '' ? '今天'
      : (e.mode === 'countup' ? '天了' : (e.state === 'past' ? '天前' : '天后'));
    return '<div class="frow" style="--card-accent:' + U.esc(e.color) + '">' +
      '<span class="frow-dot"></span>' +
      '<div class="frow-text"><strong>' + privacy(e.title) + '</strong>' +
        '<small>' + U.esc(U.cnDate(e.target, false)) + ' · ' + U.esc(repeatName(e)) + '</small></div>' +
      '<div class="frow-num"><b>' + (s.num === '' ? '0' : s.num) + '</b><small>' + unit + '</small></div>' +
    '</div>';
  }

  MC.card = {
    render: render, row: row, floatRow: floatRow, figure: figure,
    stateText: stateText, repeatName: repeatName, dateText: dateText,
  };
})();

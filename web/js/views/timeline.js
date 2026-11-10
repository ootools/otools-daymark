/* 时间轴：按月份展开即将到来的日子，以及已过去的日子。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, C = MC.card, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function groups(list) {
    var map = {};
    list.forEach(function (e) {
      var k = e.target.slice(0, 7);
      (map[k] = map[k] || []).push(e);
    });
    return Object.keys(map).sort().map(function (k) { return { key: k, list: map[k] }; });
  }

  function monthName(k) {
    var p = k.split('-');
    return p[0] + ' 年 ' + Number(p[1]) + ' 月';
  }

  function render() {
    var all = S.activeEvents().map(S.computed);
    var future = all.filter(function (e) { return e.days >= 0; })
      .sort(function (a, b) { return a.target < b.target ? -1 : a.target > b.target ? 1 : 0; });
    var past = all.filter(function (e) { return e.days < 0; })
      .sort(function (a, b) { return a.target > b.target ? -1 : 1; });
    var gs = groups(future);

    var timeline = gs.length ? '<div class="timeline">' + gs.map(function (g) {
      return '<section class="tl-group">' +
        '<div class="tl-month"><span class="tl-dot"></span><div><h3>' + U.esc(monthName(g.key)) + '</h3>' +
          '<p>' + g.list.length + ' 个日子</p></div></div>' +
        '<div class="tl-rows">' + g.list.map(function (e) {
          var d = U.parse(e.target);
          return '<div class="tl-row" style="--card-accent:' + U.esc(e.color) + '" data-action="edit-event" data-id="' + U.esc(e.id) + '">' +
            '<span class="tl-day"><b>' + d.getDate() + '</b><small>' + U.weekdayCN(e.target) + '</small></span>' +
            '<span class="tl-icon">' + I(e.icon, 16) + '</span>' +
            '<span class="tl-name"><span class="privacy-blur">' + U.esc(e.title) + '</span>' +
              '<small>' + U.esc(C.repeatName(e)) + (e.note ? ' · ' + U.esc(String(e.note).slice(0, 24)) : '') + '</small></span>' +
            '<span class="tl-count">' + (e.days === 0 ? '今天' : '还有 ' + e.days + ' 天') + '</span>' +
          '</div>';
        }).join('') + '</div></section>';
    }).join('') + '</div>' : UI.emptyState('calendar', '未来还没有安排', '新建一个日子，它会按月份出现在时间轴上。',
      '<button class="btn btn-primary btn-sm" data-action="new-event" type="button">新建日子</button>');

    var pastHtml = past.length ? UI.sectionHead('已经过去', '这些日子已过，天数继续累计的是正数日', '') +
      '<div class="past-list">' + past.map(function (e) {
        return '<div class="past-row" style="--card-accent:' + U.esc(e.color) + '" data-action="edit-event" data-id="' + U.esc(e.id) + '">' +
          '<span class="row-icon">' + I(e.icon, 15) + '</span>' +
          '<span class="privacy-blur">' + U.esc(e.title) + '</span>' +
          '<small>' + U.esc(U.cnDate(e.target, true)) + '</small>' +
          '<b>' + (e.mode === 'countup' ? '已经 ' + e.abs + ' 天' : '已过去 ' + e.abs + ' 天') + '</b></div>';
      }).join('') + '</div>' : '';

    var mile = S.milestones();
    var mileHtml = mile.length ? UI.sectionHead('快到整百 / 整千天', '正数日的下一个里程碑', '') +
      '<div class="mile-grid">' + mile.map(function (m) {
        return '<div class="mile-card" style="--card-accent:' + U.esc(m.color) + '">' +
          '<span class="privacy-blur">' + U.esc(m.title) + '</span>' +
          '<h3>' + m.mark + '<small> 天</small></h3>' +
          '<p>还有 ' + m.left + ' 天</p></div>';
      }).join('') + '</div>' : '';

    return '<div class="timeline-wrap">' +
      UI.sectionHead('时间轴', '未来 ' + future.length + ' 个日子，按目标月份排列', '') +
      timeline + mileHtml + pastHtml + '</div>';
  }

  V.timeline = { render: render };
})();

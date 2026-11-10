/* 洞察：分类分布、倒数/正数构成、临近分布、提醒清单与里程碑。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function donut(countdown, countup) {
    var total = Math.max(1, countdown + countup);
    var pct = Math.round(countdown / total * 100);
    return '<div class="donut" style="background:conic-gradient(var(--accent) 0 ' + pct +
      '%, var(--accent-lite) ' + pct + '% 100%)">' +
      '<div class="donut-hole"><strong>' + total + '</strong><span>个日子</span></div></div>' +
      '<div class="donut-legend">' +
        '<span><i style="background:var(--accent)"></i>倒数日 <b>' + countdown + '</b></span>' +
        '<span><i style="background:var(--accent-lite)"></i>正数日 <b>' + countup + '</b></span>' +
      '</div>';
  }

  function bars() {
    var st = S.stats();
    var max = Math.max(1, Math.max.apply(null, M.CATEGORIES.map(function (c) { return st.byCat[c.id] || 0; })));
    return '<div class="bar-list">' + M.CATEGORIES.map(function (c) {
      var n = st.byCat[c.id] || 0;
      return '<div class="bar-row"><span class="bar-label"><i style="background:' + c.color + '"></i>' + U.esc(c.name) + '</span>' +
        '<div class="bar-track"><i style="width:' + Math.round(n / max * 100) + '%;background:' + c.color + '"></i></div>' +
        '<b>' + n + '</b></div>';
    }).join('') + '</div>';
  }

  function buckets() {
    var list = S.activeEvents().map(S.computed);
    var defs = [
      { name: '今天', test: function (e) { return e.days === 0; } },
      { name: '1–7 天', test: function (e) { return e.days > 0 && e.days <= 7; } },
      { name: '8–30 天', test: function (e) { return e.days > 7 && e.days <= 30; } },
      { name: '31–100 天', test: function (e) { return e.days > 30 && e.days <= 100; } },
      { name: '100 天以上', test: function (e) { return e.days > 100; } },
    ];
    var max = Math.max(1, Math.max.apply(null, defs.map(function (d) {
      return list.filter(d.test).length;
    })));
    return '<div class="bucket-list">' + defs.map(function (d) {
      var n = list.filter(d.test).length;
      return '<div class="bucket"><div class="bucket-bar" style="height:' + Math.round(n / max * 70 + 6) + 'px"></div>' +
        '<b>' + n + '</b><span>' + d.name + '</span></div>';
    }).join('') + '</div>';
  }

  function reminderList() {
    var list = S.reminders();
    if (!list.length) return '<div class="plain-note">' + I('check', 16) + ' 目前没有进入提醒范围的日子。</div>';
    return '<div class="remind-list">' + list.map(function (e) {
      return '<div class="remind-row" style="--card-accent:' + U.esc(e.color) + '">' +
        '<span class="row-icon">' + I(e.icon, 15) + '</span>' +
        '<span class="privacy-blur">' + U.esc(e.title) + '</span>' +
        '<b>' + (e.days === 0 ? '就是今天' : '还有 ' + e.days + ' 天') + '</b>' +
        '<small>' + U.esc(U.cnDate(e.target, false)) + '</small></div>';
    }).join('') + '</div>';
  }

  function render() {
    var st = S.stats();
    return '<div class="insights-wrap">' +
      UI.sectionHead('一眼看清', '只统计正在记录的日子，已归档不计入', '') +
      '<div class="insight-grid">' +
        '<div class="panel-card"><h3><span>' + I('chart', 17) + '</span> 类型构成</h3>' +
          '<div class="donut-wrap">' + donut(st.countdown, st.countup) + '</div></div>' +
        '<div class="panel-card"><h3><span>' + I('palette', 17) + '</span> 分类分布</h3>' + bars() + '</div>' +
        '<div class="panel-card"><h3><span>' + I('target', 17) + '</span> 距离今天</h3>' + buckets() + '</div>' +
        '<div class="panel-card"><h3><span>' + I('bell', 17) + '</span> 提醒清单</h3>' + reminderList() + '</div>' +
      '</div>' +
      '<div class="insight-foot">' + I('info', 15) +
        '<p>统计完全在本机计算，不涉及任何联网或数据上传；农历重复与节气数据范围 1900–2100。</p></div>' +
    '</div>';
  }

  V.insights = { render: render };
})();

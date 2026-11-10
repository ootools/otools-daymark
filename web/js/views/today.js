/* 今日：最近的一个日子作为主视觉，配合概览、快捷模板与近期速览。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, C = MC.card, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function greeting() {
    var h = new Date().getHours();
    var word = h < 6 ? '夜深了' : (h < 11 ? '早上好' : (h < 14 ? '中午好' : (h < 18 ? '下午好' : '晚上好')));
    var name = S.data.settings.nickname;
    return name ? word + '，' + name : word;
  }

  function hero(e) {
    if (!e) {
      return '<div class="hero hero-empty">' +
        '<div class="hero-inner">' +
          '<span class="hero-kicker">' + I('sparkle', 15) + ' 还没有日子</span>' +
          '<h2>从一个值得记住的日期开始</h2>' +
          '<p>生日、纪念日、考试、交付日……记下来，剩下的交给朝夕。</p>' +
          '<button class="btn btn-light" data-action="new-event" type="button">' + I('plus', 16) + ' 新建日子</button>' +
        '</div><div class="hero-deco"><span>DAY<br>01</span></div>' +
      '</div>';
    }
    var s = C.stateText(e);
    var pct = Math.round(U.clamp(e.progress || 0, 0, 1) * 100);
    return '<div class="hero" style="--hero-accent:' + U.esc(e.color) + '">' +
      '<div class="hero-inner">' +
        '<span class="hero-kicker">' + I(e.icon, 15) + ' ' + U.esc(M.categoryOf(e.category).name) +
          (e.pinned ? ' · 已置顶' : '') + '</span>' +
        '<h2>' + U.esc(e.title) + '</h2>' +
        '<p class="hero-date">' + I('calendar', 14) + U.esc(C.dateText(e)) + ' · ' + U.esc(C.repeatName(e)) + '</p>' +
        '<div class="hero-figure">' +
          (s.num === '' ? '<span class="hero-word">就是今天</span>' :
            '<span class="hero-label">' + s.label + '</span><span class="hero-num">' + s.num + '</span><span class="hero-unit">' + s.unit + '</span>') +
        '</div>' +
        '<div class="hero-progress"><i style="width:' + pct + '%"></i></div>' +
        '<p class="hero-progress-text">这一段日子，已经走过 ' + pct + '%</p>' +
        '<div class="hero-actions">' +
          '<button class="btn btn-light btn-sm" data-action="nav" data-view="events" type="button">查看全部日子</button>' +
          '<button class="btn btn-ghost-light btn-sm" data-action="edit-event" data-id="' + U.esc(e.id) + '" type="button">编辑这个日子</button>' +
        '</div>' +
      '</div>' +
      '<div class="hero-deco"><span class="hero-deco-ring"></span><span class="hero-deco-dot"></span>' +
        '<span class="hero-deco-num">' + (s.num === '' ? '0' : s.num) + '</span></div>' +
    '</div>';
  }

  function stats() {
    var st = S.stats();
    var items = [
      { icon: 'layers', label: '正在记录', value: st.active, unit: '个日子', sub: st.archived ? '另有 ' + st.archived + ' 个已归档' : '一切都在掌握中' },
      { icon: 'bell', label: '七天内临近', value: st.week, unit: '个', sub: st.week ? '别忘了提前准备' : '近期没有紧迫的日子' },
      { icon: 'repeat', label: '周期重复', value: st.repeating, unit: '个', sub: '按周 / 月 / 季度 / 年' },
    ];
    return '<div class="stat-grid">' + items.map(function (x) {
      return '<div class="stat-card"><span class="stat-icon">' + I(x.icon, 18) + '</span>' +
        '<div class="stat-body"><p>' + x.label + '</p><h3>' + x.value + '<small>' + x.unit + '</small></h3>' +
        '<span>' + x.sub + '</span></div></div>';
    }).join('') + '</div>';
  }

  function templates() {
    return UI.sectionHead('快速新建', '选一个模板，填名字和日期就好',
      '<button class="btn btn-ghost btn-sm" data-action="nav" data-view="events" type="button">全部日子 ' + I('arrowRight', 14) + '</button>') +
      '<div class="tpl-grid">' + M.TEMPLATES.map(function (t) {
        var cat = M.categoryOf(t.category);
        return '<button class="tpl-chip" data-action="open-template" data-tpl="' + t.id + '" type="button" style="--card-accent:' + cat.color + '">' +
          '<span class="tpl-icon">' + I(t.icon, 18) + '</span>' +
          '<span class="tpl-text"><strong>' + U.esc(t.name) + '</strong><small>' + U.esc(t.desc) + '</small></span>' +
          I('plus', 14) + '</button>';
      }).join('') + '</div>';
  }

  function recent() {
    var list = S.upcoming(5);
    var body = list.length
      ? '<div class="day-list">' + list.map(C.row).join('') + '</div>'
      : UI.emptyState('hourglass', '暂无即将到来的日子', '新建一个日子，或到「时间轴」看看已过去的日子。',
          '<button class="btn btn-primary btn-sm" data-action="new-event" type="button">新建日子</button>');
    return UI.sectionHead('近期日子', '按距离今天由近到远', '') + body;
  }

  function floatHint() {
    var f = MC.float;
    if (f.isFloat) return '';
    if (f.state.open) {
      return '<div class="float-hint is-on">' + I('check', 18) +
        '<div><strong>桌面悬浮窗已开启</strong><p>它会常驻桌面，和这里的日子实时同步。</p></div>' +
        '<button class="btn btn-ghost btn-sm" data-action="toggle-float" type="button">关闭悬浮窗</button></div>';
    }
    return '<div class="float-hint">' + I('external', 18) +
      '<div><strong>想让日子一直看得见？</strong><p>手动开启一个 320×440 的桌面小悬浮窗，随时查看、随手添加。</p></div>' +
      '<button class="btn btn-primary btn-sm" data-action="toggle-float" type="button">开启悬浮窗</button></div>';
  }

  function render() {
    var first = S.upcoming(1)[0] || null;
    return '<div class="today-wrap">' +
      '<p class="today-greeting">' + U.esc(greeting()) + ' · ' + U.esc(U.cnDateFull(U.today())) + '</p>' +
      hero(first) +
      stats() +
      templates() +
      '<div class="today-cols">' +
        '<div class="today-recent">' + recent() + '</div>' +
        '<div class="today-side">' + floatHint() +
          UI.sectionHead('小提示', '', '') +
          '<div class="tip-card">' + I('info', 17) +
            '<p>阳历与农历都能直接输入；周期倒数支持按周、月、季度、年，以及每 N 个周期一次。农历按 1900–2100 数据换算，正数日不重复。数据仅存本机，可随时导出 JSON 备份。</p></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  V.today = { render: render };
})();

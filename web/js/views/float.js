/* 悬浮窗视图：紧凑、可拖动、可随手新增，与主面板通过本地存储实时同步。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, C = MC.card, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function render() {
    var count = U.clamp(Number(S.data.settings.floatCount) || 3, 1, 6);
    var list = S.upcoming(count);
    var rows = list.length
      ? list.map(C.floatRow).join('')
      : '<div class="fwin-empty">' + I('hourglass', 26) + '<p>还没有日子</p><small>在下面随手记一个吧</small></div>';

    // 正数日的下一个整百/整千天里程碑；没有里程碑时给一条本地化概览，避免小窗下半留白
    var mile = S.milestones()[0];
    var mileHtml = '<div class="fwin-mile" style="--mile:' +
      U.esc(mile ? mile.color : 'var(--accent)') + '">' + I('sparkle', 15) +
      '<div><strong>' + (mile
        ? '距离第 ' + mile.mark + ' 天还有 ' + mile.left + ' 天'
        : '共 ' + S.activeEvents().length + ' 个日子在记录') + '</strong>' +
      '<small>' + (mile ? U.esc(mile.title) + ' · 正数日里程碑' : '所有数据只保存在本机') + '</small></div></div>';

    return '<div class="fwin">' +
      '<header class="fhead">' +
        '<span class="fhead-logo">' + I('sun', 18) + '</span>' +
        '<div class="fhead-text"><strong>朝夕</strong><small>' + U.esc(U.cnDateFull(U.today())) + '</small></div>' +
        '<button class="fhead-btn" data-action="float-refresh" title="刷新" type="button">' + I('refresh', 15) + '</button>' +
        '<button class="fhead-btn" data-action="float-close" title="关闭悬浮窗" type="button">' + I('close', 15) + '</button>' +
      '</header>' +
      '<div class="fbody">' +
        '<div class="fbody-head"><span>最近的日子</span><b>' + S.activeEvents().length + ' 个</b></div>' +
        rows + mileHtml +
      '</div>' +
      '<footer class="ffoot">' +
        '<div class="fquick">' +
          '<input id="fq-title" type="text" maxlength="40" placeholder="随手记个日子…" autocomplete="off">' +
          '<input id="fq-date" type="date" value="' + U.esc(U.today()) + '">' +
          '<button data-action="float-quick-add" title="添加" type="button">' + I('plus', 16) + '</button>' +
        '</div>' +
        '<span class="fstatus">' + I('layers', 12) + ' 与主面板实时同步 · 拖动顶部可移动</span>' +
      '</footer>' +
    '</div>';
  }

  MC.actions.register({
    'float-refresh': function () { S.reloadFromStorage(); UI.toast('已同步主面板数据', 'success'); },
    'float-close': function () {
      Promise.resolve(MC.float.close()).then(function () {
        // 浏览器小窗直接关闭；宿主窗口由 close_custom_plugin_windows 回收。
        if (MC.float.state.mode !== 'host') { try { window.close(); } catch (e) {} }
      });
    },
    'float-quick-add': function () {
      var t = document.getElementById('fq-title');
      var d = document.getElementById('fq-date');
      if (!t || !d) return;
      var title = String(t.value || '').trim();
      if (!title) { UI.toast('先写个名字吧', 'error'); t.focus(); return; }
      var ev = M.emptyEvent();
      ev.title = title;
      ev.date = /^\d{4}-\d{2}-\d{2}$/.test(d.value) ? d.value : U.today();
      ev.category = 'other';
      ev.icon = 'flag';
      ev.color = M.categoryOf('other').color;
      ev.remindDays = S.data.settings.defaultRemind;
      var r = S.addEvent(ev);
      if (!r.ok) { UI.toast(r.reason, 'error'); return; }
      t.value = '';
      UI.toast('已记下，主面板同步更新', 'success');
    },
  });

  V.float = { render: render };
})();

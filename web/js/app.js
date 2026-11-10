/* 应用入口：路由、渲染、全局事件、悬浮窗按钮状态。 */
(function () {
  'use strict';
  var MC = window.MC;
  var U = MC.util, S = MC.store, I = MC.icons.icon;

  var NAV = [
    { id: 'today', label: '今日', icon: 'home' },
    { id: 'events', label: '全部日子', icon: 'hourglass' },
    { id: 'timeline', label: '时间轴', icon: 'calendar' },
    { id: 'insights', label: '洞察', icon: 'chart' },
    { id: 'settings', label: '设置', icon: 'settings' },
  ];

  var SUBTITLE = {
    today: '把重要的日子，放在看得见的地方',
    events: '生日、纪念日、考试、交付，都在这里',
    timeline: '按月份展开未来，也留着过去',
    insights: '分类、距离与提醒的概览',
    settings: '按你的习惯来',
  };

  function navHtml() {
    return NAV.map(function (n) {
      var badge = '';
      if (n.id === 'events') {
        var c = S.activeEvents().length;
        if (c) badge = '<span class="nav-count">' + c + '</span>';
      }
      return '<button class="nav-item' + (S.ui.view === n.id ? ' active' : '') +
        '" data-action="nav" data-view="' + n.id + '" type="button">' +
        '<span class="nav-icon">' + I(n.icon, 19) + '</span><span>' + n.label + '</span>' + badge +
        (S.ui.view === n.id ? '<i class="nav-active"></i>' : '') + '</button>';
    }).join('');
  }

  function floatLabels() {
    var open = MC.float.state.open;
    var btnIcon = document.getElementById('float-btn-icon');
    var btnText = document.getElementById('float-btn-text');
    if (btnIcon) btnIcon.innerHTML = I(open ? 'minus' : 'external', 15);
    if (btnText) btnText.textContent = open ? '关闭悬浮窗' : '悬浮窗';
    var btn = document.getElementById('float-btn');
    if (btn) btn.classList.toggle('is-on', !!open);

    var cardIcon = document.getElementById('float-card-icon');
    var cardTitle = document.getElementById('float-card-title');
    var cardSub = document.getElementById('float-card-sub');
    var card = document.getElementById('float-card');
    if (cardIcon) cardIcon.innerHTML = I(open ? 'check' : 'external', 18);
    if (cardTitle) cardTitle.textContent = open ? '悬浮窗已开启' : '开启桌面悬浮窗';
    if (cardSub) cardSub.textContent = open ? '点这里关闭 · 数据实时同步' : '小窗口常驻，随手记日子';
    if (card) card.classList.toggle('is-on', !!open);
  }

  function topHtml() {
    var item = NAV.filter(function (n) { return n.id === S.ui.view; })[0] || NAV[0];
    document.getElementById('page-title').textContent = item.label;
    document.getElementById('page-sub').textContent = SUBTITLE[S.ui.view];
    document.getElementById('top-date').innerHTML = I('calendar', 14) + '<span>' + U.esc(U.cnDateFull(U.today())) + '</span>';
    document.getElementById('theme-icon').innerHTML = I(S.ui.theme === 'dark' ? 'sun' : 'moon', 18);
    floatLabels();
  }

  function reminderHtml() {
    if (S.ui.reminderDismissed || S.ui.onboarding || S.ui.view !== 'today' || S.ui.floatMode) return '';
    var list = S.reminders();
    if (!list.length) return '';
    var first = list[0];
    var more = list.length > 1 ? '，另有 ' + (list.length - 1) + ' 个日子临近' : '';
    return '<div class="reminder-banner">' +
      '<span class="reminder-icon">' + I('bell', 18) + '</span>' +
      '<div class="reminder-text"><strong>' + U.esc(first.title) + ' 快到了</strong>' +
        '<p>' + (first.days === 0 ? '就是今天' : '还有 ' + first.days + ' 天') +
        ' · ' + U.esc(U.cnDate(first.target)) + more + '。</p></div>' +
      '<button class="btn btn-soft btn-sm" data-action="nav" data-view="events" type="button">查看日子</button>' +
      '<button class="icon-btn" data-action="dismiss-reminder" aria-label="关闭提醒" type="button">' + I('close', 16) + '</button>' +
    '</div>';
  }

  function render() {
    if (!S.ui.ready) return;
    document.body.classList.toggle('privacy-on', !!S.data.settings.privacyMode);

    if (S.ui.floatMode) {
      document.body.classList.add('float-mode');
      document.getElementById('reminder-slot').innerHTML = '';
      document.getElementById('overlay').innerHTML = '';
      document.getElementById('overlay').classList.remove('active');
      var root = document.getElementById('view');
      root.innerHTML = (MC.views.float || MC.views.today).render();
      root.scrollTop = 0;
      return;
    }

    document.getElementById('nav').innerHTML = navHtml();
    topHtml();
    document.getElementById('reminder-slot').innerHTML = reminderHtml();

    var view = MC.views[S.ui.view] || MC.views.today;
    var el = document.getElementById('view');
    el.innerHTML = view.render();
    el.scrollTop = 0;
    el.classList.remove('view-enter');
    void el.offsetWidth;
    el.classList.add('view-enter');

    var overlay = document.getElementById('overlay');
    var html = MC.views.onboarding.renderOverlay();
    overlay.innerHTML = html;
    overlay.classList.toggle('active', !!html);
  }

  MC.actions.register({
    'nav': function (el) { S.setRoute(el.getAttribute('data-view')); },
    'theme-quick': function () { S.setSettings({ themeMode: S.ui.theme === 'dark' ? 'light' : 'dark' }); },
    'dismiss-reminder': function () { S.ui.reminderDismissed = true; render(); },
    'toggle-float': function () {
      Promise.resolve(MC.float.toggle()).then(function () { render(); });
    },
  });

  function bind() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-action]');
      if (el && !el.disabled) {
        e.preventDefault();
        MC.actions.handle(el.getAttribute('data-action'), el, e);
      }
    });

    var onField = function (e) {
      var el = e.target.closest && e.target.closest('[data-input-action]');
      if (el && !el.disabled) MC.actions.handle(el.getAttribute('data-input-action'), el, e);
    };
    document.addEventListener('input', onField);
    document.addEventListener('change', onField);

    document.addEventListener('change', function (e) {
      var el = e.target.closest && e.target.closest('[data-field]');
      if (!el) return;
      var name = el.getAttribute('data-field');
      var value = el.type === 'checkbox' ? el.checked : el.value;
      if (name === 'defaultRemind' || name === 'floatCount') value = Number(value);
      var patch = {}; patch[name] = value;
      S.setSettings(patch);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.id === 'fq-title') {
        e.preventDefault();
        MC.actions.handle('float-quick-add', e.target, e);
        return;
      }
      if (e.key !== 'Escape') return;
      var modalRoot = document.getElementById('modal-root');
      var last = modalRoot && modalRoot.lastElementChild;
      if (last) { last.classList.remove('shown'); setTimeout(function () { last.remove(); }, 180); return; }
      if (S.ui.onboarding) { MC.actions.handle('onboard-start', document.body, e); }
    });

    try {
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if (S.data.settings.themeMode === 'auto') { S.applyTheme(); render(); }
        });
      }
    } catch (e) {}
  }

  function boot() {
    S.subscribe(render);
    bind();
    S.init();
    render();

    if (S.ui.floatMode) {
      MC.float.announceReady();
    } else {
      Promise.resolve(MC.float.refreshStatus())
        .then(function () { return MC.float.autoOpenIfNeeded(); })
        .catch(function (e) { console.warn('[daymark] float status', e); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

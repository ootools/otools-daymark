/* 首次使用引导：本地存储说明 + 示例数据入口。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function renderOverlay() {
    if (!S.ui.onboarding || S.ui.floatMode) return '';
    return '<div class="onboard-backdrop">' +
      '<div class="onboard-card">' +
        '<div class="onboard-art">' +
          '<span class="onboard-sun"></span><span class="onboard-line"></span>' +
          '<span class="onboard-tick t1"></span><span class="onboard-tick t2"></span><span class="onboard-tick t3"></span>' +
        '</div>' +
        '<div class="onboard-body">' +
          '<span class="onboard-kicker">DAYMARK · 朝夕</span>' +
          '<h2>把重要的日子，<br>放在看得见的地方。</h2>' +
          '<p>生日、纪念日、考试、交付、旅行……每一个值得记住的日子，都有一格刻度。</p>' +
          '<ul class="onboard-list">' +
            '<li>' + I('hourglass', 16) + '<span><strong>倒数与正数</strong>：还有多少天、已经多少天，一眼看清</span></li>' +
            '<li>' + I('repeat', 16) + '<span><strong>阳历 / 农历 · 周期倒数</strong>：按周、月、季度、年重复，还能设每 N 个周期</span></li>' +
            '<li>' + I('external', 16) + '<span><strong>桌面小悬浮窗</strong>：需要时手动开启，与主面板实时同步</span></li>' +
            '<li>' + I('shield', 16) + '<span><strong>只在本机</strong>：数据存于本地存储，不联网、不上传</span></li>' +
          '</ul>' +
          '<div class="onboard-actions">' +
            '<button class="btn btn-primary" data-action="onboard-demo" type="button">' + I('sparkle', 16) + ' 先看看示例</button>' +
            '<button class="btn btn-ghost" data-action="onboard-start" type="button">从空白开始</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  MC.actions.register({
    'onboard-start': function () {
      S.markSeen();
      S.ui.onboarding = false;
      S.setRoute('events');
      UI.toast('已就绪，点「新建日子」记下第一个日子吧', 'success');
    },
    'onboard-demo': function () {
      S.loadDemo();
      S.ui.onboarding = false;
      S.setRoute('today');
      UI.toast('已载入 ' + S.data.events.length + ' 个示例日子，可随时清空', 'success');
    },
  });

  V.onboarding = { renderOverlay: renderOverlay };
  void U;
})();

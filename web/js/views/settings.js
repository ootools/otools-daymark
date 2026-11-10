/* 设置：外观、习惯、隐私、桌面悬浮窗、数据管理与关于。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function field(label, hint, control) {
    return '<div class="setting-row"><div class="setting-text"><strong>' + U.esc(label) + '</strong>' +
      (hint ? '<p>' + U.esc(hint) + '</p>' : '') + '</div><div class="setting-control">' + control + '</div></div>';
  }

  function toggle(name, checked) {
    return '<label class="switch"><input type="checkbox" data-field="' + name + '"' + (checked ? ' checked' : '') +
      '><i></i><b>' + (checked ? '开' : '关') + '</b></label>';
  }

  function select(name, list, value) {
    return '<select class="setting-select" data-field="' + name + '">' + list.map(function (x) {
      return '<option value="' + U.esc(x.id) + '"' + (x.id === value ? ' selected' : '') + '>' + U.esc(x.name) + '</option>';
    }).join('') + '</select>';
  }

  function appearance(s) {
    var themes = [{ id: 'light', name: '浅色' }, { id: 'dark', name: '深色' }, { id: 'auto', name: '跟随系统' }];
    return '<section class="settings-card">' + UI.sectionHead('外观', '主题与主色随时可改', '') +
      field('主题模式', '深色模式下卡片与文字会同步调整',
        '<div class="segmented">' + themes.map(function (t) {
          return '<button class="' + (s.themeMode === t.id ? 'active' : '') +
            '" data-action="set-theme" data-mode="' + t.id + '" type="button">' + t.name + '</button>';
        }).join('') + '</div>') +
      field('主色', '影响按钮、强调数字与进度',
        '<div class="accent-pick">' + M.ACCENTS.map(function (a) {
          return '<button class="accent-chip' + (s.accent === a.id ? ' active' : '') +
            '" data-action="set-accent" data-accent="' + a.id + '" style="--chip:' + a.color +
            '" type="button" title="' + U.esc(a.name) + '"><i></i><span>' + U.esc(a.name) + '</span></button>';
        }).join('') + '</div>') +
    '</section>';
  }

  function habits(s) {
    return '<section class="settings-card">' + UI.sectionHead('使用习惯', '按你的方式来', '') +
      field('称呼', '今日页的问候语里会用到',
        '<input class="setting-input" type="text" maxlength="20" data-field="nickname" placeholder="留空则不显示" value="' + U.esc(s.nickname) + '">') +
      field('默认提前提醒', '新建日子时预填的天数，0 表示不提醒',
        '<input class="setting-input short" type="number" min="0" max="30" data-field="defaultRemind" value="' + s.defaultRemind + '">') +
      field('默认排序', '',
        select('sort', [{ id: 'time', name: '按临近程度' }, { id: 'created', name: '按创建时间' }, { id: 'name', name: '按名称' }], s.sort)) +
      field('默认视图', '', select('viewMode', [{ id: 'grid', name: '网格卡片' }, { id: 'list', name: '紧凑列表' }], s.viewMode)) +
      field('显示农历', '在日期旁附带农历月日（1900–2100）', toggle('showLunar', s.showLunar)) +
    '</section>';
  }

  function privacy(s) {
    return '<section class="settings-card">' + UI.sectionHead('隐私', '数据始终留在这台设备上', '') +
      field('隐私模式', '开启后模糊显示名称与备注，适合在他人面前打开', toggle('privacyMode', s.privacyMode)) +
      '<div class="setting-note">' + I('shield', 16) +
        '<span>朝夕不发起任何网络请求。数据保存在浏览器 / 宿主为本插件分配的本地存储中；清除插件数据或卸载插件会导致记录丢失，建议定期导出备份。</span></div>' +
      (S.ui.storageOk ? '' : '<div class="setting-note warn">' + I('info', 16) +
        '<span>本地存储不可用，当前修改可能无法保存。请检查隐私模式或存储权限。</span></div>') +
    '</section>';
  }

  function floatSettings(s) {
    var f = MC.float;
    var hostText = f.state.host
      ? '已检测到宿主窗口能力：panel 插件可直接创建额外自定义窗口。'
      : '当前为浏览器预览或旧版宿主：会用同源小窗口代替，样式与数据同步方式一致。';
    return '<section class="settings-card">' + UI.sectionHead('桌面悬浮窗', '默认不自动开启，由你手动决定', '') +
      '<div class="float-panel">' +
        '<div class="float-panel-head"><span class="float-panel-icon">' + I('external', 20) + '</span>' +
          '<div><strong>' + (f.state.open ? '悬浮窗正在运行' : '悬浮窗未开启') + '</strong>' +
          '<p>' + U.esc(hostText) + '</p></div>' +
          '<button class="btn ' + (f.state.open ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-action="toggle-float" type="button">' +
            (f.state.open ? '关闭悬浮窗' : '开启悬浮窗') + '</button></div>' +
      '</div>' +
      field('显示几个日子', '悬浮窗按临近程度展示，最多 6 个',
        select('floatCount', [1, 2, 3, 4, 5, 6].map(function (n) { return { id: String(n), name: n + ' 个' }; }), String(s.floatCount))) +
      field('窗口置顶', '开启后悬浮窗始终显示在其他窗口之上（下次开启生效）', toggle('floatAlwaysOnTop', s.floatAlwaysOnTop)) +
      field('随主面板自动开启', '默认关闭；宿主环境下启动插件时自动打开悬浮窗', toggle('floatAutoOpen', s.floatAutoOpen)) +
      '<div class="setting-note">' + I('info', 16) +
        '<span>悬浮窗加载同一入口的 <code>index.html?float=1</code>，与主面板同源共享本地存储；任意一边新建或修改日子，另一边会立刻同步。</span></div>' +
    '</section>';
  }

  function dataCard() {
    return '<section class="settings-card">' + UI.sectionHead('数据管理', '导出为 JSON，随时可以搬回来', '') +
      '<div class="data-actions">' +
        '<button class="btn btn-soft" data-action="export-data" type="button">' + I('download', 16) + ' 导出备份</button>' +
        '<button class="btn btn-soft" data-action="import-data" type="button">' + I('upload', 16) + ' 导入 JSON</button>' +
        '<button class="btn btn-ghost" data-action="settings-demo" type="button">' + I('sparkle', 16) + ' 载入示例</button>' +
        '<button class="btn btn-ghost danger" data-action="settings-clear" type="button">' + I('trash', 16) + ' 清空全部</button>' +
      '</div>' +
      '<div class="setting-note">' + I('info', 16) +
        '<span>导入会替换当前全部日子（保留主题、主色与隐私设置）；清空只删除日子，不重置设置。</span></div>' +
    '</section>';
  }

  function about() {
    return '<section class="settings-card about-card">' +
      '<div class="about-logo">' + I('hourglass', 26) + '</div>' +
      '<div><h3>朝夕 · Daymark</h3><p>v1.1.0 · 独立插件 · 默认 panel 面板</p>' +
        '<p>离线农历与节气数据范围 1900–2100；宜忌与吉凶类内容不在本插件范围内，日期计算仅供日程参考。</p></div>' +
    '</section>';
  }

  function render() {
    var s = S.data.settings;
    return '<div class="settings-wrap">' + appearance(s) + habits(s) + privacy(s) +
      floatSettings(s) + dataCard() + about() + '</div>';
  }

  MC.actions.register({
    'set-theme': function (el) { S.setSettings({ themeMode: el.getAttribute('data-mode') }); },
    'set-accent': function (el) { S.setSettings({ accent: el.getAttribute('data-accent') }); },
    'export-data': function () {
      var name = 'daymark-backup-' + U.today() + '.json';
      Promise.resolve(MC.host.saveJson(name, S.serialize())).then(function (target) {
        if (target) UI.toast('已导出 ' + S.data.events.length + ' 个日子', 'success');
      }).catch(function (e) { UI.toast('导出失败：' + e.message, 'error'); });
    },
    'import-data': function () {
      Promise.resolve(MC.host.openJson()).then(function (file) {
        if (!file) return null;
        var r = S.importData(file.text);
        UI.toast('已导入 ' + r.events + ' 个日子', 'success');
        S.setRoute('events');
        return r;
      }).catch(function (e) { UI.toast('导入失败：' + e.message, 'error'); });
    },
    'settings-demo': function () {
      UI.confirm({
        title: '载入示例日子？', message: '会用 9 个相对今天生成的示例替换当前所有日子。',
        confirmText: '载入示例',
      }).then(function (yes) {
        if (!yes) return;
        S.loadDemo(); S.setRoute('today');
        UI.toast('示例已载入', 'success');
      });
    },
    'settings-clear': function () {
      UI.confirm({
        title: '清空全部日子？', message: '所有记录将被删除且无法撤销，建议先导出备份。',
        confirmText: '确认清空', danger: true,
      }).then(function (yes) {
        if (!yes) return;
        S.resetRecords(); S.setRoute('events');
        UI.toast('已清空，设置保持不变', 'success');
      });
    },
  });

  V.settings = { render: render };
})();

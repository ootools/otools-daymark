/* 全部日子：搜索、分类筛选、排序、网格/列表切换、归档与卡片操作。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, C = MC.card, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function filters() {
    var counts = S.stats().byCat;
    var chips = [{ id: 'all', name: '全部', color: 'var(--accent)' }].concat(M.CATEGORIES.map(function (c) {
      return { id: c.id, name: c.name, color: c.color };
    }));
    return '<div class="filter-row">' + chips.map(function (c) {
      var n = c.id === 'all' ? S.activeEvents().length : (counts[c.id] || 0);
      return '<button class="filter-chip' + (S.ui.eventFilter === c.id ? ' active' : '') +
        '" data-action="set-filter" data-filter="' + c.id + '" style="--chip:' + c.color + '" type="button">' +
        (c.id === 'all' ? '' : '<i></i>') + U.esc(c.name) + '<b>' + n + '</b></button>';
    }).join('') + '</div>';
  }

  function controls() {
    var s = S.data.settings;
    return '<div class="toolbar">' +
      '<label class="search-box">' + I('search', 16) +
        '<input type="search" id="event-query" placeholder="搜索名称或备注…" value="' + U.esc(S.ui.eventQuery) +
        '" data-input-action="event-query" autocomplete="off"></label>' +
      '<div class="toolbar-right">' +
        '<label class="select-box">' + I('sort', 15) +
          '<select data-field="sort" aria-label="排序方式">' +
            '<option value="time"' + (s.sort === 'time' ? ' selected' : '') + '>按临近程度</option>' +
            '<option value="created"' + (s.sort === 'created' ? ' selected' : '') + '>按创建时间</option>' +
            '<option value="name"' + (s.sort === 'name' ? ' selected' : '') + '>按名称</option>' +
          '</select></label>' +
        '<button class="icon-btn bordered" data-action="toggle-view-mode" title="切换网格 / 列表" type="button">' +
          I(s.viewMode === 'grid' ? 'list' : 'grid', 17) + '</button>' +
        '<button class="btn btn-ghost btn-sm' + (S.ui.showArchived ? ' active' : '') +
          '" data-action="toggle-archived" type="button">' + I('archive', 15) + ' 归档' +
          (S.data.events.filter(function (e) { return e.archived; }).length || '') + '</button>' +
      '</div>' +
    '</div>';
  }

  function resultsHtml() {
    var list = S.listEvents(S.ui.showArchived);
    if (!list.length) {
      var filtered = S.ui.eventQuery || S.ui.eventFilter !== 'all';
      return UI.emptyState(filtered ? 'search' : 'hourglass',
        filtered ? '没有匹配的日子' : '还没有记录任何日子',
        filtered ? '换个关键词，或清除筛选条件。' : '点右上角「新建日子」，或用下方模板快速开始。',
        filtered ? '<button class="btn btn-ghost btn-sm" data-action="clear-query" type="button">清除筛选</button>'
                 : '<button class="btn btn-primary btn-sm" data-action="new-event" type="button">新建日子</button>');
    }
    return '<div class="event-grid' + (S.data.settings.viewMode === 'list' ? ' is-list' : '') + '">' +
      list.map(function (e) { return C.render(e, S.data.settings.viewMode); }).join('') + '</div>';
  }

  function render() {
    return '<div class="events-wrap">' +
      UI.sectionHead('全部日子', '共 ' + S.activeEvents().length + ' 个正在记录 · 点卡片右下角图标可编辑',
        '<button class="btn btn-primary btn-sm" data-action="new-event" type="button">' + I('plus', 15) + ' 新建日子</button>') +
      filters() + controls() +
      '<div id="event-results">' + resultsHtml() + '</div>' +
      '<div class="events-foot">' + I('shield', 14) +
        '<span>所有日子仅保存在本机，可通过「设置」导出 JSON 备份。</span></div>' +
    '</div>';
  }

  function refreshResults() {
    var box = document.getElementById('event-results');
    if (box) box.innerHTML = resultsHtml();
  }

  MC.actions.register({
    'set-filter': function (el) { S.ui.eventFilter = el.getAttribute('data-filter'); S.notify(); },
    'toggle-view-mode': function () {
      S.setSettings({ viewMode: S.data.settings.viewMode === 'grid' ? 'list' : 'grid' });
    },
    'toggle-archived': function () { S.ui.showArchived = !S.ui.showArchived; S.notify(); },
    'clear-query': function () { S.ui.eventQuery = ''; S.ui.eventFilter = 'all'; S.notify(); },
    'event-query': function (el) {
      S.ui.eventQuery = el.value || '';
      refreshResults(); // 只重绘结果区，避免输入框失焦
    },
    'toggle-pin': function (el) {
      S.togglePin(el.getAttribute('data-id'));
      UI.toast('已更新置顶状态', 'success');
    },
    'duplicate-event': function (el) {
      S.duplicateEvent(el.getAttribute('data-id'));
      UI.toast('已复制一份，可以改日期和名称', 'success');
    },
    'toggle-archive': function (el) {
      var e = S.getEvent(el.getAttribute('data-id'));
      S.toggleArchive(el.getAttribute('data-id'));
      UI.toast(e && e.archived ? '已取消归档' : '已归档，可在「归档」中找回', 'success');
    },
    'delete-event': function (el) {
      var id = el.getAttribute('data-id');
      var e = S.getEvent(id);
      if (!e) return;
      UI.confirm({
        title: '删除这个日子？',
        subtitle: e.title,
        message: '「' + e.title + '」将被永久删除，此操作无法撤销。若只是暂时不想看到，可以选择归档。',
        confirmText: '确认删除', danger: true,
      }).then(function (yes) {
        if (!yes) return;
        S.deleteEvent(id);
        UI.toast('已删除', 'success');
      });
    },
  });

  V.events = { render: render, resultsHtml: resultsHtml, refreshResults: refreshResults };
})();

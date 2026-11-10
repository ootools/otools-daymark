/* 桌面悬浮窗：手动开启 / 关闭 / 唤回，并上报就绪。
 *
 * 宿主路径：panel 插件在自身 webview 里调用 open_custom_plugin_window
 *          （宿主已允许 panel 创建额外窗口）；新窗口加载 index.html?float=1。
 * 浏览器预览路径：window.open 同源小窗，同样渲染 ?float=1。
 * 两条路径都与主面板同源，localStorage + storage 事件负责实时同步。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, UI = MC.ui;

  var WINDOW_ID = 'daymark-float';
  var FLOAT_URL = 'index.html?float=1';
  var query = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { query[k] = v; }); } catch (e) {}

  var isFloat = query.float === '1';
  var popup = null;
  var state = {
    open: false,
    mode: 'browser',          // 'host' | 'browser' | 'unavailable'
    label: '',
    error: '',
    host: false,
  };

  function invokeFn() {
    var candidates = [window];
    try { if (window.parent && window.parent !== window) candidates.push(window.parent); } catch (e) {}
    try { if (window.top && window.top !== window) candidates.push(window.top); } catch (e) {}
    for (var i = 0; i < candidates.length; i += 1) {
      var t = candidates[i] && candidates[i].__TAURI_INTERNALS__;
      if (t && typeof t.invoke === 'function') return t.invoke.bind(t);
    }
    return null;
  }

  function notify() {
    if (MC.store && MC.store.notify) MC.store.notify();
  }

  function options() {
    var s = MC.store.data.settings;
    return {
      width: 320,
      height: 440,
      alwaysOnTop: !!s.floatAlwaysOnTop,
      decorations: false,
      transparent: true,
      shadow: true,
      skipTaskbar: true,
      resizable: true,
    };
  }

  function mark(open, mode, label, error) {
    state.open = !!open;
    state.mode = mode || state.mode;
    state.label = label || '';
    state.error = error || '';
    notify();
  }

  function browserOpen() {
    try {
      var features = 'width=320,height=440,left=' + Math.max(0, (screen.width || 1280) - 380) +
        ',top=90,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no';
      popup = window.open(FLOAT_URL, 'otools-daymark-float', features);
      if (popup) {
        mark(true, 'browser', '', '');
        UI.toast('桌面悬浮窗已开启，可与主面板同步编辑', 'success');
        return Promise.resolve(true);
      }
    } catch (e) { /* 浏览器阻止弹窗 */ }
    mark(false, 'unavailable', '', '浏览器阻止了弹窗');
    UI.toast('无法开启悬浮窗：请在插件面板中使用，或允许弹出窗口', 'error');
    return Promise.resolve(false);
  }

  function open() {
    if (state.open) return focus();
    var invoke = invokeFn();
    state.host = !!invoke;
    if (!invoke) return browserOpen();
    return invoke('open_custom_plugin_window', {
      windowId: WINDOW_ID,
      title: '朝夕 · 悬浮窗',
      url: FLOAT_URL,
      options: options(),
    }).then(function (info) {
      mark(true, 'host', (info && info.label) || '', '');
      UI.toast('桌面悬浮窗已开启，可与主面板同步编辑', 'success');
      return true;
    }).catch(function (err) {
      // 旧版宿主或 ACL 未放行时，退回浏览器小窗，不让按钮「点了没反应」。
      var msg = (err && (err.message || err)) || String(err);
      return browserOpen().then(function (ok) {
        if (ok) state.error = '宿主窗口不可用，已使用浏览器小窗：' + msg;
        return ok;
      });
    });
  }

  function focus() {
    var invoke = invokeFn();
    if (state.mode === 'host' && invoke) {
      return invoke('open_custom_plugin_window', {
        windowId: WINDOW_ID, title: '朝夕 · 悬浮窗', url: FLOAT_URL, options: options(),
      }).then(function () { mark(true, 'host'); return true; })
        .catch(function () { return open(); });
    }
    if (popup && !popup.closed) { try { popup.focus(); } catch (e) {} return Promise.resolve(true); }
    mark(false, state.mode);
    return open();
  }

  function close() {
    var invoke = invokeFn();
    var task;
    if (state.mode === 'host' && invoke) {
      task = invoke('close_custom_plugin_windows').catch(function () {});
    } else {
      task = Promise.resolve();
    }
    return Promise.resolve(task).then(function () {
      if (popup && !popup.closed) { try { popup.close(); } catch (e) {} }
      popup = null;
      mark(false, state.mode);
      if (!isFloat) UI.toast('桌面悬浮窗已关闭');
    });
  }

  function toggle() { return state.open ? close() : open(); }

  /** 主面板启动时同步按钮状态：宿主里查询已存在的额外窗口 */
  function refreshStatus() {
    var invoke = invokeFn();
    state.host = !!invoke;
    if (!invoke || isFloat) return Promise.resolve(state);
    return invoke('list_custom_plugin_windows').then(function (list) {
      var items = Array.isArray(list) ? list : [];
      state.open = items.some(function (w) {
        return (w && (w.windowId === WINDOW_ID || /daymark-float/.test(w.label || '')));
      });
      state.mode = state.open ? 'host' : 'host';
      notify();
      return state;
    }).catch(function () { return state; });
  }

  /** 悬浮窗内：上报就绪，让宿主完成窗口注册与 show/focus */
  function announceReady() {
    if (!isFloat) return Promise.resolve(false);
    var invoke = invokeFn();
    state.host = !!invoke;
    if (!invoke) return Promise.resolve(false);
    return invoke('custom_plugin_window_ready', { ready: true })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  /** 手动开启是默认行为；仅当用户在设置里勾选「随主面板自动开启」时才自动开 */
  function autoOpenIfNeeded() {
    if (isFloat || !MC.store.data.settings.floatAutoOpen) return Promise.resolve(false);
    var invoke = invokeFn();
    if (!invoke) return Promise.resolve(false);
    return refreshStatus().then(function () { return state.open ? true : open(); });
  }

  MC.float = {
    WINDOW_ID: WINDOW_ID,
    FLOAT_URL: FLOAT_URL,
    isFloat: isFloat,
    state: state,
    invokeFn: invokeFn,
    open: open, close: close, toggle: toggle, focus: focus,
    refreshStatus: refreshStatus, announceReady: announceReady,
    autoOpenIfNeeded: autoOpenIfNeeded,
  };

  // 供冒烟与排障读取：当前窗口是否为宿主托管的自定义窗口
  try { state.customHost = !!window.__OTOOLS_CUSTOM_WINDOW__; } catch (e) {}
  void U;
})();

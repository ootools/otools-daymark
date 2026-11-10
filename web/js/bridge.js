/* OTools 宿主桥：文件导入/导出、主题、语言。
 * 两条通道（window.otools 包装 API / Tauri IPC）任一条可用即视为在宿主中；
 * 都不通时（普通浏览器预览）退回浏览器下载与 input[type=file]。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});

  function wrapper() {
    var a = (typeof window !== 'undefined' && (window.otools || window.utools)) || null;
    return a && a.dialog && typeof a.dialog.open === 'function' && typeof a.readHostFile === 'function' ? a : null;
  }

  function tauriInvoke() {
    var candidates = [window];
    try { if (window.parent && window.parent !== window) candidates.push(window.parent); } catch (e) {}
    try { if (window.top && window.top !== window) candidates.push(window.top); } catch (e) {}
    for (var i = 0; i < candidates.length; i += 1) {
      var t = candidates[i] && candidates[i].__TAURI_INTERNALS__;
      if (t && typeof t.invoke === 'function') return t.invoke.bind(t);
    }
    return null;
  }

  function available() { return !!(wrapper() || tauriInvoke()); }
  function fail(msg) { return Promise.reject(new Error(msg)); }

  function bytesToBase64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToText(b64) {
    var bin = atob(b64 || '');
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function baseName(p) {
    var s = String(p || '');
    var i = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
    return i >= 0 ? s.slice(i + 1) : s;
  }

  function pickOpenPath() {
    var filters = [{ name: 'JSON 数据', extensions: ['json'] }];
    var a = wrapper();
    if (a) {
      return a.dialog.open({ directory: false, multiple: false, title: '导入朝夕数据', filters: filters })
        .then(function (p) { return (p && typeof p === 'string') ? p : (p && p.path ? p.path : null); });
    }
    var invoke = tauriInvoke();
    if (!invoke) return fail('宿主文件对话框不可用');
    return invoke('tools_webview_pick_files', {
      options: { multiple: false, title: '导入朝夕数据', filters: filters },
    }).then(function (files) {
      var list = Array.isArray(files) ? files : (files ? [files] : []);
      var first = list[0];
      return first ? (typeof first === 'string' ? first : (first.path || null)) : null;
    });
  }

  function pickSavePath(name) {
    var filters = [{ name: 'JSON 数据', extensions: ['json'] }];
    var a = wrapper();
    if (a) {
      return a.dialog.save({ title: '导出朝夕数据', defaultPath: name, filters: filters })
        .then(function (p) { return (p && typeof p === 'string') ? p : (p && p.path ? p.path : null); });
    }
    var invoke = tauriInvoke();
    if (!invoke) return Promise.resolve(null);
    return invoke('tools_webview_pick_save_path', {
      options: { title: '导出朝夕数据', suggestedName: name, filters: filters },
    }).then(function (meta) { return meta ? (typeof meta === 'string' ? meta : (meta.path || null)) : null; });
  }

  function readHostFile(path) {
    var a = wrapper();
    if (a) return a.readHostFile(path);
    var invoke = tauriInvoke();
    if (!invoke) return fail('宿主文件读取不可用');
    return invoke('tools_webview_read_file', { path: path });
  }

  function writeHostFile(path, dataBase64) {
    var invoke = tauriInvoke();
    if (invoke) {
      // Tauri 命令收的是名为 request 的结构体，平铺参数会被拒。
      return invoke('tools_webview_write_file', { request: { path: path, dataBase64: dataBase64 } })
        .catch(function (e) {
          var a = wrapper();
          if (a && typeof a.writeHostFile === 'function') return a.writeHostFile({ path: path, dataBase64: dataBase64 });
          throw e;
        });
    }
    var a = wrapper();
    if (a && typeof a.writeHostFile === 'function') return a.writeHostFile({ path: path, dataBase64: dataBase64 });
    return fail('宿主文件写入不可用');
  }

  function browserDownload(name, text) {
    try {
      var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      return Promise.resolve('browser');
    } catch (e) {
      return fail('浏览器下载失败：' + e.message);
    }
  }

  function browserPick() {
    return new Promise(function (resolve, reject) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) { input.remove(); resolve(null); return; }
        var reader = new FileReader();
        reader.onload = function () { input.remove(); resolve({ name: file.name, text: String(reader.result || '') }); };
        reader.onerror = function () { input.remove(); reject(new Error('文件读取失败')); };
        reader.readAsText(file, 'utf-8');
      };
      input.click();
    });
  }

  /** 宿主语言：zh / en（UI 目前以中文为主，保留接口便于扩展） */
  function language() {
    try {
      return (window.__OTOOLS_LOCALE__ && window.__OTOOLS_LOCALE__.locale) ||
        (document.documentElement && document.documentElement.lang) ||
        (typeof navigator !== 'undefined' && navigator.language) || 'zh-CN';
    } catch (e) { return 'zh-CN'; }
  }

  function hostTheme() {
    var cl = document.documentElement && document.documentElement.classList;
    if (cl && (cl.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark')) return 'dark';
    if (cl && (cl.contains('light') || document.documentElement.getAttribute('data-theme') === 'light')) return 'light';
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (e) {}
    return '';
  }

  MC.host = {
    available: available,
    language: language,
    hostTheme: hostTheme,
    /** 打开 JSON 文件 → { name, text }；取消返回 null */
    openJson: function () {
      if (!available()) return browserPick();
      return pickOpenPath().then(function (path) {
        if (!path) return null;
        return readHostFile(path).then(function (file) {
          var b64 = (file && file.dataBase64) || '';
          return { name: (file && file.name) || baseName(path), path: path, text: base64ToText(b64) };
        });
      });
    },
    /** 保存 JSON 文件 → 目标路径 / 'browser' / null（取消） */
    saveJson: function (name, text) {
      if (!available()) return browserDownload(name, text);
      return pickSavePath(name).then(function (path) {
        if (!path) return null;
        return writeHostFile(path, bytesToBase64(new TextEncoder().encode(text)))
          .then(function () { return path; });
      });
    },
  };
})();

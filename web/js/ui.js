/* 通用 UI：动作分发、Toast、模态框、确认框、空状态、小片段 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;
  var I = MC.icons.icon;

  /* ── 动作表：视图模块各自注册 data-action 处理函数 ───────── */
  var map = {};
  MC.actions = {
    register: function (obj) {
      Object.keys(obj).forEach(function (k) { map[k] = obj[k]; });
    },
    handle: function (name, el, ev) {
      var fn = map[name];
      if (!fn) { console.warn('[daymark] 未注册的动作：' + name); return; }
      return fn(el, ev);
    },
  };

  /* ── Toast ────────────────────────────────────────────── */
  function toast(message, type) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.innerHTML = I(type === 'error' ? 'info' : type === 'success' ? 'check' : 'sparkle', 16) +
      '<span>' + U.esc(message) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('toast-out');
      setTimeout(function () { el.remove(); }, 260);
    }, 2800);
  }

  /* ── 模态框 ───────────────────────────────────────────── */
  function modal(opts) {
    var root = document.getElementById('modal-root');
    if (!root) return function () {};
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    var width = opts.width || 460;
    backdrop.innerHTML =
      '<div class="modal" style="max-width:' + width + 'px" role="dialog" aria-modal="true">' +
        '<div class="modal-head">' +
          '<div><h3>' + U.esc(opts.title || '') + '</h3>' +
          (opts.subtitle ? '<p>' + U.esc(opts.subtitle) + '</p>' : '') + '</div>' +
          '<button class="icon-btn" data-modal-close aria-label="关闭">' + I('close', 18) + '</button>' +
        '</div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        '<div class="modal-foot">' + (opts.footer || '') + '</div>' +
      '</div>';
    root.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('shown'); });

    function close() {
      backdrop.classList.remove('shown');
      setTimeout(function () { backdrop.remove(); }, 180);
    }
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop || e.target.closest('[data-modal-close]')) close();
    });
    if (opts.onMount) opts.onMount(backdrop, close);
    return close;
  }

  function confirm(opts) {
    return new Promise(function (resolve) {
      var close = modal({
        title: opts.title || '请确认',
        subtitle: opts.subtitle || '',
        body: '<p class="modal-text">' + U.esc(opts.message || '') + '</p>',
        footer:
          '<button class="btn btn-ghost" data-confirm-no>取消</button>' +
          '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm-yes>' +
            U.esc(opts.confirmText || '确定') + '</button>',
        onMount: function (root, hide) {
          root.querySelector('[data-confirm-yes]').addEventListener('click', function () { hide(); resolve(true); });
          root.querySelector('[data-confirm-no]').addEventListener('click', function () { hide(); resolve(false); });
        },
      });
      void close;
    });
  }

  /* ── 片段助手 ─────────────────────────────────────────── */
  function emptyState(iconName, title, desc, actionHtml) {
    return '<div class="empty-state">' +
      '<div class="empty-art">' + I(iconName || 'flower', 30) + '</div>' +
      '<h3>' + U.esc(title) + '</h3>' +
      '<p>' + U.esc(desc) + '</p>' +
      (actionHtml || '') + '</div>';
  }

  function sectionHead(title, subtitle, right) {
    return '<div class="section-head"><div><h3>' + U.esc(title) + '</h3>' +
      (subtitle ? '<p>' + U.esc(subtitle) + '</p>' : '') + '</div>' +
      (right ? '<div class="section-actions">' + right + '</div>' : '') + '</div>';
  }

  function pill(label, color, soft) {
    return '<span class="pill" style="--pill:' + color + ';--pill-soft:' + (soft || '#F5F2F6') + '">' +
      '<i></i>' + U.esc(label) + '</span>';
  }

  function meter(value, max, color) {
    var pct = max ? Math.max(0, Math.min(100, Math.round(value / max * 100))) : 0;
    return '<div class="meter"><i style="width:' + pct + '%;background:' + (color || 'var(--accent)') + '"></i></div>';
  }

  MC.ui = {
    toast: toast, modal: modal, confirm: confirm, emptyState: emptyState,
    sectionHead: sectionHead, pill: pill, meter: meter,
  };
})();

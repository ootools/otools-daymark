/* 日子编辑器：模板、阳历/农历双向输入、按周/月/季度/年周期与倍数、颜色图标、提醒与置顶。 */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util, S = MC.store, M = MC.model, I = MC.icons.icon, UI = MC.ui;
  var V = (MC.views = MC.views || {});

  function opts(list, value) {
    return list.map(function (x) {
      return '<option value="' + U.esc(x.id) + '"' + (x.id === value ? ' selected' : '') + '>' + U.esc(x.name) + '</option>';
    }).join('');
  }

  function lunarBlock(d) {
    var L = d.lunar || { year: U.parse(d.date).getFullYear(), month: 1, day: 1, leap: false };
    var months = MC.lunar.MONTH_CN;
    var mOpts = '', dOpts = '';
    for (var m = 1; m <= 12; m += 1) {
      mOpts += '<option value="' + m + '"' + (Number(L.month) === m ? ' selected' : '') + '>' + months[m] + '</option>';
    }
    for (var day = 1; day <= 30; day += 1) {
      dOpts += '<option value="' + day + '"' + (Number(L.day) === day ? ' selected' : '') + '>' + MC.lunar.dayCN(day) + '</option>';
    }
    return '<div class="lunar-block">' +
      '<label class="field"><span>农历年</span>' +
        '<input name="lunarYear" type="number" min="1900" max="2100" value="' + U.esc(L.year) + '"></label>' +
      '<label class="field"><span>农历月</span><select name="lunarMonth">' + mOpts + '</select></label>' +
      '<label class="field"><span>农历日</span><select name="lunarDay">' + dOpts + '</select></label>' +
      '<label class="check-inline"><input name="lunarLeap" type="checkbox"' + (L.leap ? ' checked' : '') + '> 闰月</label>' +
      '</div>';
  }

  function formHtml(d, isNew) {
    var isLunar = d.calendar === 'lunar';
    var lunarRepeat = d.repeat === 'lunar-yearly' || d.repeat === 'lunar-monthly';
    var tplRow = isNew ? '<div class="tpl-pick">' + M.TEMPLATES.map(function (t) {
      return '<button class="tpl-pick-chip' + (t.id === (d.__tpl || '') ? ' active' : '') +
        '" data-tpl-pick="' + t.id + '" type="button">' + I(t.icon, 15) + U.esc(t.name) + '</button>';
    }).join('') + '</div>' : '';

    return tplRow +
      '<div class="form-grid">' +
        '<label class="field"><span>日子名称 <em>*</em></span>' +
          '<input name="title" maxlength="40" placeholder="例如：研究生考试 / 妈妈的生日" value="' + U.esc(d.title) + '"></label>' +
        '<label class="field"><span>公历日期' + (isLunar ? '（农历自动换算）' : ' <em>*</em>') + '</span>' +
          '<input name="date" type="date" min="1900-01-01" max="2100-12-31" value="' + U.esc(d.date) + '"' +
          (isLunar ? ' readonly' : '') + '></label>' +
        '<label class="field"><span>类型</span><select name="mode">' + opts(M.MODES, d.mode) + '</select></label>' +
        '<label class="field"><span>重复周期</span><select name="repeat"' + (d.mode === 'countup' ? ' disabled' : '') + '>' +
          opts(M.REPEATS, d.repeat) + '</select></label>' +
        '<label class="field"><span>每隔几个周期</span>' +
          '<input name="repeatEvery" type="number" min="1" max="12" value="' + (d.repeatEvery || 1) + '"' +
          (d.mode === 'countup' || d.repeat === 'none' ? ' disabled' : '') + '></label>' +
        '<label class="field"><span>历法</span><select name="calendar">' +
          '<option value="solar"' + (!isLunar ? ' selected' : '') + '>阳历（公历）</option>' +
          '<option value="lunar"' + (isLunar ? ' selected' : '') + '>农历（可直接选年月日）</option>' +
        '</select></label>' +
        (isLunar ? lunarBlock(d) : '') +
        '<label class="field"><span>分类</span><select name="category">' + opts(M.CATEGORIES, d.category) + '</select></label>' +
        '<label class="field"><span>提前提醒（天）</span>' +
          '<input name="remindDays" type="number" min="0" max="30" value="' + (d.remindDays || 0) + '"></label>' +
        '<label class="field checkbox-field"><span>置顶显示</span>' +
          '<label class="switch"><input name="pinned" type="checkbox"' + (d.pinned ? ' checked' : '') + '><i></i><b>置顶</b></label></label>' +
      '</div>' +
      (isLunar ? '<p class="form-hint">' + I('info', 14) +
        ' 农历日期可直接填写（含闰月），上方公历日期会自动换算（范围 1900–2100）。农历生日建议把重复设为「按年（农历）」，闰月按实际年份处理。</p>' : '') +
      (lunarRepeat && !isLunar ? '<p class="form-hint">' + I('info', 14) +
        ' 农历周期按所选公历日期对应的农历年月日推算；若该年没有对应的闰月，会自动跳过。</p>' : '') +
      (d.mode === 'countup' ? '<p class="form-hint">' + I('info', 14) +
        ' 正数日从这一天开始累计，不会重复；「已经」的天数会每天自动增长。</p>'
        : (d.repeat !== 'none' ? '<p class="form-hint">' + I('repeat', 14) +
          ' 周期倒数：' + U.esc(M.repeatLabel(d)) + '。可填「每隔几个周期」，例如每 2 周、每季度、每 3 个月、每 2 年。</p>' : '')) +
      '<div class="picker-block"><span class="picker-label">颜色</span><div class="color-pick">' +
        M.COLORS.map(function (c) {
          return '<button class="color-dot' + (c.toLowerCase() === String(d.color).toLowerCase() ? ' active' : '') +
            '" data-color-pick="' + c + '" style="background:' + c + '" type="button" aria-label="' + c + '"></button>';
        }).join('') + '</div></div>' +
      '<div class="picker-block"><span class="picker-label">图标</span><div class="icon-pick">' +
        M.ICONS.map(function (n) {
          return '<button class="icon-dot' + (n === d.icon ? ' active' : '') +
            '" data-icon-pick="' + n + '" type="button" aria-label="' + n + '">' + I(n, 17) + '</button>';
        }).join('') + '</div></div>' +
      '<label class="field"><span>备注</span><textarea name="note" rows="2" maxlength="500" placeholder="想记下的话、要准备的东西…">' +
        U.esc(d.note) + '</textarea></label>';
  }

  function collect(root, d) {
    var names = ['title', 'date', 'mode', 'repeat', 'repeatEvery', 'calendar', 'category', 'remindDays', 'note'];
    names.forEach(function (n) {
      var el = root.querySelector('[name="' + n + '"]');
      if (el && !el.disabled) d[n] = el.value;
    });
    var pin = root.querySelector('[name="pinned"]');
    if (pin) d.pinned = pin.checked;
    d.remindDays = U.clamp(Number(d.remindDays) || 0, 0, 30);
    d.repeatEvery = U.clamp(Math.round(Number(d.repeatEvery) || 1), 1, 12);

    // 农历输入：把年月日换算成公历日期，计算层始终以公历为准
    if (d.calendar === 'lunar') {
      var ly = root.querySelector('[name="lunarYear"]');
      var lm = root.querySelector('[name="lunarMonth"]');
      var ld = root.querySelector('[name="lunarDay"]');
      var leap = root.querySelector('[name="lunarLeap"]');
      if (ly && lm && ld) {
        d.lunar = {
          year: U.clamp(Math.round(Number(ly.value) || U.parse(d.date).getFullYear()), 1900, 2100),
          month: U.clamp(Math.round(Number(lm.value) || 1), 1, 12),
          day: U.clamp(Math.round(Number(ld.value) || 1), 1, 30),
          leap: !!(leap && leap.checked),
        };
        var solar = MC.lunar.lunarToSolar(d.lunar.year, d.lunar.month, d.lunar.day, d.lunar.leap);
        if (solar) d.date = solar;
      }
    }
  }

  function adjust(d) {
    if (d.mode === 'countup') { d.repeat = 'none'; d.repeatEvery = 1; return; }
    if (d.repeat === 'none') d.repeatEvery = 1;
    // 历法与重复规则保持一致：农历日期默认走农历周期，阳历日期默认走公历周期
    if (d.calendar === 'lunar') {
      if (['none', 'yearly', 'monthly', 'quarterly', 'weekly'].indexOf(d.repeat) >= 0) d.repeat = 'lunar-yearly';
    } else {
      if (d.repeat === 'lunar-yearly') d.repeat = 'yearly';
      if (d.repeat === 'lunar-monthly') d.repeat = 'monthly';
    }
  }

  function openEditor(ev, isNew) {
    var d = JSON.parse(JSON.stringify(ev));
    d.__tpl = isNew ? '' : undefined;
    if (!d.lunar && d.calendar === 'lunar') {
      var l0 = MC.lunar.solarToLunar(d.date);
      if (l0) d.lunar = { year: l0.year, month: l0.month, day: l0.day, leap: l0.leap };
    }

    UI.modal({
      title: isNew ? '新建日子' : '编辑日子',
      subtitle: isNew ? '选个模板更快，也可以直接填' : ev.title,
      width: 580,
      body: '<div id="editor-body"></div>',
      footer: '<button class="btn btn-ghost" data-modal-close type="button">取消</button>' +
        '<button class="btn btn-primary" data-editor-save type="button">' + I('check', 15) + ' 保存</button>',
      onMount: function (root, hide) {
        var body = root.querySelector('#editor-body');
        function draw() { body.innerHTML = formHtml(d, isNew); }
        draw();

        root.addEventListener('input', function (e) {
          if (e.target && e.target.name) collect(root, d);
        });
        root.addEventListener('change', function (e) {
          if (!e.target || !e.target.name) return;
          var before = d.calendar;
          collect(root, d);
          if (e.target.name === 'calendar' && before !== d.calendar) {
            if (d.calendar === 'lunar') {
              var l = MC.lunar.solarToLunar(d.date);
              if (l) d.lunar = { year: l.year, month: l.month, day: l.day, leap: l.leap };
            } else if (d.lunar) {
              var s = MC.lunar.lunarToSolar(d.lunar.year, d.lunar.month, d.lunar.day, d.lunar.leap);
              if (s) d.date = s;
              d.lunar = null;
            }
          }
          if (e.target.name === 'category') {
            var cat = M.categoryOf(d.category);
            if (!d.__customColor) d.color = cat.color;
          }
          adjust(d); draw();
        });
        root.addEventListener('click', function (e) {
          var save = e.target.closest && e.target.closest('[data-editor-save]');
          if (save) {
            collect(root, d);
            if (d.mode === 'countup') { d.repeat = 'none'; d.repeatEvery = 1; }
            if (d.calendar === 'lunar') {
              var solar = d.lunar
                ? MC.lunar.lunarToSolar(d.lunar.year, d.lunar.month, d.lunar.day, d.lunar.leap) : null;
              if (!solar) {
                UI.toast('这个农历日期不存在（该年可能没有这个闰月或三十日）', 'error');
                return;
              }
              d.date = solar;
            }
            delete d.__tpl; delete d.__customColor;
            var result = isNew ? S.addEvent(d) : S.updateEvent(d.id, d);
            if (!result.ok) { UI.toast(result.reason || '保存失败', 'error'); return; }
            hide();
            UI.toast(isNew ? '日子已记下' : '已保存修改', 'success');
            return;
          }
          var tpl = e.target.closest && e.target.closest('[data-tpl-pick]');
          if (tpl) {
            collect(root, d);
            var next = M.fromTemplate(tpl.getAttribute('data-tpl-pick'));
            next.title = d.title; next.date = d.date; next.note = d.note;
            next.id = d.id; next.createdAt = d.createdAt;
            next.__tpl = tpl.getAttribute('data-tpl-pick');
            d = next; draw(); return;
          }
          var color = e.target.closest && e.target.closest('[data-color-pick]');
          if (color) { collect(root, d); d.color = color.getAttribute('data-color-pick'); d.__customColor = true; draw(); return; }
          var ico = e.target.closest && e.target.closest('[data-icon-pick]');
          if (ico) { collect(root, d); d.icon = ico.getAttribute('data-icon-pick'); draw(); return; }
        });
      },
    });

  }

  MC.actions.register({
    'new-event': function () { openEditor(M.emptyEvent(), true); },
    'open-template': function (el) {
      var d = M.fromTemplate(el.getAttribute('data-tpl'));
      d.__tpl = el.getAttribute('data-tpl');
      openEditor(d, true);
    },
    'edit-event': function (el) {
      var ev = S.getEvent(el.getAttribute('data-id'));
      if (ev) openEditor(ev, false);
    },
  });

  V.editor = { openEditor: openEditor };
})();

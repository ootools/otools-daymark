/* 万年历运行时：农历 / 干支 / 建除宜忌 / 节气 / 节日。
 * 数据来自 calendar-data.js（构建期预生成，运行时零依赖、不联网）。
 * 范围 1900–2100；宜忌为民俗参考，不具科学或决策意义。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var MC = (window.MC = window.MC || {});
  var U = MC.util;
  var D = MC.calendarData;
  var LUNAR = D.lunar.split('|');
  var TERMS = D.terms.split('|');

  var GAN = '甲乙丙丁戊己庚辛壬癸';
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  var ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
  var MONTH_CN = ['', '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '冬月', '腊月'];
  var TERM_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
    '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
    '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
  var JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

  /* 建除十二神对应的传统宜忌文案（民俗参考） */
  var YIJI = [
    { yi: ['出行', '上任', '见贵', '求财', '祈福'], ji: ['动土', '开仓', '掘井', '乘船'] },
    { yi: ['扫舍', '疗病', '解除', '出行', '拆卸'], ji: ['嫁娶', '赴任', '求官', '开市'] },
    { yi: ['祭祀', '祈福', '开市', '交易', '纳财'], ji: ['服药', '栽种', '安葬', '针灸'] },
    { yi: ['修饰垣墙', '平治道涂', '纳采', '嫁娶'], ji: ['掘井', '开渠', '栽种', '登高'] },
    { yi: ['祭祀', '祈福', '订盟', '纳采', '入学'], ji: ['诉讼', '出行', '交涉', '就医'] },
    { yi: ['捕捉', '结网', '造屋', '收敛', '祭祀'], ji: ['开市', '交易', '出行', '移徙'] },
    { yi: ['破屋坏垣', '求医治病', '拆卸'], ji: ['嫁娶', '开市', '动土', '签约'] },
    { yi: ['安床', '祭祀', '祈福', '静养'], ji: ['登高', '行船', '冒险', '远行'] },
    { yi: ['开市', '交易', '订盟', '嫁娶', '入学'], ji: ['诉讼', '争执', '破土'] },
    { yi: ['纳财', '进人口', '栽种', '捕捉', '收账'], ji: ['出行', '安葬', '开市', '放水'] },
    { yi: ['祭祀', '祈福', '入学', '开市', '动土'], ji: ['安葬', '放水', '针灸'] },
    { yi: ['筑堤', '修补', '收敛', '埋穴'], ji: ['开市', '出行', '手术', '开光'] },
  ];

  var SOLAR_FEST = {
    '01-01': '元旦', '02-14': '情人节', '03-08': '妇女节', '03-12': '植树节',
    '04-01': '愚人节', '05-01': '劳动节', '05-04': '青年节', '06-01': '儿童节',
    '07-01': '建党节', '08-01': '建军节', '09-10': '教师节', '10-01': '国庆节',
    '10-31': '万圣夜', '11-11': '双十一', '12-24': '平安夜', '12-25': '圣诞节',
  };
  var LUNAR_FEST = {
    '1-1': '春节', '1-15': '元宵节', '2-2': '龙抬头', '5-5': '端午节',
    '7-7': '七夕', '7-15': '中元节', '8-15': '中秋节', '9-9': '重阳节',
    '12-8': '腊八节', '12-23': '北方小年', '12-24': '南方小年',
  };

  var rowCache = {};
  var segCache = {};
  var DAY = 86400000;
  var ANCHOR_UTC = Date.UTC(2026, 10, 10) / DAY; // 2026-11-10 = 戊子日（六十甲子序号 24）

  function mod(n, m) { return ((n % m) + m) % m; }
  function sex(i) { return GAN[i % 10] + ZHI[i % 12]; }
  function yearDays(y) { return Math.round((Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / DAY); }
  function doyOf(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / DAY); }
  function utcDays(k) {
    var d = U.parse(k);
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
  }
  function dayCN(n) {
    var head = ['初', '十', '廿', '卅'];
    var num = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (n === 10) return '初十';
    if (n === 20) return '二十';
    if (n === 30) return '三十';
    return head[Math.floor(n / 10)] + num[(n % 10) - 1];
  }

  function decodeRow(y) {
    if (rowCache[y]) return rowCache[y];
    var s = LUNAR[y - D.from];
    if (!s) return null;
    var months = [];
    for (var i = 2; i < s.length; i += 4) {
      months.push({
        doy: parseInt(s.slice(i, i + 2), 36),
        m: parseInt(s[i + 2], 36),
        leap: s[i + 3] === '1',
      });
    }
    var spring = -1;
    for (var j = 0; j < months.length; j += 1) {
      if (months[j].m === 1 && !months[j].leap) { spring = months[j].doy; break; }
    }
    var row = { gz: parseInt(s.slice(0, 2), 36), months: months, spring: spring };
    rowCache[y] = row;
    return row;
  }

  /** 公历 y 年的所有农历月段（含跨年前后各一段，doy 相对 y 年 1 月 1 日） */
  function segments(y) {
    if (segCache[y]) return segCache[y];
    var row = decodeRow(y);
    if (!row) return [];
    var prev = decodeRow(y - 1);
    var next = decodeRow(y + 1);
    var arr = [];
    if (prev) {
      var last = prev.months[prev.months.length - 1];
      arr.push({ doy: last.doy - yearDays(y - 1), m: last.m, leap: last.leap });
    }
    row.months.forEach(function (x) { arr.push({ doy: x.doy, m: x.m, leap: x.leap }); });
    if (next) {
      var first = next.months[0];
      arr.push({ doy: yearDays(y) + first.doy, m: first.m, leap: first.leap });
    }
    var base = y + '-01-01';
    var out = arr.map(function (s, i) {
      return {
        doy: s.doy, m: s.m, leap: s.leap,
        startKey: U.addDays(base, s.doy),
        days: (i + 1 < arr.length ? arr[i + 1].doy : s.doy + 30) - s.doy,
        lunarYear: s.doy >= row.spring ? y : y - 1,
      };
    });
    segCache[y] = out;
    return out;
  }

  function inRange(k) {
    var y = U.parse(k).getFullYear();
    return y >= D.from && y <= D.to;
  }

  function dayGanzhiIndex(k) {
    return mod(24 + (utcDays(k) - ANCHOR_UTC), 60);
  }

  /** 公历 → 农历完整信息 */
  function solarToLunar(k) {
    if (!inRange(k)) return null;
    var d = U.parse(k);
    var y = d.getFullYear();
    var doy = doyOf(y, d.getMonth() + 1, d.getDate());
    var segs = segments(y);
    var seg = null;
    for (var i = 0; i < segs.length; i += 1) {
      if (segs[i].doy <= doy) seg = segs[i];
      else break;
    }
    if (!seg) return null;
    var lday = doy - seg.doy + 1;
    var lunarYear = seg.lunarYear;
    var yearIdx = mod(lunarYear - 4, 60);
    var yearGan = yearIdx % 10;
    var firstGan = mod((yearGan % 5) * 2 + 2, 10); // 五虎遁：正月月干
    var monthGan = mod(firstGan + (seg.m - 1), 10);
    var monthZhi = mod(seg.m + 1, 12);             // 正月建寅
    var dayIdx = dayGanzhiIndex(k);
    var dayZhi = dayIdx % 12;
    var jc = mod(dayZhi - monthZhi, 12);
    return {
      year: lunarYear,
      month: seg.m,
      day: lday,
      leap: seg.leap,
      monthDays: seg.days,
      monthCN: (seg.leap ? '闰' : '') + MONTH_CN[seg.m],
      dayCN: dayCN(lday),
      ganzhiYear: sex(yearIdx),
      ganzhiMonth: GAN[monthGan] + ZHI[monthZhi],
      ganzhiDay: sex(dayIdx),
      zodiac: ZODIAC[yearIdx % 12],
      dayZhi: dayZhi,
      jianchu: JIANCHU[jc],
      jianchuIndex: jc,
      chong: ZODIAC[mod(dayZhi + 6, 12)],
      yi: YIJI[jc].yi,
      ji: YIJI[jc].ji,
    };
  }

  /** 农历 → 公历（用于农历生日 / 每年重复） */
  function lunarToSolar(lunarYear, month, day, leap) {
    for (var py = lunarYear; py <= lunarYear + 1; py += 1) {
      var segs = segments(py);
      for (var i = 0; i < segs.length; i += 1) {
        var s = segs[i];
        if (s.m === month && s.leap === !!leap && s.lunarYear === lunarYear && day <= s.days) {
          return U.addDays(s.startKey, day - 1);
        }
      }
    }
    return null;
  }

  function termDoyList(y) {
    if (!decodeRow(y)) return null;
    var s = TERMS[y - D.from];
    var out = [];
    for (var i = 0; i < 24; i += 1) out.push(parseInt(s.slice(i * 2, i * 2 + 2), 36));
    return out;
  }

  function termOn(k) {
    if (!inRange(k)) return '';
    var d = U.parse(k);
    var y = d.getFullYear();
    var list = termDoyList(y);
    if (!list) return '';
    var doy = doyOf(y, d.getMonth() + 1, d.getDate());
    var i = list.indexOf(doy);
    return i < 0 ? '' : TERM_NAMES[i];
  }

  function termList(y) {
    var list = termDoyList(y);
    if (!list) return [];
    return list.map(function (doy, i) {
      return { name: TERM_NAMES[i], key: U.addDays(y + '-01-01', doy), doy: doy };
    });
  }

  function nextTerm(k) {
    var y = U.parse(k).getFullYear();
    for (var yy = y; yy <= y + 1; yy += 1) {
      var list = termList(yy);
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].key > k) return list[i];
      }
    }
    return null;
  }

  function nthWeekday(k, month, weekday, nth) {
    var d = U.parse(k);
    if (d.getMonth() + 1 !== month || d.getDay() !== weekday) return false;
    return Math.floor((d.getDate() - 1) / 7) + 1 === nth;
  }

  function festivals(k, l, term) {
    var out = [];
    var d = U.parse(k);
    var mmdd = U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
    if (l && !l.leap) {
      var lf = LUNAR_FEST[l.month + '-' + l.day];
      if (lf) out.push({ name: lf, type: 'traditional' });
      if (l.month === 12 && l.day === l.monthDays) out.push({ name: '除夕', type: 'traditional' });
    }
    if (term) out.push({ name: term, type: 'term' });
    if (SOLAR_FEST[mmdd]) out.push({ name: SOLAR_FEST[mmdd], type: 'solar' });
    if (nthWeekday(k, 5, 0, 2)) out.push({ name: '母亲节', type: 'solar' });
    if (nthWeekday(k, 6, 0, 3)) out.push({ name: '父亲节', type: 'solar' });
    if (nthWeekday(k, 11, 4, 4)) out.push({ name: '感恩节', type: 'solar' });
    return out;
  }

  /** 日历格子上显示的主标签 */
  function primaryLabel(l, term, fests) {
    var trad = fests.filter(function (f) { return f.type === 'traditional'; })[0];
    if (trad) return { text: trad.name, kind: 'traditional' };
    if (term) return { text: term, kind: 'term' };
    var solar = fests.filter(function (f) { return f.type === 'solar'; })[0];
    if (solar) return { text: solar.name, kind: 'solar' };
    if (!l) return { text: '', kind: 'plain' };
    if (l.day === 1) return { text: l.monthCN, kind: 'month' };
    return { text: l.dayCN, kind: 'plain' };
  }

  /** 某天的完整信息；customHolidays 由 store 传入（用户自定义放假/补班） */
  function info(k, customHolidays) {
    var l = solarToLunar(k);
    var term = termOn(k);
    var fests = festivals(k, l, term);
    return {
      key: k,
      weekday: U.weekdayCN(k),
      inRange: inRange(k),
      lunar: l,
      term: term,
      festivals: fests,
      label: primaryLabel(l, term, fests),
      holiday: (MC.holidays ? MC.holidays.lookup(k, customHolidays) : null),
    };
  }

  MC.lunar = {
    from: D.from,
    to: D.to,
    TERM_NAMES: TERM_NAMES,
    MONTH_CN: MONTH_CN,
    JIANCHU: JIANCHU,
    ZODIAC: ZODIAC,
    inRange: inRange,
    info: info,
    solarToLunar: solarToLunar,
    lunarToSolar: lunarToSolar,
    termOn: termOn,
    termList: termList,
    nextTerm: nextTerm,
    festivals: festivals,
    primaryLabel: primaryLabel,
    dayGanzhi: function (k) { return sex(dayGanzhiIndex(k)); },
    dayCN: dayCN,
  };
})();

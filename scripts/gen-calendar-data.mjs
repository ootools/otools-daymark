/**
 * 生成 web/js/calendar-data.js —— 1900–2100 的离线历法数据。
 *
 * 农历：优先读 scripts/lunar-rows.txt（由 gen-lunar-rows.py 用 lunardate / lunarInfo 表生成，
 *       与中国官方农历一致）。ICU 的中文日历只作为无该文件时的回退，且已知 2027 年偏差 1 天。
 * 节气：用 Meeus 低精度太阳视黄经，求黄经跨过 15° 整数倍的时刻，取北京时间日期。
 *
 * 用法：
 *   python scripts/gen-lunar-rows.py
 *   node scripts/gen-calendar-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FROM = 1900;
const TO = 2100;
const DAY = 86400000;
const RAD = Math.PI / 180;
const B36 = (n, w) => n.toString(36).padStart(w, '0');

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const SEXAGENARY = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);

const MONTH_MAP = {
  正月: 1, 二月: 2, 三月: 3, 四月: 4, 五月: 5, 六月: 6,
  七月: 7, 八月: 8, 九月: 9, 十月: 10, 十一月: 11, 冬月: 11,
  十二月: 12, 腊月: 12,
};

const TERM_NAMES = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];

function dayOfYear(y, m, d) {
  return Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 1)) / DAY);
}

function dateFromDoy(y, doy) {
  const dt = new Date(Date.UTC(y, 0, 1) + doy * DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/* ── 农历：ICU 中国日历 ─────────────────────────────────────────── */
const fmtNum = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Shanghai',
});
const fmtFull = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  dateStyle: 'full', timeZone: 'Asia/Shanghai',
});

function partsOf(dt, fmt) {
  const out = {};
  for (const p of fmt.formatToParts(dt)) out[p.type] = p.value;
  return out;
}

function buildLunar() {
  const src = path.join(root, 'scripts/lunar-rows.txt');
  if (fs.existsSync(src)) {
    const rows = fs.readFileSync(src, 'utf8').trim().split('|');
    if (rows.length !== TO - FROM + 1) {
      throw new Error(`lunar-rows.txt 行数异常：${rows.length}，应为 ${TO - FROM + 1}`);
    }
    console.log('农历数据源：scripts/lunar-rows.txt（lunardate / lunarInfo 官方农历表）');
    return rows.join('|');
  }
  console.warn('⚠ 缺少 scripts/lunar-rows.txt，回退 ICU 中文日历（2027 等年份可能偏差 1 天）');
  const rows = [];
  for (let y = FROM; y <= TO; y += 1) {
    const months = [];
    let ganzhi = -1;
    for (let m = 0; m < 12; m += 1) {
      const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (let d = 1; d <= days; d += 1) {
        // UTC 04:00 = 北京 12:00，避开时区换日边界
        const dt = new Date(Date.UTC(y, m, d, 4, 0));
        const p = partsOf(dt, fmtNum);
        if (p.day !== '1') continue;
        const leap = p.month.startsWith('闰') ? 1 : 0;
        const name = leap ? p.month.slice(1) : p.month;
        const monthNo = MONTH_MAP[name];
        if (!monthNo) throw new Error(`未知农历月名：${p.month} @ ${y}-${m + 1}-${d}`);
        months.push({ doy: dayOfYear(y, m, d), m: monthNo, leap });
        if (monthNo === 1 && !leap && ganzhi < 0) {
          const full = partsOf(dt, fmtFull);
          ganzhi = SEXAGENARY.indexOf(full.yearName);
          if (ganzhi < 0) throw new Error(`未知年干支：${full.yearName} @ ${y}`);
        }
      }
    }
    if (ganzhi < 0) throw new Error(`${y} 年没有正月初一`);
    if (months.length < 12 || months.length > 13) {
      throw new Error(`${y} 年农历月首数量异常：${months.length}`);
    }
    months.sort((a, b) => a.doy - b.doy);
    // 每年编码：2 位干支序号 + 若干 4 字符段（2 位年内日序 / 1 位农历月 / 1 位闰月标志）
    rows.push(B36(ganzhi, 2) + months.map((x) =>
      B36(x.doy, 2) + B36(x.m, 1) + (x.leap ? '1' : '0')).join(''));
  }
  return rows.join('|');
}

/* ── 节气：太阳视黄经 ───────────────────────────────────────────── */
function norm360(x) {
  const v = x % 360;
  return v < 0 ? v + 360 : v;
}

function deltaLon(lon, target) {
  let d = norm360(lon) - target;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD)
    + 0.000289 * Math.sin(3 * M * RAD);
  const omega = 125.04 - 1934.136 * T;
  return L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
}

function solveCrossing(jd0, target) {
  let lo = jd0;
  let hi = jd0 + 1;
  for (let i = 0; i < 48; i += 1) {
    const mid = (lo + hi) / 2;
    if (deltaLon(sunLongitude(mid), target) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function buildTerms() {
  const years = Array.from({ length: TO - FROM + 1 }, () => Array(24).fill(-1));
  const jdStart = Date.UTC(1899, 11, 20) / DAY + 2440587.5;
  const jdEnd = Date.UTC(2101, 0, 12) / DAY + 2440587.5;
  let prevK = null;
  let prevJd = 0;
  for (let jd = Math.floor(jdStart); jd <= jdEnd; jd += 1) {
    const k = Math.floor(norm360(sunLongitude(jd)) / 15);
    if (prevK !== null && k !== prevK) {
      const target = (k * 15) % 360;
      const moment = solveCrossing(prevJd, target);
      const bj = new Date((moment - 2440587.5) * DAY + 8 * 3600000);
      const y = bj.getUTCFullYear();
      const idx = ((target - 285 + 360) % 360) / 15;
      if (y >= FROM && y <= TO) {
        years[y - FROM][idx] = dayOfYear(y, bj.getUTCMonth(), bj.getUTCDate());
      }
    }
    prevK = k;
    prevJd = jd;
  }
  for (let y = FROM; y <= TO; y += 1) {
    const row = years[y - FROM];
    if (row.some((v) => v < 0)) {
      throw new Error(`${y} 年节气缺失：${row.map((v, i) => v < 0 ? TERM_NAMES[i] : '').filter(Boolean).join(',')}`);
    }
  }
  return years.map((row) => row.map((v) => B36(v, 2)).join('')).join('|');
}

/* ── 运行时解码用的参考实现（此处仅用于自检，与 lunar.js 保持一致） ── */
function decodeLunarRow(row) {
  const gz = parseInt(row.slice(0, 2), 36);
  const months = [];
  for (let i = 2; i < row.length; i += 4) {
    months.push({
      doy: parseInt(row.slice(i, i + 2), 36),
      m: parseInt(row[i + 2], 36),
      leap: row[i + 3] === '1',
    });
  }
  return { gz, months };
}

function solarToLunar(lunarRows, y, m, d) {
  const doy = dayOfYear(y, m - 1, d);
  const row = decodeLunarRow(lunarRows[y - FROM]);
  let seg = null;
  for (const x of row.months) {
    if (x.doy <= doy) seg = x;
    else break;
  }
  if (seg) return { month: seg.m, leap: seg.leap, day: doy - seg.doy + 1 };
  // 公历年初尚未到正月，仍属于上一农历年的最后一个月
  const prev = decodeLunarRow(lunarRows[y - FROM - 1]);
  const last = prev.months[prev.months.length - 1];
  const prevYearDays = dayOfYear(y - 1, 11, 31) + 1;
  return { month: last.m, leap: last.leap, day: prevYearDays - last.doy + doy + 1 };
}

/* ── 自检 ───────────────────────────────────────────────────────── */
function verify(lunarStr, termsStr) {
  const lunarRows = lunarStr.split('|');
  const termRows = termsStr.split('|');
  const checks = [];
  const push = (name, ok, got) => checks.push({ name, ok, got });

  // 2026 年二十四节气（公开日历：立春 2/4、清明 4/5、立冬 11/7 17:52、小雪 11/22 15:23…）
  const expected2026 = [
    '1-5', '1-20', '2-4', '2-18', '3-5', '3-20', '4-5', '4-20',
    '5-5', '5-21', '6-5', '6-21', '7-7', '7-23', '8-7', '8-23',
    '9-7', '9-23', '10-8', '10-23', '11-7', '11-22', '12-7', '12-22',
  ];
  const row26 = termRows[2026 - FROM];
  const got26 = [];
  for (let i = 0; i < 24; i += 1) {
    const doy = parseInt(row26.slice(i * 2, i * 2 + 2), 36);
    const dt = dateFromDoy(2026, doy);
    got26.push(`${dt.m}-${dt.d}`);
  }
  push('2026 二十四节气日期', expected2026.join(',') === got26.join(','), got26.join(','));

  // 2027 国务院通知里的农历节日：2/5 除夕、6/9 端午、9/15 中秋
  const lunarCases = [
    { y: 2026, m: 11, d: 10, want: '10-2' },      // 农历十月初二
    { y: 2027, m: 2, d: 6, want: '1-1' },         // 正月初一（2/5 除夕）
    { y: 2027, m: 6, d: 9, want: '5-5' },         // 端午
    { y: 2027, m: 9, d: 15, want: '8-15' },       // 中秋
    { y: 2026, m: 2, d: 17, want: '1-1' },        // 丙午年春节
  ];
  for (const c of lunarCases) {
    const r = solarToLunar(lunarRows, c.y, c.m, c.d);
    const got = `${r.month}-${r.day}`;
    push(`农历 ${c.y}-${c.m}-${c.d}`, got === c.want, got + (r.leap ? '(闰)' : ''));
  }

  // 日干支锚点：2026-11-10 = 戊子日（序号 24），六十甲子连续推
  const anchor = Date.UTC(2026, 10, 10) / DAY;
  const gz = (date) => {
    const n = Date.UTC(date.y, date.m - 1, date.d) / DAY;
    return SEXAGENARY[((24 + (n - anchor)) % 60 + 60) % 60];
  };
  push('日干支锚点 2026-11-10', gz({ y: 2026, m: 11, d: 10 }) === '戊子', gz({ y: 2026, m: 11, d: 10 }));
  const row = decodeLunarRow(lunarRows[2026 - FROM]);
  push('2026 农历年干支', SEXAGENARY[row.gz] === '丙午', SEXAGENARY[row.gz]);
  console.log(`INFO  2026 农历月序：${row.months.map((x) => x.m + (x.leap ? '闰' : '')).join(',')}`);

  let failed = 0;
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.got ? '  → ' + c.got : ''}`);
    if (!c.ok) failed += 1;
  }
  return failed;
}

const lunarStr = buildLunar();
const termsStr = buildTerms();
const failed = verify(lunarStr, termsStr);

const out = `/* 自动生成，请勿手改。来源：scripts/gen-calendar-data.mjs
 * 农历 1900–2100：lunardate / lunarInfo 官方农历表预生成；节气：太阳视黄经求交点。
 * lunar 每项 = 2 位年干支序号 + 每段 4 字符（2 位年内日序 / 1 位农历月 / 1 位闰标志）
 * terms 每项 = 24 × 2 位年内日序，顺序同 TERM_NAMES（小寒…冬至）
 */
(function (root) {
  var MC = (root.MC = root.MC || {});
  MC.calendarData = {
    from: ${FROM},
    to: ${TO},
    lunar: '${lunarStr}',
    terms: '${termsStr}'
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;
fs.writeFileSync(path.join(root, 'web/js/calendar-data.js'), out, 'utf8');
console.log(`\n已写入 web/js/calendar-data.js（${(out.length / 1024).toFixed(1)} KB）`);
console.log(`lunar ${lunarStr.length} 字符 / terms ${termsStr.length} 字符 / 自检失败 ${failed} 项`);
if (failed) process.exitCode = 1;

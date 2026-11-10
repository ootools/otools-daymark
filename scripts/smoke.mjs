/**
 * 真实浏览器冒烟：CDP 点击回归 + Panel / 悬浮窗尺寸截图（无第三方依赖）。
 * 用法（服务 + Chrome 由外部同一条 shell 命令拉起，见 README）：
 *   CDP_PORT=9240 BASE_URL=http://127.0.0.1:6500/ node scripts/smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(root, '_shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CDP_PORT = Number(process.env.CDP_PORT || 9240);
const BASE = process.env.BASE_URL || 'http://127.0.0.1:6500/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  let page = null;
  for (let i = 0; i < 20 && !page; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      page = list.find((t) => t.type === 'page');
    } catch (e) { /* Chrome 还在启动 */ }
    if (!page) await sleep(300);
  }
  if (!page) throw new Error('找不到 CDP 页面目标');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const jsErrors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      jsErrors.push((d.text || '') + ' ' + (d.exception && d.exception.description ? d.exception.description : ''));
    }
  };
  const send = (method, params) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
  });
  return { send, jsErrors };
}

async function main() {
  const { send, jsErrors } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 980, height: 700, deviceScaleFactor: 1, mobile: false,
  });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.text);
    return res.result && res.result.result ? res.result.result.value : undefined;
  };
  const exists = (sel) => evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const count = (sel) => evaluate(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
  const click = (sel) => evaluate(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true;})()`);
  const nav = (v) => click(`[data-action="nav"][data-view="${v}"]`);
  const overflow = () => evaluate('document.documentElement.scrollWidth + "/" + document.documentElement.clientWidth');

  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
  };
  const shot = async (name) => {
    await evaluate("(function(){var r=document.getElementById('toast-root');if(r)r.innerHTML='';return true;})()");
    const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (res.result && res.result.data) {
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(res.result.data, 'base64'));
      console.log(`  shot  ${name}.png`);
    }
  };
  const goto = async (url) => {
    await send('Page.navigate', { url });
    for (let i = 0; i < 30; i += 1) {
      await sleep(180);
      if (await evaluate('!!(window.MC && window.MC.store && window.MC.store.ui.ready)')) return;
    }
    throw new Error('页面加载超时：' + url);
  };

  // ── 首次打开 / 引导 ─────────────────────────────────
  await goto(BASE + '?reset=1');

  // ── 模型与离线历法自检 ──────────────────────────────
  check('农历范围覆盖 1900–2100', (await evaluate('MC.lunar.from + "/" + MC.lunar.to')) === '1900/2100');
  check('农历 2027 正月初一 = 2027-02-06', (await evaluate('MC.lunar.lunarToSolar(2027,1,1,false)')) === '2027-02-06');
  check('每年重复自动跳到下一年', (await evaluate(
    "MC.model.nextFor({date:'2020-01-01',repeat:'yearly',mode:'countdown'},'2026-11-10')")) === '2027-01-01');
  check('每月重复收敛到月末', (await evaluate(
    "MC.model.nextFor({date:'2026-01-31',repeat:'monthly',mode:'countdown'},'2026-11-10')")) === '2026-11-30');
  check('正数日不重复', (await evaluate(
    "(function(){var d=MC.model.normalize({events:[{title:'x',date:'2020-01-01',mode:'countup',repeat:'yearly'}]});return d.events[0].repeat;})()")) === 'none');
  check('农历每年重复能换算下一次', (await evaluate(
    "(function(){var e=MC.model.emptyEvent();e.date=MC.lunar.lunarToSolar(2027,1,1,false);e.repeat='lunar-yearly';e.lunar={year:2027,month:1,day:1,leap:false};return MC.model.nextFor(e,'2027-03-01')===MC.lunar.lunarToSolar(2028,1,1,false);})()")) === true,
    await evaluate("MC.lunar.lunarToSolar(2028,1,1,false)"));
  check('季度重复跳到下一个季度', (await evaluate(
    "MC.model.nextFor({date:'2026-01-15',repeat:'quarterly',mode:'countdown'},'2026-11-10')")) === '2027-01-15');
  check('每 2 周重复', (await evaluate(
    "MC.model.nextFor({date:'2026-11-01',repeat:'weekly',repeatEvery:2,mode:'countdown'},'2026-11-10')")) === '2026-11-15');
  check('每 3 个月重复', (await evaluate(
    "MC.model.nextFor({date:'2026-01-31',repeat:'monthly',repeatEvery:3,mode:'countdown'},'2026-11-10')")) === '2027-01-31');
  check('每 2 年重复', (await evaluate(
    "MC.model.nextFor({date:'2026-01-01',repeat:'yearly',repeatEvery:2,mode:'countdown'},'2026-11-10')")) === '2028-01-01');
  check('农历每月重复', (await evaluate(
    "(function(){var e=MC.model.emptyEvent();e.date=MC.lunar.lunarToSolar(2027,1,1,false);e.repeat='lunar-monthly';e.lunar={year:2027,month:1,day:1,leap:false};return MC.model.nextFor(e,'2027-03-01')===MC.lunar.lunarToSolar(2027,2,1,false);})()")) === true,
    await evaluate("MC.lunar.lunarToSolar(2027,2,1,false)"));
  check('周期倍数归一化到 1–12', (await evaluate(
    "(function(){var d=MC.model.normalize({events:[{title:'x',date:'2026-01-01',repeat:'quarterly',repeatEvery:99}]});return d.events[0].repeatEvery;})()")) === 12);
  check('重复周期标签含倍数', (await evaluate(
    "MC.model.repeatLabel({repeat:'quarterly',repeatEvery:2,mode:'countdown'})")) === '每 2 季度一次');

  check('首次打开显示欢迎引导', await exists('.onboard-card'));
  check('引导含四项能力说明', (await count('.onboard-list li')) === 4);
  await shot('01-onboarding');

  await click('[data-action="onboard-demo"]');
  await sleep(350);
  check('载入示例后进入今日页', await exists('.hero'));
  check('示例 10 个日子（含 1 个归档）', (await evaluate('MC.store.data.events.length')) === 10);
  check('示例覆盖周/月/季度/年与阳历/农历', (await evaluate(
    "(function(){var r={},c={},n=0;MC.store.data.events.forEach(function(e){r[e.repeat]=1;c[e.calendar]=1;if(e.repeatEvery>1)n++;});return ['weekly','monthly','quarterly','yearly','lunar-yearly'].every(function(k){return !!r[k];})&&!!c.lunar&&!!c.solar&&n>0;})()")) === true,
    await evaluate("(function(){var r={};MC.store.data.events.forEach(function(e){r[e.repeat]=1;});return Object.keys(r).join('/');})()"));
  check('主视觉大日期为数字', /^\d+$/.test(String(await text('.hero-num')).trim()), await text('.hero-num'));
  check('三个概览卡', (await count('.stat-card')) === 3);
  check('八个快捷模板', (await count('.tpl-chip')) === 8);
  check('近期速览有条目', (await count('.day-row')) > 0, String(await count('.day-row')));
  check('样式表已生效', (await evaluate("getComputedStyle(document.querySelector('.stat-card')).borderRadius")) === '15px');
  check('面板宽度下无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    await overflow());
  await shot('02-today-light');

  await click('[data-action="theme-quick"]');
  await sleep(220);
  check('切换深色主题', (await evaluate("document.documentElement.getAttribute('data-theme')")) === 'dark');
  await shot('03-today-dark');
  await click('[data-action="theme-quick"]');
  await sleep(180);

  // ── 全部日子 ────────────────────────────────────────
  await nav('events');
  await sleep(250);
  check('示例卡片 9 张（归档不显示）', (await count('.event-card')) === 9, String(await count('.event-card')));
  check('分类筛选共 8 项', (await count('.filter-chip')) === 8, String(await count('.filter-chip')));
  check('正数日与倒数日并存', (await evaluate("MC.store.activeEvents().some(function(e){return e.mode==='countup';})")) === true &&
    (await evaluate("MC.store.activeEvents().some(function(e){return e.mode==='countdown';})")) === true);
  await shot('04-events');

  await evaluate(`(function(){var i=document.querySelector('#event-query');i.value='妈妈';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(150);
  check('搜索过滤生效', (await count('.event-card')) === 1, String(await count('.event-card')));
  await evaluate(`(function(){var i=document.querySelector('#event-query');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await sleep(150);
  check('清空搜索恢复全部', (await count('.event-card')) === 9, String(await count('.event-card')));

  await click('[data-action="set-filter"][data-filter="work"]');
  await sleep(180);
  check('按分类筛选', (await count('.event-card')) === 2, String(await count('.event-card')));
  await click('[data-action="set-filter"][data-filter="all"]');
  await sleep(180);
  await click('[data-action="toggle-view-mode"]');
  await sleep(180);
  check('切换紧凑列表', await exists('.event-grid.is-list'));
  await click('[data-action="toggle-view-mode"]');
  await sleep(150);
  await click('[data-action="toggle-archived"]');
  await sleep(180);
  check('归档视图包含归档日子', (await count('.event-card')) === 10, String(await count('.event-card')));
  await click('[data-action="toggle-archived"]');
  await sleep(150);

  // ── 编辑器 ──────────────────────────────────────────
  const before = await evaluate('MC.store.data.events.length');
  await click('[data-action="new-event"]');
  await sleep(250);
  check('打开日子编辑器', await exists('#editor-body'));
  check('编辑器表单项齐全', (await count('#editor-body [name]')) >= 10, String(await count('#editor-body [name]')));
  check('模板快捷方式齐全', (await count('[data-tpl-pick]')) === 8);
  await shot('05-editor');
  await click('[data-tpl-pick="exam"]');
  await sleep(160);
  await evaluate(`(function(){var r=document.querySelector('.modal-backdrop');r.querySelector('[name="title"]').value='冒烟测试日';r.querySelector('[name="date"]').value='2027-06-07';return true;})()`);
  await click('[data-editor-save]');
  await sleep(300);
  check('新建日子写入数据', (await evaluate('MC.store.data.events.length')) === before + 1);
  check('保存后弹层已关闭', !(await exists('#editor-body')));
  check('新日子标题正确', (await evaluate("MC.store.data.events.filter(function(e){return e.title==='冒烟测试日';}).length")) === 1);
  check('模板带出考试分类', (await evaluate("MC.store.data.events.filter(function(e){return e.title==='冒烟测试日';})[0].category")) === 'exam');

  const newId = await evaluate("MC.store.data.events.filter(function(e){return e.title==='冒烟测试日';})[0].id");
  await click(`[data-action="toggle-pin"][data-id="${newId}"]`);
  await sleep(180);
  check('置顶切换', (await evaluate(`MC.store.getEvent(${JSON.stringify(newId)}).pinned`)) === true);
  await click(`[data-action="duplicate-event"][data-id="${newId}"]`);
  await sleep(180);
  check('复制日子', (await evaluate('MC.store.data.events.length')) === before + 2);
  await click(`[data-action="toggle-archive"][data-id="${newId}"]`);
  await sleep(180);
  check('归档切换', (await evaluate(`MC.store.getEvent(${JSON.stringify(newId)}).archived`)) === true);
  check('归档后从活跃列表移除', !(await exists(`.event-card[data-id="${newId}"]`)));
  // 归档卡片只在「归档」视图里可见，取消归档必须先切到该视图（真实用户路径）
  await click('[data-action="toggle-archived"]');
  await sleep(180);
  check('归档视图可找回该日子', await exists(`.event-card[data-id="${newId}"]`));
  await click(`[data-action="toggle-archive"][data-id="${newId}"]`);
  await sleep(180);
  check('取消归档恢复', (await evaluate(`MC.store.getEvent(${JSON.stringify(newId)}).archived`)) === false);
  await click('[data-action="toggle-archived"]');
  await sleep(150);
  check('删除按钮可见', await exists(`[data-action="delete-event"][data-id="${newId}"]`));
  await click(`[data-action="delete-event"][data-id="${newId}"]`);
  await sleep(200);
  check('删除前弹出确认框', await exists('[data-confirm-yes]'));
  await click('[data-confirm-yes]');
  await sleep(250);
  check('确认后删除', (await evaluate('MC.store.data.events.length')) === before + 1);

  // ── 时间轴 / 洞察 ───────────────────────────────────
  await nav('timeline');
  await sleep(250);
  check('时间轴按月份分组', (await count('.tl-group')) > 0, String(await count('.tl-group')));
  check('时间轴条目可点击编辑', (await count('.tl-row')) > 0, String(await count('.tl-row')));
  check('已过去区域存在', (await count('.past-row')) > 0);
  await shot('06-timeline');

  await nav('insights');
  await sleep(250);
  check('四个洞察面板', (await count('.panel-card')) === 4);
  check('分类分布 7 行', (await count('.bar-row')) === 7);
  check('距离分布 5 档', (await count('.bucket')) === 5);
  await shot('07-insights');

  // ── 设置 ────────────────────────────────────────────
  await nav('settings');
  await sleep(250);
  check('设置项齐全', (await count('.setting-row')) >= 10, String(await count('.setting-row')));
  check('数据管理四个入口', (await count('.data-actions .btn')) === 4);
  check('悬浮窗配置面板', await exists('.float-panel'));
  await click('[data-action="set-accent"][data-accent="indigo"]');
  await sleep(180);
  check('切换主色为靛蓝', (await evaluate("document.documentElement.getAttribute('data-accent')")) === 'indigo');
  await click('[data-action="set-accent"][data-accent="coral"]');
  await sleep(150);
  await click('[data-action="set-theme"][data-mode="dark"]');
  await sleep(180);
  check('设置页切换主题', (await evaluate("document.documentElement.getAttribute('data-theme')")) === 'dark');
  await click('[data-action="set-theme"][data-mode="light"]');
  await sleep(150);
  await shot('08-settings');
  await evaluate(`(function(){var c=document.querySelector('[data-field="privacyMode"]');c.checked=true;c.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(180);
  check('隐私模式开启', (await evaluate('document.body.classList.contains("privacy-on")')) === true);
  await evaluate(`(function(){var c=document.querySelector('[data-field="privacyMode"]');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(150);
  check('导出 JSON 可解析', (await evaluate('JSON.parse(MC.store.serialize()).data.events.length')) === before + 1);
  check('导入解析器可用', (await evaluate('MC.store.parseImport(MC.store.serialize()).events.length')) === before + 1);

  // ── 周期倒数 / 农历输入：真实表单交互 ────────────────
  await nav('events');
  await sleep(220);
  await click('[data-action="new-event"]');
  await sleep(220);
  await click('[data-tpl-pick="quarterly"]');
  await sleep(160);
  check('季度模板带出 quarterly', (await evaluate(
    '(document.querySelector(\'.modal-backdrop [name="repeat"]\')||{}).value')) === 'quarterly');
  await evaluate(`(function(){var i=document.querySelector('.modal-backdrop [name="repeatEvery"]');i.value='2';i.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(160);
  await evaluate(`(function(){var r=document.querySelector('.modal-backdrop');r.querySelector('[name="title"]').value='双季度复盘';r.querySelector('[name="date"]').value='2026-01-15';return true;})()`);
  await click('[data-editor-save]');
  await sleep(280);
  const qev = await evaluate("(MC.store.data.events.filter(function(e){return e.title==='双季度复盘';})[0]||{})");
  check('保存每 2 季度事件', qev.repeat === 'quarterly' && qev.repeatEvery === 2, qev.repeat + '/' + qev.repeatEvery);
  check('卡片显示每 2 季度', (await evaluate(
    "MC.card.repeatName(MC.store.data.events.filter(function(e){return e.title==='双季度复盘';})[0])")) === '每 2 季度');

  await click('[data-action="new-event"]');
  await sleep(220);
  await evaluate(`(function(){var s=document.querySelector('.modal-backdrop [name="calendar"]');s.value='lunar';s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  await sleep(180);
  check('切农历后出现年月日输入', await exists('.lunar-block [name="lunarYear"]'));
  check('农历月份 12 项', (await count('.lunar-block [name="lunarMonth"] option')) === 12);
  check('农历日期 30 项', (await count('.lunar-block [name="lunarDay"] option')) === 30);
  check('农历默认走农历年周期', (await evaluate(
    '(document.querySelector(\'.modal-backdrop [name="repeat"]\')||{}).value')) === 'lunar-yearly');
  await evaluate(`(function(){var r=document.querySelector('.modal-backdrop');
    r.querySelector('[name="title"]').value='农历八月初一';
    r.querySelector('[name="lunarYear"]').value='2027';
    r.querySelector('[name="lunarMonth"]').value='8';
    r.querySelector('[name="lunarDay"]').value='1';
    r.querySelector('[name="lunarMonth"]').dispatchEvent(new Event('change',{bubbles:true}));
    return true;})()`);
  await sleep(180);
  await shot('10-lunar-editor');
  await click('[data-editor-save]');
  await sleep(280);
  check('农历输入保存成功', (await evaluate(
    "MC.store.data.events.filter(function(e){return e.title==='农历八月初一';}).length")) === 1);
  check('农历日期换算为公历', (await evaluate(
    "MC.store.data.events.filter(function(e){return e.title==='农历八月初一';})[0].date")) === await evaluate("MC.lunar.lunarToSolar(2027,8,1,false)"));
  check('农历事件保留历法标记', (await evaluate(
    "MC.store.data.events.filter(function(e){return e.title==='农历八月初一';})[0].calendar")) === 'lunar');

  // ── 悬浮窗：模拟宿主 IPC，验证官方命令与参数 ─────────
  await evaluate(`(function(){
    window.__INVOKES__ = [];
    window.__TAURI_INTERNALS__ = { invoke: function(cmd, args){
      window.__INVOKES__.push({ cmd: cmd, args: args });
      if (cmd === 'list_custom_plugin_windows') return Promise.resolve([]);
      return Promise.resolve({ label: 'tools-tab-custom-mock', windowId: 'daymark-float' });
    }};
    return true;
  })()`);
  await click('[data-action="toggle-float"]');
  await sleep(280);
  const openCall = await evaluate("(window.__INVOKES__.filter(function(x){return x.cmd==='open_custom_plugin_window';})[0]||{})");
  check('宿主通道调用 open_custom_plugin_window', openCall.cmd === 'open_custom_plugin_window', openCall.cmd);
  check('窗口 ID 正确', openCall.args && openCall.args.windowId === 'daymark-float');
  check('加载 ?float=1 入口', openCall.args && openCall.args.url === 'index.html?float=1');
  check('窗口置顶 / 无边框 / 跳过任务栏', openCall.args && openCall.args.options.alwaysOnTop === true &&
    openCall.args.options.decorations === false && openCall.args.options.skipTaskbar === true);
  check('按钮状态同步为已开启', (await evaluate('MC.float.state.open')) === true);
  await click('[data-action="toggle-float"]');
  await sleep(260);
  check('宿主通道调用 close_custom_plugin_windows', (await evaluate(
    "window.__INVOKES__.some(function(x){return x.cmd==='close_custom_plugin_windows';})")) === true);
  check('按钮状态恢复未开启', (await evaluate('MC.float.state.open')) === false);

  // ── 悬浮窗本体（320×440） ────────────────────────────
  await send('Emulation.setDeviceMetricsOverride', {
    width: 320, height: 440, deviceScaleFactor: 1, mobile: false,
  });
  await goto(BASE + '?float=1');
  await sleep(300);
  check('悬浮窗专用布局', await exists('.fwin'));
  check('悬浮窗隐藏侧栏与顶栏', await evaluate("getComputedStyle(document.querySelector('.sidebar')).display") === 'none');
  check('悬浮窗默认展示 3 个日子', (await count('.frow')) === 3, String(await count('.frow')));
  check('悬浮窗含快捷新增', await exists('.fquick'));
  check('悬浮窗含正数日里程碑', await exists('.fwin-mile'));
  check('里程碑文案完整', /距离第 \d+ 天还有 \d+ 天/.test(String(await text('.fwin-mile strong'))),
    await text('.fwin-mile strong'));
  check('浮窗天数单位可连读', (await evaluate(
    "(function(){var a=[].map.call(document.querySelectorAll('.frow-num small'),function(x){return x.textContent;});return a.length===3&&a.every(function(t){return /^(天后|天了|天前|今天)$/.test(t);});})()")) === true,
    await evaluate("[].map.call(document.querySelectorAll('.frow-num small'),function(x){return x.textContent;}).join('/')"));
  check('悬浮窗无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    await overflow());
  await shot('09-float');

  const floatBefore = await evaluate('MC.store.data.events.length');
  await evaluate(`(function(){document.querySelector('#fq-title').value='悬浮窗新增日';return true;})()`);
  await click('[data-action="float-quick-add"]');
  await sleep(260);
  check('悬浮窗可随手新增', (await evaluate('MC.store.data.events.length')) === floatBefore + 1);
  check('新增写入同源 localStorage', (await evaluate(
    "JSON.parse(localStorage.getItem(MC.store.STORAGE_KEY)).events.some(function(e){return e.title==='悬浮窗新增日';})")) === true);

  // storage 事件同步（模拟另一个窗口写入）
  check('storage 事件同步生效', (await evaluate(`(function(){
    var raw = JSON.parse(localStorage.getItem(MC.store.STORAGE_KEY));
    raw.events.push(Object.assign(MC.model.emptyEvent(), { title: '跨窗口同步日' }));
    localStorage.setItem(MC.store.STORAGE_KEY, JSON.stringify(raw));
    window.dispatchEvent(new StorageEvent('storage', { key: MC.store.STORAGE_KEY }));
    return MC.store.data.events.some(function(e){ return e.title === '跨窗口同步日'; });
  })()`)) === true);

  // ── 持久化 / 重载 ───────────────────────────────────
  await send('Emulation.setDeviceMetricsOverride', {
    width: 980, height: 700, deviceScaleFactor: 1, mobile: false,
  });
  const total = await evaluate('MC.store.data.events.length');
  await goto(BASE);
  await sleep(350);
  check('重载后数据仍在', (await evaluate('MC.store.data.events.length')) === total, String(total));
  check('重载后回到主面板布局', (await evaluate("getComputedStyle(document.querySelector('.sidebar')).display")) !== 'none');
  check('重载后不再显示引导', !(await exists('.onboard-card')));
  check('重载无横向溢出', (await evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    await overflow());

  check('无 JS 运行时异常', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 项通过；截图目录：${SHOTS}`);
  if (failed.length) process.exitCode = 1;
  try { await send('Browser.close'); } catch (e) { /* 端口由外部命令兜底清理 */ }
}

try {
  await main();
} catch (error) {
  console.error('冒烟失败：' + (error.stack || error.message));
  process.exitCode = 1;
}

# 朝夕 · Daymark（otools-daymark）

一个独立的 OTools 倒数日插件，用来记录**生日、纪念日、考试、项目截止、旅行、节日**等重大日子。
默认以 `panel` 面板打开（980 × 700），并可由用户**手动开启一个常驻桌面小悬浮窗**（320 × 440）。

纯前端、零依赖、完全离线：所有数据只写在本机 `localStorage`，运行时不发起任何网络请求。

**v1.1.0 新增**：阳历 / 农历双历法（农历可直接选年月日与闰月）、周期倒数按周 / 月 / **季度** / 年重复，并支持「每 N 个周期」。

---

## 功能

### 主面板

| 页面 | 内容 |
| --- | --- |
| 今日 | 最近一个日子的主视觉大数字（还有 / 已经 / 已过去多少天）、进度条、提前提醒条、三项概览、八个快捷模板、近期速览 |
| 全部日子 | 搜索、分类筛选（生日 / 纪念日 / 考试 / 工作 / 旅行 / 节日 / 其他）、按临近程度 / 创建时间 / 名称排序、网格或紧凑列表、置顶 / 编辑 / 复制 / 归档 / 删除、归档视图 |
| 时间轴 | 按月份分组展示未来与已过去的日子，点击直接编辑 |
| 洞察 | 类型构成环图、分类分布、距离今天分档、提醒清单 |
| 设置 | 主题（浅色 / 深色 / 跟随系统）、四套主色、称呼、默认提前提醒、默认排序 / 视图、显示农历、隐私模式、悬浮窗配置、JSON 导入导出 / 示例数据 / 清空 |

### 日子模型

- **倒数日 / 正数日**：正数日强制不重复，展示「已经第 N 天」与整百 / 整千天里程碑。
- **阳历 / 农历**：编辑器切换「农历」后可直接填**农历年、农历月、农历日、闰月**，保存时由
  `MC.lunar.lunarToSolar()` 换算成公历锚点；非法农历日期会拦截并提示。离线覆盖 1900–2100，
  卡片持续显示农历日期（农历事件即使关闭「显示农历」也保留）。节气与干支数据同样离线内置。
- **周期倒数**（统一用「第 k 次发生日」`occurrenceAt(ev, k)` 计算，再由 `findOccurrence(ev, from)` 找下一次）：

  | 周期 | 阳历 | 农历 |
  | --- | --- | --- |
  | 按周 | `weekly` | — |
  | 按月 | `monthly`（31 号自动收敛到月末） | `lunar-monthly`（三十在小月收敛到廿九） |
  | 按季度 | `quarterly`（每 3 个月） | — |
  | 按年 | `yearly` | `lunar-yearly`（农历生日不会错位） |
  | 仅一次 | `none` | — |

- **每 N 个周期**：`repeatEvery` 取 1–12，可组合出「每 2 周」「每 3 个月」「每 2 季度」「每 2 年」
  「每 2 个农历月」等；旧数据缺该字段时按 1 兼容。卡片上显示「每 2 周」「每 2 季度」等短标签。
- 切换历法时编辑器会自动把公历周期与农历周期互相转换（例如农历输入自动带出「按年（农历）」）。
- **分类、颜色、图标、备注、提前 N 天提醒、置顶、归档**。
- 八套快捷模板：生日、纪念日、考试、项目 / 截止日、**季度 / 周期**、旅行、节日、正数日。

### 桌面悬浮窗

- 顶栏「悬浮窗」按钮**手动开启 / 关闭**；再次点击会唤回已存在的窗口，不会重复创建。
- 无边框、透明、默认置顶、跳过任务栏；可拖动顶栏、可刷新、可关闭。
- 展示最近 3 个（可配置 1–6 个）日子 + 正数日里程碑，底部可随手记一个新日子。
- 与面板**同源共享 `localStorage`**，通过 `storage` 事件实时同步：任一边新增 / 编辑，另一边立刻刷新。
- 默认不自动开启；设置里可勾选「随主面板自动开启」。

---

## 运行前提：宿主需支持 panel 插件创建额外窗口

OTools 原本只允许 `openMode: "custom"` 的插件调用 `open_custom_plugin_window`，
而本插件按需求必须是 `openMode: "panel"`。因此**同时修改了宿主**，让 panel 插件能从自己的
webview 创建额外窗口，同时不改变「panel 插件默认嵌入面板启动」这一行为。

宿主仓库中本需求相关的改动（路径相对 `otools/` 主仓库）：

| 文件 | 改动 |
| --- | --- |
| `src-tauri/src/platform/webview/custom.rs` | 拆出 `lookup_plugin()`（只校验 enabled 与 uuid/source 唯一性）；保留 `find_plugin()` 供启动面板 / 快捷方式 / MCP 使用，**仍只认 `custom`**；新增 `find_extra_window_plugin()` 允许 `panel \| custom`；`caller_plugin()` 增加 `panel-plugin-*` 分支，从 `plugin_for_runtime_binding(label)` 读取身份；`open()` 放宽为 `panel \| custom`；host view 与 custom registry 分支也改用 `find_extra_window_plugin()`，使额外窗口内部能正常 ready / close / list |
| `src-tauri/src/platform/capture/permission_repair.rs` | 顺带修复 Windows 编译：macOS `tccutil` 用的 `std::os::unix::process::ExitStatusExt` 改为 `#[cfg(unix)]`，测试模块改为 `#[cfg(all(test, unix))]`（与本需求无关，但不修则 `cargo check` 报 E0433） |
| `docs/custom-plugin-windows.md` | 新增「Panel 插件开启额外窗口」章节：纯前端直接 `invoke` 的用法、身份安全说明、权限说明、SDK shim 现状 |

安全边界：panel 子 webview 的 label 是 `panel-plugin-<source>:<uuid>`，宿主**从自己的运行时绑定读取插件身份，不信任调用参数**；
显式传入的 `pluginUuid` / `pluginSource` 与绑定不一致会被拒绝，插件无法替别的插件开窗口。
`app_shell/core.rs`、`shortcuts/core.rs` 仍调用旧的 `find_plugin()`，所以启动入口行为不变。
ACL 已覆盖 `panel-plugin-*`（`capabilities/default.json`）与四个窗口命令（`permissions/app-all.json`）。

插件侧的降级路径（见 `web/js/float.js`）：

1. 有宿主 IPC → `open_custom_plugin_window` / `list_custom_plugin_windows` / `close_custom_plugin_windows` / `custom_plugin_window_ready`（官方托管窗口，推荐）。
2. 宿主 IPC 报错（旧版宿主 / ACL 未放行）→ 退回 `window.open` 同源小窗，仍加载 `index.html?float=1` 且仍可同步。
3. 普通浏览器预览 → 直接走 `window.open`。

> 若使用 `otools-plugin-sdk` 的 Vite 插件：SDK 的 `WebviewWindow` shim 在非 custom 上下文仍回退到
> `plugin:webview|create_webview_window`。本插件不依赖 SDK，直接调 Tauri IPC，因此不受影响。

---

## 数据与隐私

- 存储键：`otools-daymark.v1`，仅本机 `localStorage`。
- 离线历法数据 `web/js/calendar-data.js`：1900–2100 农历（源自 `lunardate` / `lunarInfo` 官方农历表）
  与二十四节气（Meeus 低精度太阳视黄经，取北京时间日期），由 `scripts/gen-calendar-data.mjs`
  紧凑编码生成，生成期自检失败 0 项。
- 不联网、不上传、无账号、无埋点；导出 / 导入走宿主文件对话框或浏览器 Blob。
- 农历与节气数据仅用于日期换算，不构成黄历宜忌或任何决策依据。

---

## 工程结构

```
otools-daymark/
├─ plugin.json            # openMode: panel / 980×700 / customWindow 320×440 默认配置
├─ logo.svg
├─ web/
│  ├─ index.html          # 单一入口，?float=1 渲染紧凑浮窗
│  ├─ css/app.css         # 深浅主题、四套主色、panel 与浮窗两套布局
│  └─ js/
│     ├─ util / icons / ui / bridge / lunar / calendar-data
│     ├─ model            # 第 k 次发生日、每 N 周期、季度、农历周期
│     ├─ store / demo / card / float
│     ├─ views/{onboarding,today,events,editor,timeline,insights,settings,float}.js
│     └─ app.js           # 路由、渲染分支、全局事件委托
├─ dist/                  # build-web.mjs 从 web/ 原样拷贝，发布入口
├─ scripts/
│  ├─ build-web.mjs  pack-plugin.mjs  verify-plugin.mjs
│  ├─ serve-dist.mjs  smoke.mjs  deploy-to-otools.ps1
│  └─ gen-calendar-data.mjs  gen-lunar-rows.py  lunar-rows.txt
└─ dist-pack/             # .oplg 发布包 + SHA256SUMS + meta.json
```

## 构建 / 打包 / 校验

```bash
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"
cd otools-daymark

"$NODE" scripts/build-web.mjs                              # web/ → dist/
"$NODE" scripts/pack-plugin.mjs --out dist-pack --version 1.1.0
"$NODE" scripts/verify-plugin.mjs dist-pack
```

产物：`dist-pack/otools-daymark-1.1.0.oplg`。纯前端插件没有 `.wasm`，校验器会给出一条可忽略的提示。

## 浏览器冒烟（可选）

服务、Chrome、冒烟脚本**必须在同一条 shell 命令里启动**（本机后台进程跨调用不存活），
且**每次换一对未占用的新端口**（旧服务残留会导致请求落到旧代码上，出现假故障）。
注意用 `;` 分隔，不要写成 `cd ... && ... &`——那会把整条 AND 链丢进后台子 shell。

```bash
cd otools-daymark
NODE="C:/Users/Admin/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
"$NODE" scripts/serve-dist.mjs 6508 > _shots/serve.log 2>&1 & SRV=$!
"$CHROME" --headless=new --disable-gpu --no-first-run --remote-allow-origins='*' \
  --remote-debugging-port=9248 --user-data-dir="<绝对路径>/_shots/smoke-profile" \
  --window-size=980,700 about:blank > _shots/chrome.log 2>&1 & CHR=$!
sleep 4
CDP_PORT=9248 BASE_URL=http://127.0.0.1:6508/ "$NODE" scripts/smoke.mjs
kill $SRV $CHR 2>/dev/null
```

`smoke.mjs` 用 CDP 做真实 DOM 点击回归，并输出 10 张截图到 `_shots/`：
引导、今日浅色 / 深色、全部日子、编辑器、时间轴、洞察、设置、悬浮窗、**农历编辑器**。
冒烟会 mock `window.__TAURI_INTERNALS__.invoke` 来验证宿主窗口命令与参数，不依赖真实 OTools 进程。
模型部分覆盖季度、每 2 周 / 每 3 个月 / 每 2 年、农历每月 / 每年、周期倍数归一化，
以及真实表单交互保存「每 2 季度」与「农历八月初一」。

## 本地部署（需确认）

`scripts/deploy-to-otools.ps1` 会把 `plugin.json` / `logo.svg` / `dist/` 拷进
**OTools 主仓库的 `plugins/<packid>`**，属于对另一个仓库的写入，本次未执行。
需要本地试跑时手动执行：

```powershell
pwsh -File scripts/deploy-to-otools.ps1 -OtoolsRoot D:/Repos/xyito/otools/otools
```

也可以直接安装 `dist-pack/otools-daymark-1.1.0.oplg`。

---

## 验证记录（v1.1.0）

- 宿主 `cargo check --message-format short`：`Finished dev profile ... in 2m 32s`，**无 error**，46 条既有 warning。
- 全量 JS 语法检查：26 个 `.js` / `.mjs` 文件，`syntax_fail=0`。
- 离线历法数据自检：失败 0 项；`calendar-data.js` 约 20.3 KB。
- 无浏览器模型预检：13 条周期断言全部符合预期（含发现并修正一条「农历每月」断言期望值）。
- CDP 冒烟（最终端口 6508 / 9248）：**96/96 通过**，无 JS 运行时异常；
  主面板 `scrollWidth/clientWidth = 980/980`、悬浮窗 `320/320`，均无横向溢出。
  覆盖：模型自检、引导、示例（10 个日子，含 1 归档）、今日深浅色、搜索筛选排序、归档视图找回、
  编辑器模板与保存、置顶 / 复制 / 归档 / 取消归档 / 删除确认、时间轴、洞察、设置、隐私、导入导出、
  季度模板 + `repeatEvery=2` 真实保存、农历年月日真实输入与换算、宿主 IPC mock、
  浮窗布局 / 里程碑 / 快捷新增 / `storage` 跨窗口同步、重载持久化。
- `pack-plugin.mjs`：24 个条目、`totalBytes: 205648`、`.oplg` 66380 字节。
- `verify-plugin.mjs`：plugin.json、SHA256SUMS、devUrl/quickDev 清理、ZIP CRC、入口与 logo、宿主桥标记全部通过。

## 已知限制

- 离线历法范围 1900–2100，超出范围的日子不显示农历，公历倒数仍可用。
- `repeatEvery` 范围 1–12；周期计算以公历 `date` 为锚点向前推进，因此「每 N 个月」在大小月上按月末收敛。
- 农历「按月」重复按农历年月序号推进，**不追踪闰月**；三十日在无三十的月份自动按廿九处理。
  农历「按年」重复保留闰月标记，若目标年没有对应闰月则该次换算会跳过。
- 悬浮窗是「手动开启的额外窗口」，不是系统级桌面小组件 / 锁屏组件；关闭 OTools 后不会常驻。
- 提醒是插件内提示，不接系统通知中心。
- 正数日不重复；农历重复依赖离线农历表。

---

## 独立仓库与发版

本插件是 `ootools` 组织下的独立 public 仓库：`git@github.com:ootools/otools-daymark.git`（默认分支 `main`），
并在 xyito 主仓库中以子模块 `otools/otools-daymark` 挂载。

- `.github/workflows/build-plugin.yml`：push / PR / 手动触发，构建 `web/ → dist/`、打包并校验 `.oplg`。
- `.github/workflows/release-plugin.yml`：手动触发或推送 `v*` 标签。默认 `dry_run=true` 只构建校验；
  关掉 dry-run 才创建 GitHub Release。上架 OTools 插件市场需先配置 secret `XYCLOUD_PAT`，
  并显式传 `publish_market=true`。

```bash
gh workflow run release-plugin.yml --repo ootools/otools-daymark --ref main \
  -f display_version=<版本号> -F publish_market=true -F dry_run=false
```

> `plugin.json` 的版本号是唯一事实来源：发版前先 +1 并推送 main，
> xyito 里的子模块指针也要同步提交推送。

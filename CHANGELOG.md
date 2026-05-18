# 更新日志

## [1.3.5] — 2026-05-18

### Bug 修复

- **目录导航竞态条件修复** — 先执行 `goToHref(href)` 再关闭侧栏（`setSidebarOpen(false)`），防止 `ResizeObserver` → `rendition.resize()` → `onResized()` 在导航完成后使用旧的 CFI 重新显示旧章节
- **`Blocked script execution` 沙箱错误** — `renderTo()` 选项添加 `allowScriptedContent: true`，允许注入的文本选择脚本在 sandbox iframe 中执行
- **`doc.getElementById is not a function`** — hook `hook manoeuvre` 中增加 `view.document` 守卫，避免 epub.js 未就绪时报错
- **`goToHref` 超时挂起** — `Promise.race` 超时包装（10s），超时后回退到 `book.spine.get(href).index`（数字索引），最后兜底 `manager.display(section, href)`

### 优化

- **诊断日志整理** — 移除 `goToHref` 中的冗长 DOM 诊断日志，仅保留关键导航状态输出
- **内容脚本稳定性** — 注入脚本增加空值守卫，防止在 iframe 文档未完全加载时操作 DOM

## [1.3.0] — 2026-05-18

### 新特性

- **全文搜索** — 阅读页顶部 🔍 按钮唤起搜索面板，懒构建搜索索引（首次搜索时遍历全部 spine 章节），大小写不敏感匹配，结果列表显示行上下文（±40 字符，匹配词黄色高亮）；点击结果跳转至对应位置并使用 `window.find()` 高亮匹配词
- **书签系统** — 阅读页顶部 📑 按钮打开标记面板（「书签」/「标注」双标签）；点击右上方书签图标（`bookmarkIcon` 状态）在当前位置插入或移除书签；面板内书签可点击跳转/可见删除按钮
- **文本标注** — 选中正文文字后弹出悬浮标注工具栏（毛玻璃设计），包含黄色/绿色/蓝色/粉色四色标记按钮；点击颜色后在选中文本前后包裹 `<mark>` 标签并持久化到 IndexedDB；标注面板内显示标注文本片段和色点
- **标注上下文菜单** — 标注面板内右键标注项弹出删除菜单（使用 `position: fixed` 定位防止滚动容器裁剪）
- **内容脚本与通信桥** — 渲染进程注入 `content.ts` 脚本，监听鼠标弹起事件检测文本选中状态，通过 `postMessage` → IPC 桥将选区信息传给 React 层；支持 `getCfiFromRange()` 获取精确 CFI 位置
- **IndexedDB 数据模型升级** — 数据库版本 v5，新增 `bookmarks` 和 `highlights` 对象存储，支持书签/标注的 CRUD

### Bug 修复

- **ctxBmId ReferenceError** — `Reader.tsx:112` 右键菜单上下文引用未声明的 `ctxBmId` 变量；补齐 `const [ctxBmId, setCtxBmId] = useState<string | null>(null)` 声明
- **面板滚动事件穿透** — 书签/标注/搜索结果面板的滚动容器缺 `data-scroll` 属性，鼠标滚轮在面板内操作时事件穿透到阅读页触发翻页；给三个面板容器加上 `data-scroll="true"`

## [1.2.0] — 2026-05-15

### 新特性

- **WebDAV 双向同步** — 书架 + 阅读进度 + 阅读时间全量同步，支持自建 WebDAV 服务器（NextCloud、群晖等）；设置页内嵌配置表单（地址/用户/密码/目录），测试连接按钮，全量同步进度条反馈
- **AI 阅读助手** — OpenAI 兼容 API 接入，阅读页底部浮层面板（毛玻璃设计，跟随主题色）；「总结本章」一键提取当前章节要点，自由问答发送章节上下文；流式输出实时显示（逐 token 渲染）；自定义 API 地址/Key/模型
- **AI 配置页** — 设置页新增「AI 助手」配置项，API 地址/Key/模型 表单，连接测试按钮

### Bug 修复

- **设置页二级页直接导航致书架不可点击** — 在 AI 助手二级页点击侧栏「书架」时 SettingsPage 内部状态未重置，pointer-events 持续拦截；切换离开设置页时强制重置 settingView/subPhase 状态机
- **AI 总结返回页面源码** — `fetch(item.url)` 解析到渲染器 HTML（epub.js 0.3 spine 项的 url 为虚拟路径，非真实 blob URL）；改用 `book.archive.getText()` 从 ZIP 直接提取章节文本
- **AI 流式光标动画失效** — `@keyframes pulse` 未定义；注入 `<style>` 使光标正常闪烁

### 优化

- **剔除无用文件** — 删除未引用的图标（16/32/64 PNG），清理 `dist/` 构建产物
- **构建产物取消 Git 追踪** — `out/main/index.js`、`out/preload/index.js` 执行 `git rm --cached`（已在 .gitignore 中）
- **移除死代码** — 无用的 `linkClicked` 事件处理器、未使用的 CSSProperties/btnGlass 导入
- **空 catch 加日志** — 全书架/配置加载失败的 4 处 `.catch(() => {})`、封面图片获取异常、章节文本加载异常、SSE 解析异常，统一加 `console.warn`
- **类型收敛** — 重复声明的 `ProgressRecord` 接口合并为单一定义，`loadAllProgress()` 返回值复用命名类型

## [1.1.0] — 2026-05-10

### 重构

- **Library.tsx 组件拆分** — 455 行单文件拆为 4 独立组件 + 1 工具模块（SidebarNav/BookShelf/SettingsPage/styles.ts），Library 降为 108 行布局协调层
- **SettingsPage 状态内聚** — 设置页二级滑动动画（settingView + subPhase 状态机）完全内聚，通过 visible/resetKey props 与外部通信

### 新特性

- **阅读主题持久化** — reader theme（light/sepia/dark）通过 IndexedDB 持久化，打开书时自动恢复
- **目录栏适配阅读主题** — Sidebar 接收 theme prop，深色/亮色/暖黄三套配色跟随阅读主题切换
- **TitleBar 一体化** — 边框和背景移除，透出外层渐变/阅读背景色，视觉无分隔
- **阅读页背景色跟随主题** — 外容器使用 {light, sepia, dark} 对应色值，消除阅读时 TitleBar 区域色差
- **应用图标** — 窗口图标 + electron-builder 各平台打包图标（coolreader_icon.ico/.png）

### Bug 修复

- **阅读进度记忆失效** — 章节 0 进度因 progressRef > 0 守卫永不保存，重启后无数据；移除保存/恢复两侧 idx > 0 条件；重写 openBook 为"先加载进度→直接跳转"避免 section 0 闪白
- **DB 版本升级数据丢失** — settings store 在 DB 达到 v3 后添加时 onupgradeneeded 不重跑，DB_VERSION 3→4 触发升级；loadSetting 加 try/catch 防止阻塞渲染
- **阅读时间被 0 覆盖** — 无书打开时 saveReadingTime() 用 0 覆盖 DB；增加 initReadingTime 同步 ref + currentBook 守卫 + beforeunload 兜底
- **主题切换不生效** — rendition.themes.register(name, css) 将 CSS 视为 URL 调用 registerUrl；改用 registerCss(name, serialized)，select 同时处理 CSS 注入 + body class 切换
- **主题切换后无法切回** — 选择器从 body{} 改为 body.light/dark/sepia{}，注入后仅匹配当前主题
- **Sidebar 与阅读器主题不同步** — 硬编码深色配色改为三色方案 sbTheme[theme]
- **Sidebar 切换致阅读器变形** — 添加 ResizeObserver + resizeViewer，flex 布局变化后重排内容
- **书架图书点击无响应** — 不可见设置页子视图自设 pointer-events:auto 拦截事件；增加 visible prop 条件控制
- **设置页二级页动画回弹** — pop-in 阶段 detail 从 translateX(100%) 变回 0，增加 subPhase 判断保持退出位置

## [1.0.3] — 2026-05-09

### 新特性

- **注释/引用链接导航** — 点击正文注释序号跳转到注释内容，点击注释处返回原文位置（epub.js 原生 `#note` / `#noteref` 双向处理）
- **设置功能** — 侧栏 ⚙ 入口，设置页内嵌至主窗体（非弹窗），首个设置项：6 种首页渐变背景预设（深紫/午夜蓝/翡翠/琥珀/石板/绯红），切换即时生效并持久化
- **阅读时间追踪** — 打开书记录会话起始时间，每 2s 累加，退出时持久化到 IndexedDB；书架页顶部显示「今日阅读 Xh Ym」卡片
- **鼠标滚轮翻页** — 向下滚 → 下一页，向上滚 → 上一页，200ms 防抖
- **页面滑动过渡动画** — 书架↔设置页方向性滑动（按按钮在侧栏的上下位置决定），三段式状态机（out→in→idle），0.4s ease 过渡
- **书架页 UI 重构**：
  - 全部卡片式设计：侧栏、阅读时间卡、图书卡统一紫色渐变 + 圆角边框
  - 侧栏品牌名改为 CoolReader，按钮改为 📚 书架 / ⚙ 设置 / 📥 导入（图标+文字）
  - 书架/设置按钮上移至标题下方，导入按钮保持在底部
- **阅读进度优化** — CFI 优先恢复（精确到字符位置），失败时回退章节索引

### Bug 修复

- **导入按钮点击区域不全** — `backdrop-filter` 合成层 hit-testing 问题，给按钮加 `position: relative; z-index: 2`
- **页面交互穿透** — 绝对定位叠加页无 `pointer-events` 控制，非当前页和过渡期间设为 `none`
- **动画状态机时序** — rAF 链只有 ~32ms 导致动画不可见，改用 400ms `setTimeout` 匹配 CSS 时长

## [1.0.1] — 2026-05-08

### 新特性

- **毛玻璃 UI 全面重构** — 深色渐变背景 + backdrop-filter 玻璃质感，统一所有组件
- **自定义标题栏** — frameless 窗口，毛玻璃标题栏 + 最小化/最大化/关闭按钮
- **沉浸阅读模式** — 全屏阅读，UI 3s 自动淡出，鼠标移动唤起，点击中央切换显隐
- **点击翻页** — 左 25% 上一页，右 25% 下一页，中心区域切换控制栏
- **阅读进度条** — 底部毛玻璃进度条 + 百分比显示，支持点击跳转
- **目录栏高亮跟随** — 当前章节紫色高亮 + 左侧紫边 + 自动滚动居中
- **删除图书** — hover 显示删除按钮，弹窗确认「删除源文件」或「仅移出书架」
- **页面过渡动画** — 书架↔阅读页 fade + scale 切换
- **IndexedDB 持久化** — 书架列表、阅读进度（章节索引 + CFI）自动存储
- **CI/CD 自动流** — GitHub Actions 三平台编译打包，tag 触发 Release

### Bug 修复

- **应用启动空白** — 缺少 `main.tsx` 入口（组件 export 未 render），新增 `main.tsx` + `createRoot`
- **EPUB 导入失败** — `contextIsolation` 下 renderer 无法 `fetch()` 本地路径，改为 IPC 读文件 + ArrayBuffer 传输
- **"Too many properties" 错误** — Buffer 经 IPC 序列化属性枚举溢出，改为返回 `ArrayBuffer`
- **阅读内容闪现后消失** — `renderTo('viewer')` 时 `#viewer` div 尚未挂载，Reader mount 后再加载
- **二次进入内容不加载** — `loadedRef` 未随 `filePath` 变化重置，改为 filePath 变化时重新加载
- **目录栏无法滚动** — flex 子项缺 `minHeight: 0`，溢出被裁剪
- **点击/键盘被 iframe 劫持** — epub.js iframe 不冒泡事件，增加透明覆盖层捕获
- **进度保存错页** — `relocated` 事件 CFI 可能滞后，改用 `currentLocation()` + rAF
- **键盘翻页弹出 UI** — 箭头键误触 `showControls()`
- **退出进度未保存** — `handleBack` 闭包读取 stale progress，改用 `progressRef` 同步 ref
- **目录栏索引混乱** — flatId 与 top-level 索引不匹配，改为 href 字符串匹配

## [1.0.0] — 2026-05-08

### 初始功能

- EPUB 文件导入与解析（epub.js）
- 书架视图 — 封面/书名/作者展示
- 阅读器 — 上一页/下一页，键盘 ← → 翻页
- 三种阅读主题（亮色/暖黄/暗色）
- 目录侧栏导航
- 中文菜单栏
- 标准 Electron 窗口

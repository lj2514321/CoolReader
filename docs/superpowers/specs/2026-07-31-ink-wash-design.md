# 水墨风 UI 增强设计（Ink-Wash UI Enhancement）

日期：2026-07-31
状态：已获用户逐节确认，待写实施计划

## 1. 背景与目标

当前 UI 是"线条 + 毛玻璃"双主题体系（暗夜书房 / 日间图书馆，见 `src/styles/tokens.css`），纸墨色语义（`--ink-*`）、宋体系衬线、暖纸 halo 都已就位。用户对线条风格满意，但觉得**单调**，希望在保持线条骨架的前提下融入**抽象水墨质感**，让界面有东方气质与层次感。

## 2. 需求画像（与用户确认的决策）

| 维度 | 决策 |
|---|---|
| 范围 | 整体都要：背景氛围层 + 控件元素层 + 阅读正文层 |
| 视觉语言 | 抽象墨韵：淡墨渐变、晕染边缘、纸张肌理、留白、印章红点；**不出现**具象山水/松竹等物象 |
| 浓度 | 中等：线条骨架不变，整体气质明显东方化 |
| 动效 | 交互处轻动效：hover 墨色晕开、主题切换墨色流动过渡；无持续动画 |
| 强调色 | 双主色并行：墨青（信息层）不变 + 朱砂（情感层）新增 |
| 纸纹强度 | A 档细颗粒噪点（用户从三档中选定） |
| 卡片处理 | C 档晕染边缘（用户从三档中选定） |

## 3. 方案：水墨 Token 化（用户选定）

在现有 token 体系内新增"墨韵"token 族，所有表面从 token 继承，双主题各自定义墨色深浅。**现有 token 一律不改名、不改值，全部新增**，保证可整体撤销。纸纹用内联 SVG data-URI（feTurbulence 噪点），不引入图片资产、不依赖外部资源。

## 4. Token 体系（src/styles/tokens.css）

四个新 token 族，暗夜书房（`:root, [data-ui-theme="glass"]`）与日间图书馆（`[data-ui-theme="flat"]`）两个块各定义一份：

### 4.1 墨晕三档 `--wash-1/2/3`（淡墨/中墨/浓墨）

只用于背景与蒙层，**不做文字颜色**。

- dark：`--wash-1: #2b2b33; --wash-2: #36363f; --wash-3: #41414b`（暖墨灰，比基底亮，呈"发光墨"）
- light：`--wash-1: #e9e5db; --wash-2: #ddd7c9; --wash-3: #d0c9b9`（比纸色略深）

### 4.2 朱砂 `--seal` / `--seal-soft`（情感层强调色）

- dark：`--seal: #c95a45; --seal-soft: rgba(201, 90, 69, 0.16)`
- light：`--seal: #b0402e; --seal-soft: rgba(176, 64, 46, 0.12)`

### 4.3 纸纹 `--paper-texture`

内联 SVG data-URI，feTurbulence `type=fractalNoise, baseFrequency=0.9, numOctaves=2, stitchTiles=stitch`，200×200 平铺：

- dark：噪点 `opacity=0.10`
- light：噪点 `opacity=0.07`

### 4.4 页面晕染背景 `--wash-bg-page`（暗夜版，日间版同构减半）

多层 radial-gradient 叠加在 `--bg-base` 上（经第四屏目测验证）：

```
dark: radial-gradient(1000px 520px at 12% -8%,  rgba(212,165,116,0.13), transparent 55%),
      radial-gradient(760px 460px at 108% 18%, rgba(65,65,75,0.50), transparent 65%),
      radial-gradient(640px 420px at 75% 112%, rgba(43,43,51,0.85), transparent 70%),
      radial-gradient(900px 480px at -10% 85%, rgba(54,54,63,0.55), transparent 60%)
light: radial-gradient(1000px 520px at 12% -8%,  rgba(240,228,204,0.75), transparent 55%),
      radial-gradient(760px 460px at 108% 18%, rgba(208,201,185,0.50), transparent 65%),
      radial-gradient(640px 420px at 75% 112%, rgba(233,229,219,0.95), transparent 70%)
```

### 4.5 晕染边缘投影 `--shadow-bleed`（卡片 C 档）

- dark：`0 0 0 1px rgba(65,65,75,0.25), 0 0 14px rgba(65,65,75,0.30), 0 0 26px rgba(54,54,63,0.22), 0 6px 18px rgba(0,0,0,0.35)`，配合 1px 细边框 `rgba(244,237,224,0.10)`
- light：同构低浓度版本（实施时按日间 shadow 浓度惯例取值）

### 4.6 双主色语义规则（写入 tokens.css 注释）

```
信息层 → 墨青 --accent（现状不变：进度、链接、焦点）
情感层 → 朱砂 --seal（新增：在读角标、书签、当前章节标、统计高亮、空态印章）
警示层 → --warn 橙（不变）    破坏层 → --danger 红（不变）
```

## 5. 背景氛围层

- 书架/设置/阅读页的应用级背景从纯色改为 `background: var(--paper-texture), var(--wash-bg-page)`（background-color 仍是 `--bg-base`）
- 纸纹为 A 档细颗粒（用户选定）：双主题 0.10 / 0.07 不透明度
- 卡片、面板等控件自身背景不变（它们叠加在页面背景之上）

## 6. 控件层

- **卡片**（书卡/统计卡/面板）：采用 C 档晕染边缘——1px 细线 + `--shadow-bleed` 墨色扩散光晕，模拟水墨从边缘洇开
- **按钮 hover 墨晕**：hover 时 `radial-gradient` 墨色从中心晕开 + 微弱泛光，过渡走现有 `--transition-quick`（0.15s）；token 化为 `--bloom`（实施时定义）
- **朱砂应用点**（情感层，仅以下位置）：
  - 书卡右下角"在读"角标（小方印，白字）
  - 书签（阅读页）
  - 侧栏当前章节标
  - 阅读统计高亮
  - 空态印章（书架空态等；样式与"在读"角标一致：朱砂方印 + 白字，文案实施时定）

## 7. 阅读正文层

- **内建阅读主题**（light/sepia/dark 三套，定义在 `src/types/index.ts` 的 `themeStyles`，三适配器共用：EPUB 经 `rendition.themes.registerCss`，TXT/Mobi 直接注入）：
  - 背景叠加纸纹 + 微弱纸暖晕染（细纸纹同 A 档，透明度按明暗微调）
  - 章节标题朱砂小印：`h1::before` 注入一枚 15px 朱砂小方印（白字"记"），`pointer-events: none`，不挡交互
- **高亮四色**：`src/types/index.ts` 的 `highlightColors` 从 Material 四色（`#ffeb3b/#4caf50/#2196f3/#e91e63`）换成水墨四色：
  - 淡墨 `#7d7d88` / 赭石 `#a3764a` / 花青 `#4e7d9e` / 胭脂 `#b04f43`（中间亮度，0.3 透明度下明暗纸面都可读，经第四屏目测验证）
  - **旧高亮向后兼容**：已存库的高亮颜色值不动，仅新建高亮使用新色板
- **用户自定义主题不动**：`customTheme.ts` 生成的纯色/渐变主题保持原样（YAGNI）

## 8. 动效与性能

- hover 墨晕、面板淡入等全部走现有 transition 体系（`--transition-quick` / `--transition-theme`），不引入动画库
- **主题切换渐变瞬切问题**：CSS transition 对渐变不插值。方案：墨晕渐变层放 `::before` 伪元素，主题切换时以 opacity 交叉淡入淡出（0.3s，复用 `--transition-theme`），形成"墨色在纸上晕开换场"的效果
- 纸纹与渐变均为静态合成层，无逐帧开销；不新增 backdrop-filter 元素（现有毛玻璃数量不变）
- `prefers-reduced-motion` 全局规则已覆盖新动效，无需追加代码

## 9. 实施范围

| 文件 | 内容 |
|---|---|
| `src/styles/tokens.css` | 新增 4.1–4.5 全部 token + 4.6 语义注释 |
| `src/utils/styles.ts` | `defGrad`/`flatDefGrad` 及"墨夜/暖纸"首项预设改为墨晕+纸纹（页面背景的实际载体，经 App.tsx 内联应用） |
| `src/App.tsx` + `src/styles/theme.css` | 主题切换背景交叉淡入（`.app-bg-wash` 层，0.3s） |
| `src/styles/components/bookshelf.css` | 书卡 C 档晕染边缘、朱砂"在读"角标、空态印章 |
| `src/styles/components/sidebar.css` | 当前章节标改朱砂 |
| `src/styles/components/reading-stats.css` | 统计高亮改朱砂 |
| `src/styles/components/reader.css` | 按钮墨晕 bloom、书签 tab 激活态朱砂 |
| `src/types/index.ts` | `highlightColors` 换水墨四色；`themeStyles` 三套加纸纹 + `h1::before` 朱砂小印 |
| `src/utils/customTheme.ts` | 只读确认不冲突（用户自定义主题不受影响） |

不动：业务逻辑、存储结构、IPC、适配器接口。

## 10. 验证

1. `npm run build` — 构建通过
2. `npx vitest run` — 现有测试全绿（customTheme.test.ts 若断言了 themeStyles 输出则同步更新）
3. `npm run dev` 手测矩阵：
   - 双 UI 主题（暗夜/日间）× 双阅读主题（亮/暗）× EPUB/TXT/MOBI 三格式的高亮、纸纹背景、章节小印
   - 主题切换动画（opacity 交叉淡入）、按钮 hover 墨晕
   - 旧高亮（库中已存 Material 色）仍正常显示

## 11. 风险与决策记录

| 风险 | 处理 |
|---|---|
| 书内 HTML 的 `h1` 可能出现在页眉页脚 | 小印仅作用于 `h1`、尺寸 15px、`pointer-events:none`，影响可忽略；若实际遇到异常页面再收窄选择器 |
| 渐变主题切换瞬切 | 已定 opacity 交叉淡入方案（第 8 节） |
| 高亮四色对比度 | 中间亮度色值 + 0.3 透明度，第四屏目测明暗两版均通过 |
| 旧高亮颜色兼容 | 只改新高亮，存量数据不动 |
| 撤销成本 | 全部新增 token，无现有值被修改；删除 token 引用即可整体回退 |

# CoolReader

基于 Electron + React + TypeScript + epub.js 的桌面 EPUB 阅读器，全窗毛玻璃风格。

## 功能

- **书架管理** — 导入 EPUB 文件，封面/标题/作者展示，删除确认（仅移出书架或同时删除源文件）
- **沉浸阅读** — 全屏阅读，UI 点击切换显隐，点击/滚轮/键盘翻页；四种翻页动画（淡入淡出/左右滑动/3D翻书/滑动+淡出）；阅读进度追踪（秒级持久化）
- **主题切换** — 亮色/暖黄/暗色 三种阅读主题，持久化记忆
- **自定义阅读主题** — Aa 面板支持纯色（颜色选择器 + 透明度）和渐变（线性/径向 + 色标编辑器）自定义背景，内置碧海/极光/日出/极光紫四套预设
- **全文搜索** — 阅读页 🔍 按钮唤起搜索面板，懒构建索引，大小写不敏感匹配，结果自动跳转高亮
- **书签系统** — 阅读页 📑 按钮管理书签/标注，书签快速跳转，删除可见按钮
- **文本标注** — 选中文字后悬浮工具栏，四色高亮标记，持久化到 IndexedDB
- **注释导航** — 点击正文注释序号跳转注释内容，自动返回原文
- **目录导航** — 侧栏目录树，当前章节高亮跟随，自动滚动居中，导航竞态修复
- **首页背景设置** — 6 种渐变背景预设，滑入/滑出二级页动画，即时生效并持久化
- **阅读时间追踪** — 今日阅读时长统计，书架页顶部展示
- **毛玻璃 UI** — 自定义 frameless 窗口，全局毛玻璃风格，一体化 TitleBar
- **WebDAV 同步** — 书架/进度/阅读时间双向同步，自建 WebDAV 服务器，全量同步进度反馈
- **AI 助手** — 章节一键总结，自由问答，流式输出实时显示；支持 OpenAI 兼容 API
- **IPC 安全** — contextIsolation 隔离，文件操作走主进程

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 28, React 18 |
| 构建 | electron-vite, electron-builder |
| 语言 | TypeScript |
| 解析 | epub.js |
| 存储 | IndexedDB (书架/进度/设置/阅读时间) |
| UI | 纯内联样式，毛玻璃 (backdrop-filter) |
| CI | GitHub Actions (三平台) |

## 开始

```bash
npm install
npm run dev        # 开发模式 (热更新)
npm run build      # 生产构建
```

## 构建分发包

```bash
npm run dist
```

输出在 `release/` 目录。

## 项目结构

```
coolreader/
├── electron/
│   ├── main/
│   │   ├── index.ts         # 主进程 (frameless, IPC handlers)
│   │   ├── webdav.ts        # WebDAV 客户端
│   │   └── ai.ts            # AI API 客户端 (流式 SSE)
│   └── preload/index.ts     # 预加载 (contextBridge)
├── src/
│   ├── components/          # React 组件
│   │   ├── Library.tsx      # 书架/设置页布局协调
│   │   ├── SidebarNav.tsx   # 左侧导航栏
│   │   ├── BookShelf.tsx    # 书架网格 + 阅读时间卡片
│   │   ├── SettingsPage.tsx # 设置页 (背景预设 + 二级滑入动画)
│   │   ├── Reader.tsx       # 阅读视图 (沉浸模式)
│   │   ├── Sidebar.tsx      # 阅读目录侧栏
│   │   ├── TitleBar.tsx     # 自定义标题栏
│   │   ├── SyncSettings.tsx # WebDAV 同步配置与进度
│   │   ├── AIPanel.tsx      # AI 助手浮层面板
│   │   └── AISettings.tsx   # AI 配置表单
│   ├── hooks/useEpub.ts     # epub.js 封装
│   ├── types/index.ts       # 类型定义
│   ├── utils/
│   │   ├── db.ts            # IndexedDB 操作
│   │   └── styles.ts        # 共享样式常量
│   ├── App.tsx              # 根组件 (书架↔阅读路由)
│   └── main.tsx             # React 入口
├── index.html
├── electron.vite.config.ts
├── tsconfig.json
├── package.json
├── CHANGELOG.md
└── coolreader_icon.*        # 应用图标
```

## 许可

MIT

---

# Auto Node Script

自动化代理节点订阅抓取、连通性测试、速度测速、筛选排名、结果保存及邮件报告发送工具。通过 GitHub Actions 每日自动运行两次，无需手动干预。

## 项目简介

本工具从多个订阅链接中获取代理节点信息，解析 Clash YAML 或 Base64 格式的订阅内容，执行连通性测试和速度测试，根据延迟和速度阈值筛选有效节点，生成 JSON 结果文件，并通过 QQ 邮箱 SMTP 发送 HTML 格式的速度排名报告。

**核心流程**: 抓取 -> 解析 -> 去重/过滤 -> 连通性测试 -> 速度测试 -> 二次过滤 -> 保存结果 -> 邮件通知

## 前置条件

- **Python 3.11+** — 运行环境
- **GitHub 仓库** — 用于托管代码和触发定时任务
- **QQ 邮箱** — 用于 SMTP 发送报告邮件（需要开启 SMTP 服务并获取授权码）
- **订阅链接** — 代理节点订阅 URL（支持 Clash YAML 和 Base64 格式）

## 项目结构

```
scripts/
├── main.py         # 主入口，编排完整流程
├── fetcher.py      # 并发抓取订阅内容（支持重试）
├── parser.py       # 解析 Clash YAML 和 Base64 格式
├── filter.py       # 去重/无效节点过滤/延迟和速度筛选
├── tester.py       # 连通性测试 + 5MB 文件速度测试
├── outputter.py    # 结构化 JSON 输出 + 统计摘要
├── mailer.py       # QQ SMTP HTML 邮件发送
├── utils.py        # 配置/日志/计时器等工具
└── __init__.py
config.py           # 环境变量映射与类型默认值
requirements.txt    # Python 依赖
output/             # 结果输出目录
```

## GitHub Secrets 配置

在 GitHub 仓库 `Settings > Secrets and variables > Actions` 中添加以下密钥：

| Secret Name | 说明 | 是否必填 |
|---|---|---|
| `SUBSCRIPTION_URLS` | 订阅链接列表（多个 URL 用逗号分隔） | 是 |
| `SMTP_USER` | QQ 邮箱地址 (example@qq.com) | 是 |
| `SMTP_PASS` | QQ 邮箱 SMTP 授权码（非登录密码） | 是 |
| `SMTP_FROM` | 发件人邮箱地址 | 是 |
| `SMTP_TO` | 收件人邮箱地址 | 是 |

除上述必填项外，你还可以通过环境变量自定义以下参数（均有默认值）：

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `SPEED_TEST_URL` | `https://proof.ovh.net/files/5Mb.dat` | 速度测试下载地址 |
| `SPEED_TEST_TIMEOUT` | `30` | 速度测试超时时间（秒） |
| `SPEED_THRESHOLD_MIN` | `0.5` | 最低速度阈值（Mbps） |
| `MAX_LATENCY_MS` | `500` | 最大延迟阈值（毫秒） |
| `CONNECTIVITY_TEST_HOST` | `google.com` | 连通性测试目标主机 |
| `CONNECTIVITY_TEST_TIMEOUT` | `5` | 连通性测试超时（秒） |
| `OUTPUT_DIR` | `output` | 输出目录路径 |
| `SMTP_SERVER` | `smtp.qq.com` | SMTP 服务器地址 |
| `SMTP_PORT` | `465` | SMTP 端口（SSL） |

## 本地运行步骤

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 设置环境变量（Windows PowerShell）
$env:SUBSCRIPTION_URLS="https://your-subscription-link-1,https://your-subscription-link-2"
$env:SMTP_USER="yourname@qq.com"
$env:SMTP_PASS="your-smtp-authorization-code"
$env:SMTP_FROM="yourname@qq.com"
$env:SMTP_TO="receiver@example.com"

# 3. 试运行（跳过实际测速和邮件发送）
python scripts/main.py --dry-run

# 4. 完整运行（含测速和邮件）
python scripts/main.py

# 5. 查看详细日志（debug 级别）
python scripts/main.py --verbose
```

在 Linux/macOS 下使用 `export` 代替 `$env:`：

```bash
export SUBSCRIPTION_URLS="https://your-subscription-link-1,https://your-subscription-link-2"
export SMTP_USER="yourname@qq.com"
export SMTP_PASS="your-smtp-authorization-code"
export SMTP_FROM="yourname@qq.com"
export SMTP_TO="receiver@example.com"
python scripts/main.py
```

## 支持的协议类型

解析器支持以下代理协议节点：

| 协议 | 说明 |
|---|---|
| `ss` | Shadowsocks |
| `vmess` | V2Ray VMess |
| `trojan` | Trojan |
| `vless` | V2Ray VLESS |
| `socks5` | SOCKS5 |
| `http` | HTTP 代理 |

## 脚本输出说明

运行结束后会在 `output/` 目录生成两个 JSON 文件：

- **`output/results.json`** — 最新运行结果（每次运行覆盖）
- **`output/results_YYYYMMDD_HHMMSS.json`** — 带时间戳的历史结果（累加不删除）

### JSON 字段含义

```json
{
  "generated_at": "2026-05-22T20:00:00+08:00",   // 生成时间（北京时间，ISO 8601）
  "total_nodes": 50,                                // 总解析节点数
  "valid_nodes": 18,                                // 通过连通性+速度测试的有效节点数
  "top_nodes": [                                    // 速度排名前 10 的节点详情
    {
      "name": "Node-01",
      "type": "vmess",
      "server": "192.168.1.1",
      "port": 443,
      "latency_ms": 45.2,
      "speed_mbps": 12.34
    }
  ],
  "summary": {                                      // 统计摘要
    "avg_latency": 120.5,                           // 平均延迟（毫秒）
    "avg_speed": 5.67,                              // 平均速度（Mbps）
    "fastest_node": "Node-01",                      // 速度最快的节点名称
    "lowest_latency_node": "Node-03"                // 延迟最低的节点名称
  }
}
```

## 邮件报告格式

邮件报告通过 QQ SMTP 发送，包含：

- **统计概要卡片** — 总节点数、有效节点数、平均延迟、平均速度
- **速度排名表格** — 前 20 个节点的详细列表（排名、名称、类型、服务器、端口、延迟、速度）
- **颜色标记延迟**:
  - <span style="color:green">绿色</span> — 延迟 < 100ms（优秀）
  - <span style="color:orange">橙色</span> — 延迟 100-300ms（一般）
  - <span style="color:red">红色</span> — 延迟 > 300ms（差）
- **备用纯文本版本** — 兼容不支持 HTML 的邮件客户端

## GitHub Actions 定时任务

工作流文件位于 `.github/workflows/auto-node.yml`，配置了：

- **定时触发**: 每天 UTC 0:00 和 12:00（北京时间 8:00 和 20:00），通过 cron `0 0,12 * * *`
- **手动触发**: 支持 `workflow_dispatch`，可在 GitHub Actions 页面手动运行
- **自动提交**: 运行后自动将 `output/` 目录的更新提交到仓库

如需修改运行频率，编辑 `auto-node.yml` 中的 cron 表达式即可。

## 故障排除

### SMTP 发送失败

- **授权码错误**: 确认使用的是 QQ 邮箱 SMTP 授权码，不是登录密码。前往 QQ 邮箱 `设置 > 账户 > POP3/SMTP 服务` 获取
- **端口被封**: 默认使用 465（SSL），部分网络环境限制端口。确认 SMTP 服务器地址为 `smtp.qq.com`
- **授权码过期**: QQ 邮箱授权码可能过期，需重新生成并更新 GitHub Secrets

### 订阅链接解析失败

- 确认订阅 URL 可直接访问（无需额外认证）
- 支持 Clash YAML 格式和 Base64 格式的订阅
- 如果解析出 0 个节点，尝试直接访问订阅 URL 检查内容是否为空
- 部分订阅需特定 User-Agent，脚本已内置常用 User-Agent

### GitHub Actions 运行失败

- ** Secrets 未配置**: 检查 GitHub Secrets 是否已完整添加
- **Python 版本**: 确保 `setup-python` 使用 `3.11` 或更高版本
- **依赖安装失败**: 检查 `requirements.txt` 中的包名和版本是否可用
- **提交失败**: 确保 GitHub Actions 有仓库的写入权限（`Settings > Actions > General > Workflow permissions`）

### 本地运行提示

- 使用 `--dry-run` 先试运行，确认抓取和解析正常后再完整运行
- 使用 `--verbose` 查看 debug 级别的详细日志
- 测试速度时确保网络连接稳定，中国大陆用户可能需要代理环境

## 安全注意事项

- **不要在代码中硬编码密码** — 所有敏感信息通过环境变量或 GitHub Secrets 传入
- **授权码不要提交到 Git 仓库** — `SMTP_PASS` 等敏感信息仅通过 Secrets 管理
- **注意 GitHub Secrets 有效期** — 定期检查和更新 SMTP 授权码，避免过期导致邮件发送失败
- **仓库权限最小化** — GitHub Actions 仅需对 `output/` 目录的写入权限
- **输出文件不含密钥** — `results.json` 仅包含节点信息，不包含任何认证凭据

# 项目分析报告 v2

## 概述
- 项目：CoolReader（基于 Electron + React + TypeScript + epub.js）
- 版本：1.5.1
- 总文件数：50+
- 组件数：12
- Hooks 数：8（useBookEngine, useReaderControls, useSearch, useAnnotations, useProgressTimer, useInitialLoad, useDragDrop, useTheme）
- 样式文件：15（1 个入口 + 9 个组件 CSS + 2 个主题 + 2 个 tokens + 1 个常量）
- 已完成优化：样式已从 Reader/Sidebar/AIPanel 提取到 CSS 文件、TS 类型补丁已添加、CSS 死代码已清理

## A. 代码质量（高优先级）

### A1. [P0] BookCard 和 ContinueReadingCard 复用封面加载逻辑
- 位置：src/components/BookShelf.tsx:59-115 和 :117-167
- 描述：BookCard（L59-115）和 ContinueReadingCard（L117-167）两个组件完全独立实现了相同的封面加载逻辑（loadCover → 创建Blob → URL.createObjectURL → 清理），约 50 行重复代码
- 建议：提取为共享 hook `useCoverLoader(filePath: string)` 或将重复的 useEffect + state 逻辑合并为高阶组件

### A2. [P0] AIPanel 的 handleSummary 和 handleSend 重复流式通信逻辑
- 位置：src/components/AIPanel.tsx:46-77 和 :80-109
- 描述：handleSummary 和 handleSend 各自独立实现了相同的：cleanRef 清理、onAIToken 注册、aiStream 调用、错误处理、streamingText 与 addMessage 的结束逻辑。总共约 30 行重复代码
- 建议：提取为共享函数 `async function streamAIResponse(messages, setLoading, setStreamingText, addMessage)` 或 useAIStream hook

### A3. [P1] Reader.tsx 仍过大（763 行）
- 位置：src/components/Reader.tsx
- 描述：虽然样式已提取到 CSS，但 Reader.tsx 仍包含：UI 切换（showLayout/showMarkers/showSearch/showAI）、键盘事件处理、搜索面板 UI、书签标注面板 UI、自定义主题配置 UI
- 建议：拆分为 Reader（容器）+ ReaderSearchPanel（独立组件）+ ReaderMarkersPanel（独立组件）+ 提取键盘处理 hook

### A4. [P1] useBookEngine 过于复杂（370 行）
- 位置：src/hooks/useEpub/useBookEngine.ts
- 描述：useBookEngine 同时处理：epub.js 初始化、布局/主题恢复、TOC 解析、书签和标注加载。单一 hook 约 370 行且有 30 个 refs
- 建议：将 loadProgress/restoreTheme 等拆分为独立函数，将 SharedRefs 的 30 个字段整理成子组

## B. 样式问题（中优先级）

### B1. [P1] Reader.tsx 仍有内联样式
- 位置：src/components/Reader.tsx
- 描述：虽然大部分样式已提取到 reader.css，但 Reader.tsx 仍有约 15-20 处内联 style 属性（顶部工具栏按钮颜色、hover 效果等）
- 建议：继续将可静态化的内联样式迁移到 CSS 类

## C. 性能（中优先级）

### C1. [P1] Reader 组件未使用 React.memo
- 位置：src/components/Reader.tsx:55
- 描述：Reader 是最大组件且接收 30+ props，但未用 React.memo 包裹。每次父组件重新渲染时，Reader 全量重渲染
- 建议：包裹 Reader 于 React.memo，配合 useMemo 优化派生数据

### C2. [P1] AIPanel 的消息数组每次操作都创建新引用
- 位置：src/components/AIPanel.tsx:43, 112
- 描述：addMessage 使用 `setMessages(prev => [...prev, msg])` 创建新数组，导致 ChatMessageItem 即使使用了 memo 也会重新渲染
- 建议：考虑为 ChatMessageItem 添加 arePropsEqual 比较器

## D. 架构

### D1. [P2] Hook 间通过 SharedRefs 耦合
- 位置：src/hooks/useEpub/useBookEngine.ts:8-30, useReaderControls.ts, useSearch.ts
- 描述：三个 hook 通过 SharedRefs（30 个 MutableRefObject）传递状态。耦合度高
- 建议：创建类型安全的事件发布/订阅系统，或向 Context 迁移部分只读状态

## E. 类型安全（中优先级）

### E1. [P1] window.electronAPI 使用 Non-null assertion (!)
- 位置：AIPanel.tsx:63/69/95/101, useBookEngine.ts:52
- 描述：多处使用 `window.electronAPI!.xxx()` 非空断言，在非 Electron 环境会崩溃
- 建议：改为优雅降级：`window.electronAPI?.xxx?.() ?? defaultVal`

## F. 可维护性（低优先级）

### F1. [P2] 魔法数字散落
- 位置：Reader.tsx（多处）
- 描述：3000（auto-hide 超时）、200（wheel 节流）、0.22/0.78（点击区域）、4000/8000（章节文本截断长度）
- 建议：提取为命名常量

### F2. [P2] console 日志没有统一管理
- 位置：全项目
- 描述：全项目约 30+ 处 console.warn/error/info，没有统一日志级别控制
- 建议：创建 logger.ts 工具（支持 level 控制）

## 总结：待改进项

| 优先级 | 位置 | 问题 | 预估 |
|--------|------|------|------|
| P0 | BookShelf.tsx | 封面加载逻辑重复 50 行 | 15min |
| P0 | AIPanel.tsx | 流式通信逻辑重复 30 行 | 20min |
| P1 | Reader.tsx | 763 行过多功能 | 1h |
| P1 | useBookEngine.ts | 370 行过于复杂 | 2h |
| P1 | Reader.tsx | 仍有内联样式 | 30min |
| P1 | Reader.tsx | 缺少 React.memo | 15min |
| P1 | AIPanel/useBookEngine | electronAPI 非空断言 | 20min |
| P2 | useEpub/ | SharedRefs 耦合 | 1h |
| P2 | Reader.tsx | 魔法数字散落 | 20min |
| P2 | 全项目 | console 日志未管理 | 20min |

# AGENTS.md - 七海小说助手项目上下文

## 项目概述

**七海小说助手 (NanamiNovelHelper)** 是一个面向小说创作者的专业写作辅助工具，基于 Electron + React + TypeScript 技术栈构建。

**核心功能：**
- 项目管理（创建、打开、最近项目）
- 富文本编辑器（TipTap，支持 Markdown 快捷键、任务列表）
- 词汇管理（自定义类型、字段、关联文件）
- 敏感词检测与高亮
- 角色关系图可视化
- 组织架构图
- 故事时间线管理
- 事序图（事件序列图表）
- 随机起名工具
- 项目备份与恢复

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 33.x |
| 前端 | React 18 + TypeScript 5.7 |
| 构建工具 | Vite 6 + electron-vite 3 |
| 状态管理 | Zustand 5 |
| UI 组件库 | Ant Design 5 |
| 富文本编辑器 | TipTap 2 |
| 图可视化 | AntV G6 5 |
| 虚拟滚动 | @tanstack/react-virtual |
| 图片处理 | Sharp |
| 样式 | CSS Modules |
| 代码规范 | ESLint + Prettier |

## 项目结构

```
NanamiNovelHelper/
├── src/
│   ├── main/                       # Electron 主进程
│   │   ├── index.ts               # 主进程入口
│   │   ├── ipc/                   # IPC 处理器
│   │   │   ├── file-handler.ts
│   │   │   ├── highlight-handler.ts
│   │   │   ├── image-handler.ts
│   │   │   ├── organization-handler.ts
│   │   │   ├── project-handler.ts
│   │   │   ├── relationship-handler.ts
│   │   │   ├── sequence-chart-handler.ts
│   │   │   ├── settings-handler.ts
│   │   │   ├── timeline-handler.ts
│   │   │   └── vocabulary-handler.ts
│   │   ├── services/              # 业务服务层
│   │   │   ├── backup.ts
│   │   │   ├── file.ts
│   │   │   ├── globalSettings.ts
│   │   │   ├── highlight.ts
│   │   │   ├── image.ts
│   │   │   ├── organization.ts
│   │   │   ├── project.ts
│   │   │   ├── projectSettings.ts
│   │   │   ├── relationship.ts
│   │   │   ├── sequence-chart.ts
│   │   │   ├── timeline.ts
│   │   │   └── vocabulary.ts
│   │   └── types/                 # 类型定义
│   │       ├── file.ts
│   │       ├── highlight.ts
│   │       ├── index.ts
│   │       ├── organization.ts
│   │       ├── project.ts
│   │       ├── relationship.ts
│   │       ├── sensitive.ts
│   │       ├── sequence-chart.ts
│   │       ├── settings.ts
│   │       ├── timeline.ts
│   │       └── vocabulary.ts
│   ├── preload/                   # 预加载脚本
│   │   ├── index.ts               # 暴露 API 给渲染进程
│   │   └── index.d.ts             # 类型声明
│   └── renderer/                  # 渲染进程（React 应用）
│       ├── index.html
│       └── src/
│           ├── App.tsx            # 应用入口组件
│           ├── main.tsx           # React 挂载点
│           ├── components/        # UI 组件
│           │   ├── editor/        # 编辑器组件
│           │   │   ├── extensions/    # TipTap 扩展
│           │   │   │   ├── taskList.ts
│           │   │   │   └── vocabularyHighlight.ts
│           │   │   ├── EditorContextMenu.tsx
│           │   │   ├── EditorPanel.tsx
│           │   │   ├── EditorTabs.tsx
│           │   │   ├── EditorToolbar.tsx
│           │   │   ├── HighlightHoverCard.tsx
│           │   │   ├── MarkdownEditor.tsx
│           │   │   └── SearchReplacePanel.tsx
│           │   ├── file-tree/     # 文件树组件
│           │   ├── layout/        # 布局组件
│           │   ├── project/       # 项目相关组件
│           │   ├── random-name/   # 随机起名组件
│           │   ├── search/        # 搜索组件
│           │   ├── settings/      # 设置组件
│           │   ├── visualization/ # 可视化组件
│           │   │   ├── organization/   # 组织架构图
│           │   │   ├── relationship/   # 关系图
│           │   │   ├── sequence-chart/ # 事序图
│           │   │   └── timeline/       # 时间线
│           │   └── vocabulary/    # 词汇管理组件
│           ├── constants/         # 常量定义
│           ├── stores/            # Zustand 状态管理
│           │   ├── badgeConfigStore.ts
│           │   ├── editorStore.ts
│           │   ├── fileTreeStore.ts
│           │   ├── organizationStore.ts
│           │   ├── projectStore.ts
│           │   ├── relationshipStore.ts
│           │   ├── sensitiveStore.ts
│           │   ├── sequenceChartStore.ts
│           │   ├── settingsStore.ts
│           │   ├── themeStore.ts
│           │   ├── timelineStore.ts
│           │   ├── uiStore.ts
│           │   └── vocabularyStore.ts
│           ├── services/          # 渲染进程服务
│           │   ├── ahoCorasick.ts     # Aho-Corasick 算法实现
│           │   └── highlightService.ts
│           ├── styles/            # 全局样式
│           ├── types/             # 类型定义
│           └── utils/             # 工具函数
│               └── randomName.ts
├── resources/                     # 应用资源（图标等）
├── out/                           # 构建输出
├── reference/                     # 参考项目（51mazi 等）
├── electron.vite.config.mjs       # Vite 配置
├── electron-builder.yml           # 打包配置
├── eslint.config.mjs              # ESLint 配置
├── tsconfig.json                  # TypeScript 配置
└── package.json
```

## 核心架构

### 主进程与渲染进程通信

项目采用 Electron 推荐的上下文隔离模式：
- **主进程**：负责文件系统操作、原生对话框、项目配置管理
- **预加载脚本**：通过 `contextBridge` 暴露安全的 API 给渲染进程
- **渲染进程**：React 应用，通过 `window.electron` 调用主进程 API

### API 模块划分

预加载脚本暴露的 API 按功能模块划分：

```typescript
window.electron
  ├── window          // 窗口控制（最小化、最大化、关闭、全屏）
  ├── project         // 项目管理（创建、打开、关闭、最近项目）
  ├── vocabulary      // 词汇管理（类型、条目、关联文件）
  ├── sensitive       // 敏感词管理
  ├── highlight       // 高亮配置
  ├── settings        // 设置管理
  │   ├── global      // 全局设置（主题、语言、窗口状态、API Key）
  │   └── project     // 项目设置（编辑器、高亮、备份、徽章）
  ├── backup          // 备份管理（创建、恢复、导出、导入）
  ├── relationship    // 关系图管理（图、节点、边、关系类型）
  ├── timeline        // 时间线管理（时间线、节点、分支）
  ├── sequenceChart   // 事序图管理（图表、事件、事件类型）
  ├── organization    // 组织架构图管理（图、节点）
  ├── image           // 图片管理（上传、读取、删除）
  ├── file            // 文件系统操作
  └── platform        // 平台信息（process.platform）
```

### 状态管理

使用 Zustand 进行状态管理，各 Store 职责分明：

| Store | 职责 |
|-------|------|
| `projectStore` | 当前项目状态、最近项目列表 |
| `editorStore` | 编辑器状态、打开的文件 |
| `fileTreeStore` | 文件树状态 |
| `vocabularyStore` | 词汇类型和条目 |
| `sensitiveStore` | 敏感词列表 |
| `themeStore` | 主题配置 |
| `settingsStore` | 全局和项目设置 |
| `relationshipStore` | 关系图状态 |
| `timelineStore` | 时间线状态 |
| `sequenceChartStore` | 事序图状态 |
| `organizationStore` | 组织架构图状态 |
| `badgeConfigStore` | 侧边栏徽章配置 |
| `uiStore` | UI 状态（如选中文本） |

## 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint
npm run lint:fix

# 格式化代码
npm run format

# TypeScript 类型检查
npm run typecheck

# 打包安装程序
npm run build:win      # Windows
npm run build:mac      # macOS
npm run build:linux    # Linux
```

## 开发约定

### 路径别名

在 `electron.vite.config.mjs` 中配置了以下别名：

| 别名 | 路径 |
|------|------|
| `@main` | `src/main` |
| `@preload` | `src/preload` |
| `@renderer` | `src/renderer/src` |
| `@components` | `src/renderer/src/components` |
| `@stores` | `src/renderer/src/stores` |
| `@services` | `src/renderer/src/services` |
| `@hooks` | `src/renderer/src/hooks` |
| `@utils` | `src/renderer/src/utils` |
| `@types` | `src/renderer/src/types` |
| `@constants` | `src/renderer/src/constants` |

### 代码规范

- 使用 ESLint + Prettier 进行代码规范检查
- TypeScript 严格模式
- React 函数组件 + Hooks
- CSS Modules 进行样式隔离
- 禁止在渲染进程直接使用 Node.js API（必须通过 preload 暴露）

### 组件开发规范

1. 组件文件命名：PascalCase（如 `EditorPanel.tsx`）
2. 样式文件命名：与组件同名 + `.module.css`（如 `EditorPanel.module.css`）
3. 导出方式：具名导出优先
4. 状态管理：优先使用 Zustand，复杂组件可使用 useState

### IPC 通信规范

1. 渲染进程到主进程：使用 `ipcRenderer.invoke`（异步）或 `ipcRenderer.send`（同步事件）
2. 主进程到渲染进程：使用 `BrowserWindow.webContents.send`
3. 所有 IPC 通道命名遵循 `模块:操作` 格式（如 `project:create`）

## 项目配置文件

| 文件 | 用途 |
|------|------|
| `project.nanami.md` | 项目配置文件（YAML frontmatter 格式） |
| `.nanami/settings.json5` | 项目设置（自动保存间隔、编辑器配置等） |
| `设定/vocabulary.json5` | 词汇库 |
| `设定/character-gallery.json5` | 角色库 |
| `设定/sensitive-words.json5` | 敏感词表 |
| `设定/relationship-graphs/` | 关系图数据 |
| `设定/timelines/` | 时间线数据 |
| `设定/sequence-charts/` | 事序图数据 |
| `设定/organization-graphs/` | 组织架构图数据 |

## 主要功能模块

### 关系图 (Relationship Graph)

基于 AntV G6 实现的角色关系可视化功能：
- 支持多种关系类型（亲情、友情、爱情、敌对、师徒等）
- 节点支持圆形/卡片样式
- 支持自定义关系类型（颜色、线型、线宽）
- 可与词汇库关联
- 支持缩略图、导入导出

### 组织架构图 (Organization Graph)

层级结构可视化工具：
- 支持树形层级结构展示
- 节点支持简洁/卡片样式
- 节点可折叠/展开
- 可与词汇库关联
- 支持缩略图、导入导出
- 支持节点移动、视图状态保存

### 时间线 (Timeline)

故事时间线管理工具：
- 支持多种时间格式（日期时间、章节、自定义）
- 节点可关联角色、章节
- 支持分支时间线（分支、合并）
- 支持导出为 JSON 或 Markdown

### 事序图 (Sequence Chart)

事件序列可视化工具：
- 支持单元格时间轴
- 事件可设置进度、关联角色/地点/章节
- 自定义事件类型
- 时间轴自动扩展

### 随机起名 (Random Name)

随机名字生成工具，帮助创作者快速生成角色名称。

### 备份管理 (Backup)

项目备份与恢复功能：
- 自动/手动备份
- 备份列表管理
- 导出/导入备份文件

## 环境要求

- Node.js >= 20.0.0
- 支持平台：Windows、macOS、Linux

## 注意事项

1. **Windows/Linux 使用无边框窗口**，配合自定义标题栏；macOS 使用原生标题栏
2. 项目使用 `electron-store` 持久化应用级配置（如最近项目列表）
3. 敏感词高亮功能使用 Aho-Corasick 算法进行多模式匹配，支持性能优化（大文件阈值检测）
4. 编辑器基于 TipTap，支持 Markdown 快捷键、富文本格式和任务列表
5. 编辑器扩展位于 `components/editor/extensions/`，包括词汇高亮、任务列表等
6. 关系图使用 AntV G6 5.x 版本，注意 API 与 4.x 的差异
7. 图片处理使用 Sharp 库，需要原生依赖
8. 组织架构图支持与词汇库关联，节点可关联词汇条目

## 参考资源

- `reference/51mazi/`：参考项目，包含博客文章和实现思路
- `reference/andrea-novel-helper-0.4.57/`：VSCode 扩展版本参考
- `reference/vscode-1.110/`：VSCode 源码参考
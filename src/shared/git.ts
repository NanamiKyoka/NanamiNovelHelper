/**
 * Git 相关类型定义
 * 主进程和渲染进程共享
 */

/** Git 实现模式 */
export type GitMode = 'system' | 'isomorphic' | 'auto'

/** 文件状态 */
export type GitFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'unmodified'

/** 文件状态简写 */
export type GitFileStatusShort = 'M' | 'A' | 'D' | 'R' | 'C' | '?' | '!' | ' '

/** Git 文件变更信息 */
export interface GitFileChange {
  /** 文件路径（相对于仓库根目录） */
  path: string
  /** 旧路径（重命名时） */
  oldPath?: string
  /** 文件状态 */
  status: GitFileStatus
  /** 状态简写 */
  statusShort: GitFileStatusShort
  /** 是否已暂存 */
  staged: boolean
  /** 新增行数 */
  additions: number
  /** 删除行数 */
  deletions: number
}

/** Git 提交信息 */
export interface GitCommit {
  /** 提交哈希（完整） */
  hash: string
  /** 提交哈希（简短） */
  shortHash: string
  /** 提交消息 */
  message: string
  /** 提交标题（消息第一行） */
  title: string
  /** 提交者名称 */
  authorName: string
  /** 提交者邮箱 */
  authorEmail: string
  /** 提交时间（时间戳） */
  timestamp: number
  /** 提交时间（ISO字符串） */
  date: string
  /** 父提交哈希列表 */
  parentHashes: string[]
  /** 关联的引用（分支、标签） */
  refs: string[]
}

/** Git 分支信息 */
export interface GitBranch {
  /** 分支名称 */
  name: string
  /** 是否为当前分支 */
  current: boolean
  /** 上游分支名称 */
  upstream?: string
  /** 上游状态 */
  ahead?: number
  behind?: number
  /** 最后提交 */
  lastCommit?: GitCommit
  /** 是否为远程分支 */
  remote: boolean
}

/** Git 差异行 */
export interface GitDiffLine {
  /** 行类型：增加、删除、无变化 */
  type: 'add' | 'delete' | 'context'
  /** 行号（旧文件） */
  oldLineNumber?: number
  /** 行号（新文件） */
  newLineNumber?: number
  /** 行内容 */
  content: string
}

/** Git 差异块 */
export interface GitDiffHunk {
  /** 旧文件起始行 */
  oldStart: number
  /** 旧文件行数 */
  oldLines: number
  /** 新文件起始行 */
  newStart: number
  /** 新文件行数 */
  newLines: number
  /** 块标题 */
  header: string
  /** 行列表 */
  lines: GitDiffLine[]
}

/** Git 文件差异 */
export interface GitFileDiff {
  /** 文件路径 */
  path: string
  /** 旧文件路径（重命名时） */
  oldPath?: string
  /** 文件状态 */
  status: GitFileStatus
  /** 是否为二进制文件 */
  binary: boolean
  /** 差异块列表 */
  hunks: GitDiffHunk[]
  /** 新增行数 */
  additions: number
  /** 删除行数 */
  deletions: number
}

/** Git 仓库状态 */
export interface GitRepositoryStatus {
  /** 当前分支 */
  branch: string | null
  /** 是否有未提交的更改 */
  hasChanges: boolean
  /** 是否有暂存的更改 */
  hasStagedChanges: boolean
  /** 未暂存的文件列表 */
  changes: GitFileChange[]
  /** 暂存的文件列表 */
  stagedChanges: GitFileChange[]
  /** 领先上游的提交数 */
  ahead: number
  /** 落后上游的提交数 */
  behind: number
  /** 是否正在变基 */
  rebasing: boolean
  /** 是否正在合并 */
  merging: boolean
  /** 冲突文件列表 */
  conflicts: string[]
}

/** Git 配置 */
export interface GitConfig {
  /** 用户名 */
  userName?: string
  /** 用户邮箱 */
  userEmail?: string
  /** 默认分支名 */
  defaultBranch?: string
}

/** Git 自动提交配置 */
export interface GitAutoCommitConfig {
  /** 是否启用自动提交 */
  enabled: boolean
  /** 自动提交间隔（分钟） */
  interval: number
  /** 自动提交消息模板 */
  messageTemplate: string
}

/** Git 初始化选项 */
export interface GitInitOptions {
  /** 初始化路径 */
  path: string
  /** 默认分支名 */
  defaultBranch?: string
  /** 初始提交消息 */
  initialCommit?: string
}

/** Git 提交选项 */
export interface GitCommitOptions {
  /** 提交消息 */
  message: string
  /** 是否提交所有更改 */
  all?: boolean
  /** 作者名称（覆盖配置） */
  authorName?: string
  /** 作者邮箱（覆盖配置） */
  authorEmail?: string
}

/** Git 回退选项 */
export interface GitResetOptions {
  /** 目标提交哈希 */
  commit: string
  /** 回退模式 */
  mode: 'soft' | 'mixed' | 'hard'
}

/** Git 检出选项 */
export interface GitCheckoutOptions {
  /** 目标（分支名/提交哈希/文件路径） */
  target: string
  /** 是否创建新分支 */
  createBranch?: boolean
  /** 新分支名称 */
  branchName?: string
  /** 是否强制 */
  force?: boolean
  /** 是否为文件检出 */
  paths?: string[]
}

/** Git 合并选项 */
export interface GitMergeOptions {
  /** 要合并的分支 */
  branch: string
  /** 是否允许不相关历史 */
  allowUnrelatedHistories?: boolean
  /** 合并消息 */
  message?: string
}

/** Git 日志选项 */
export interface GitLogOptions {
  /** 最大提交数 */
  maxCount?: number
  /** 跳过前 N 个 */
  skip?: number
  /** 起始提交 */
  from?: string
  /** 结束提交 */
  to?: string
  /** 文件路径过滤 */
  path?: string
  /** 搜索关键词 */
  search?: string
  /** 作者过滤 */
  author?: string
}

/** Git 状态（Store 用） */
export interface GitStatus {
  /** 是否已初始化 */
  initialized: boolean
  /** 是否是 Git 仓库 */
  isRepo: boolean
  /** 仓库路径 */
  repoPath: string | null
  /** 当前模式 */
  mode: GitMode
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 仓库状态 */
  repository: GitRepositoryStatus | null
  /** 分支列表 */
  branches: GitBranch[]
  /** 提交历史 */
  commits: GitCommit[]
  /** 当前差异 */
  currentDiff: GitFileDiff | null
}

/** Git API 返回结果 */
export interface GitResult<T> {
  success: boolean
  data?: T
  error?: string
}

/** IPC 通道名称 */
export const GIT_CHANNELS = {
  // 仓库管理
  INIT: 'git:init',
  STATUS: 'git:status',
  IS_REPO: 'git:isRepo',

  // 提交管理
  LOG: 'git:log',
  COMMIT: 'git:commit',
  RESET: 'git:reset',
  REVERT: 'git:revert',

  // 文件操作
  ADD: 'git:add',
  RESTORE: 'git:restore',
  DIFF: 'git:diff',

  // 分支管理
  BRANCH_LIST: 'git:branch:list',
  BRANCH_CREATE: 'git:branch:create',
  BRANCH_DELETE: 'git:branch:delete',
  BRANCH_RENAME: 'git:branch:rename',
  CHECKOUT: 'git:checkout',
  MERGE: 'git:merge',

  // 配置
  CONFIG_GET: 'git:config:get',
  CONFIG_SET: 'git:config:set',

  // 模式
  SET_MODE: 'git:setMode',
  GET_MODE: 'git:getMode'
} as const

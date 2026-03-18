/**
 * Git 相关类型定义（渲染进程）
 */

/** Git 实现模式 */
export type GitMode = 'system' | 'isomorphic' | 'auto'

/** 文件状态 */
export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'ignored' | 'unmodified'

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

/** Git 日志选项 */
export interface GitLogOptions {
  /** 最大提交数 */
  maxCount?: number
  /** 跳过前 N 个 */
  skip?: number
  /** 文件路径过滤 */
  path?: string
  /** 搜索关键词 */
  search?: string
  /** 作者过滤 */
  author?: string
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

/** Git API 返回结果 */
export interface GitResult<T> {
  success: boolean
  data?: T
  error?: string
}

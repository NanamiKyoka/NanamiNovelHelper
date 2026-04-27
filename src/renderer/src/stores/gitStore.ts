/**
 * Git 状态管理
 */

import { create } from 'zustand'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import type {
  GitMode,
  GitFileChange,
  GitCommit,
  GitBranch,
  GitFileDiff,
  GitRepositoryStatus,
  GitLogOptions,
  GitCommitOptions,
  GitResetOptions,
  GitCheckoutOptions,
  GitMergeOptions
} from '@shared/git'

/** 视图模式 */
type GitViewMode = 'changes' | 'history' | 'branches'

/** Git 状态接口 */
interface GitState {
  // 仓库状态
  initialized: boolean
  isRepo: boolean
  loading: boolean
  error: string | null

  // Git 模式
  mode: GitMode
  useSystemGit: boolean

  // 仓库数据
  repository: GitRepositoryStatus | null
  branches: GitBranch[]
  commits: GitCommit[]
  currentBranch: string | null

  // 当前选中的文件差异
  currentDiff: GitFileDiff | null
  selectedFile: GitFileChange | null

  // 视图状态
  viewMode: GitViewMode
  logOptions: GitLogOptions

  // 自动提交配置
  autoCommitEnabled: boolean
  autoCommitInterval: number // 分钟
  autoCommitTimer: NodeJS.Timeout | null

  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setViewMode: (mode: GitViewMode) => void

  // 初始化和状态刷新
  init: () => Promise<void>
  refresh: () => Promise<void>
  checkRepo: () => Promise<boolean>

  // 提交操作
  getLog: (options?: GitLogOptions) => Promise<void>
  commit: (options: GitCommitOptions) => Promise<boolean>
  reset: (options: GitResetOptions) => Promise<boolean>

  // 文件操作
  add: (filepaths: string[]) => Promise<boolean>
  addAll: () => Promise<boolean>
  restore: (filepaths: string[], source?: string) => Promise<boolean>
  getDiff: (filepath: string, staged?: boolean) => Promise<GitFileDiff | null>
  selectFile: (file: GitFileChange | null) => void

  // 分支操作
  getBranches: () => Promise<void>
  createBranch: (name: string, startPoint?: string) => Promise<boolean>
  deleteBranch: (name: string, force?: boolean) => Promise<boolean>
  checkout: (options: GitCheckoutOptions) => Promise<boolean>
  merge: (options: GitMergeOptions) => Promise<boolean>

  // 模式设置
  setMode: (mode: GitMode) => Promise<void>

  // 自动提交
  startAutoCommit: () => void
  stopAutoCommit: () => void
  setAutoCommitConfig: (enabled: boolean, interval: number) => void
}

export const useGitStore = create<GitState>((set, get) => ({
  // 初始状态
  initialized: false,
  isRepo: false,
  loading: false,
  error: null,
  mode: 'auto',
  useSystemGit: false,
  repository: null,
  branches: [],
  commits: [],
  currentBranch: null,
  currentDiff: null,
  selectedFile: null,
  viewMode: 'changes',
  logOptions: { maxCount: 50 },
  autoCommitEnabled: false,
  autoCommitInterval: 10,
  autoCommitTimer: null,

  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setViewMode: (mode: GitViewMode) => set({ viewMode: mode }),

  // 初始化
  init: async () => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) {
      set({ initialized: true, isRepo: false, repository: null })
      return
    }

    set({ loading: true, error: null })

    try {
      // 获取 Git 模式
      const modeResult = await window.electron.git.getMode()
      if (modeResult) {
        set({ mode: modeResult.mode, useSystemGit: modeResult.useSystemGit })
      }

      // 检查是否是 Git 仓库
      const isRepo = await window.electron.git.isRepo(project.path)

      if (!isRepo) {
        set({
          initialized: true,
          isRepo: false,
          repository: null,
          loading: false
        })
        return
      }

      // 获取仓库状态
      const statusResult = await window.electron.git.status(project.path)
      if (statusResult.success && statusResult.data) {
        set({
          initialized: true,
          isRepo: true,
          repository: statusResult.data,
          currentBranch: statusResult.data.branch,
          loading: false
        })
      } else {
        set({
          initialized: true,
          isRepo: true,
          error: statusResult.error || '获取仓库状态失败',
          loading: false
        })
      }
    } catch (error) {
      set({
        initialized: true,
        isRepo: false,
        error: String(error),
        loading: false
      })
    }
  },

  // 刷新状态
  refresh: async () => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path || !get().isRepo) return

    set({ loading: true, error: null })

    try {
      const statusResult = await window.electron.git.status(project.path)
      if (statusResult.success && statusResult.data) {
        set({
          repository: statusResult.data,
          currentBranch: statusResult.data.branch,
          loading: false
        })
      } else {
        set({ error: statusResult.error || '刷新状态失败', loading: false })
      }
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  // 检查是否是仓库
  checkRepo: async () => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    const isRepo = await window.electron.git.isRepo(project.path)
    set({ isRepo })
    return isRepo
  },

  // 获取提交历史
  getLog: async (options?: GitLogOptions) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return

    const logOptions = { ...get().logOptions, ...options }
    set({ logOptions })

    try {
      const result = await window.electron.git.log(project.path, logOptions)
      if (result.success && result.data) {
        set({ commits: result.data })
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  // 提交
  commit: async (options: GitCommitOptions) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    set({ loading: true, error: null })

    try {
      const result = await window.electron.git.commit(project.path, options)
      if (result.success) {
        await get().refresh()
        await get().getLog()
        return true
      } else {
        set({ error: result.error || '提交失败', loading: false })
        return false
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return false
    }
  },

  // 回退
  reset: async (options: GitResetOptions) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    set({ loading: true, error: null })

    try {
      const result = await window.electron.git.reset(project.path, options)
      if (result.success) {
        await get().refresh()
        await get().getLog()
        await useEditorStore.getState().refreshAllOpenFiles()
        return true
      } else {
        set({ error: result.error || '回退失败', loading: false })
        return false
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return false
    }
  },

  // 添加文件到暂存区
  add: async (filepaths: string[]) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    try {
      const result = await window.electron.git.add(project.path, filepaths)
      if (result.success) {
        await get().refresh()
        return true
      } else {
        set({ error: result.error || '添加失败' })
        return false
      }
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  // 添加所有文件
  addAll: async () => {
    const repository = get().repository
    if (!repository) return false

    const allChanges = [...repository.changes, ...repository.stagedChanges]
    const filePaths = allChanges.map(f => f.path)
    return get().add(filePaths)
  },

  // 恢复文件
  restore: async (filepaths: string[], source?: string) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    try {
      const result = await window.electron.git.restore(project.path, filepaths, source)
      if (result.success) {
        await get().refresh()
        await useEditorStore.getState().refreshAllOpenFiles()
        return true
      } else {
        set({ error: result.error || '恢复失败' })
        return false
      }
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  // 获取文件差异
  getDiff: async (filepath: string, staged: boolean = false) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return null

    try {
      const result = await window.electron.git.diff(project.path, filepath, staged)
      if (result.success && result.data) {
        set({ currentDiff: result.data })
        return result.data
      } else {
        set({ error: result.error || '获取差异失败' })
        return null
      }
    } catch (error) {
      set({ error: String(error) })
      return null
    }
  },

  // 选中文件
  selectFile: (file: GitFileChange | null) => {
    set({ selectedFile: file })
    if (file) {
      get().getDiff(file.path, file.staged)
    } else {
      set({ currentDiff: null })
    }
  },

  // 获取分支列表
  getBranches: async () => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return

    try {
      const result = await window.electron.git.branchList(project.path)
      if (result.success && result.data) {
        set({ branches: result.data })
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  // 创建分支
  createBranch: async (name: string, startPoint?: string) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    try {
      const result = await window.electron.git.branchCreate(project.path, name, startPoint)
      if (result.success) {
        await get().getBranches()
        return true
      } else {
        set({ error: result.error || '创建分支失败' })
        return false
      }
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  // 删除分支
  deleteBranch: async (name: string, force?: boolean) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    try {
      const result = await window.electron.git.branchDelete(project.path, name, force)
      if (result.success) {
        await get().getBranches()
        return true
      } else {
        set({ error: result.error || '删除分支失败' })
        return false
      }
    } catch (error) {
      set({ error: String(error) })
      return false
    }
  },

  // 切换分支
  checkout: async (options: GitCheckoutOptions) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    set({ loading: true, error: null })

    try {
      const result = await window.electron.git.checkout(project.path, options)
      if (result.success) {
        await get().refresh()
        await get().getBranches()
        await get().getLog()
        await useEditorStore.getState().refreshAllOpenFiles()
        return true
      } else {
        set({ error: result.error || '切换分支失败', loading: false })
        return false
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return false
    }
  },

  // 合并分支
  merge: async (options: GitMergeOptions) => {
    const project = useProjectStore.getState().currentProject
    if (!project?.path) return false

    set({ loading: true, error: null })

    try {
      const result = await window.electron.git.merge(project.path, options)
      if (result.success) {
        await get().refresh()
        await get().getLog()
        await useEditorStore.getState().refreshAllOpenFiles()
        return true
      } else {
        set({ error: result.error || '合并失败', loading: false })
        return false
      }
    } catch (error) {
      set({ error: String(error), loading: false })
      return false
    }
  },

  // 设置 Git 模式
  setMode: async (mode: GitMode) => {
    try {
      const result = await window.electron.git.setMode(mode)
      if (result.success) {
        const modeResult = await window.electron.git.getMode()
        if (modeResult) {
          set({ mode: modeResult.mode, useSystemGit: modeResult.useSystemGit })
        }
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  // 启动自动提交
  startAutoCommit: () => {
    const { autoCommitTimer, autoCommitInterval } = get()

    // 清除现有定时器
    if (autoCommitTimer) {
      clearInterval(autoCommitTimer)
    }

    // 创建新定时器
    const timer = setInterval(async () => {
      const repository = get().repository
      if (repository && (repository.hasChanges || repository.hasStagedChanges)) {
        // 添加所有更改
        await get().addAll()
        // 提交
        const now = new Date()
        const message = `自动保存 - ${now.toLocaleString('zh-CN')}`
        await get().commit({ message, all: true })
      }
    }, autoCommitInterval * 60 * 1000)

    set({ autoCommitTimer: timer, autoCommitEnabled: true })
  },

  // 停止自动提交
  stopAutoCommit: () => {
    const { autoCommitTimer } = get()
    if (autoCommitTimer) {
      clearInterval(autoCommitTimer)
    }
    set({ autoCommitTimer: null, autoCommitEnabled: false })
  },

  // 设置自动提交配置
  setAutoCommitConfig: (enabled: boolean, interval: number) => {
    set({ autoCommitEnabled: enabled, autoCommitInterval: interval })

    if (enabled) {
      get().startAutoCommit()
    } else {
      get().stopAutoCommit()
    }
  }
}))

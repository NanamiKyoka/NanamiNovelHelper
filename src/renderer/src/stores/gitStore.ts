import { create } from 'zustand'
import { useProjectStore } from './projectStore'
import { useEditorStore } from './editorStore'
import { useFileTreeStore } from './fileTreeStore'
import {
  Sequencer,
  Throttler,
  CancellationTokenSource,
  CancellationError,
  debounce
} from '@shared/async'
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

type GitViewMode = 'changes' | 'history' | 'branches'

interface CommitDetail {
  commit: GitCommit
  files: GitFileChange[]
  loading: boolean
}

enum OperationKind {
  Status = 'Status',
  Log = 'Log',
  Commit = 'Commit',
  Reset = 'Reset',
  Add = 'Add',
  Restore = 'Restore',
  Checkout = 'Checkout',
  Merge = 'Merge',
  Branch = 'Branch',
  Diff = 'Diff'
}

interface Operation {
  kind: OperationKind
  blocking: boolean
  readOnly: boolean
  refreshAfter: boolean
  refreshTree: boolean
  refreshEditor: boolean
}

const Operations = {
  Status: {
    kind: OperationKind.Status,
    blocking: false,
    readOnly: true,
    refreshAfter: false,
    refreshTree: false,
    refreshEditor: false
  },
  Log: {
    kind: OperationKind.Log,
    blocking: false,
    readOnly: true,
    refreshAfter: false,
    refreshTree: false,
    refreshEditor: false
  },
  Commit: {
    kind: OperationKind.Commit,
    blocking: true,
    readOnly: false,
    refreshAfter: true,
    refreshTree: false,
    refreshEditor: false
  },
  Reset: {
    kind: OperationKind.Reset,
    blocking: true,
    readOnly: false,
    refreshAfter: true,
    refreshTree: true,
    refreshEditor: true
  },
  Add: {
    kind: OperationKind.Add,
    blocking: false,
    readOnly: false,
    refreshAfter: true,
    refreshTree: false,
    refreshEditor: false
  },
  Restore: {
    kind: OperationKind.Restore,
    blocking: false,
    readOnly: false,
    refreshAfter: true,
    refreshTree: true,
    refreshEditor: true
  },
  Checkout: {
    kind: OperationKind.Checkout,
    blocking: true,
    readOnly: false,
    refreshAfter: true,
    refreshTree: true,
    refreshEditor: true
  },
  Merge: {
    kind: OperationKind.Merge,
    blocking: true,
    readOnly: false,
    refreshAfter: true,
    refreshTree: true,
    refreshEditor: true
  },
  Branch: {
    kind: OperationKind.Branch,
    blocking: false,
    readOnly: false,
    refreshAfter: true,
    refreshTree: false,
    refreshEditor: false
  },
  Diff: {
    kind: OperationKind.Diff,
    blocking: false,
    readOnly: true,
    refreshAfter: false,
    refreshTree: false,
    refreshEditor: false
  }
}

class OperationManager {
  private running = new Map<OperationKind, number>()

  start(op: Operation): void {
    this.running.set(op.kind, (this.running.get(op.kind) || 0) + 1)
  }

  end(op: Operation): void {
    const count = (this.running.get(op.kind) || 0) - 1
    if (count <= 0) {
      this.running.delete(op.kind)
    } else {
      this.running.set(op.kind, count)
    }
  }

  isIdle(): boolean {
    for (const [, count] of this.running) {
      if (count > 0) return false
    }
    return true
  }

  isRunning(kind: OperationKind): boolean {
    return (this.running.get(kind) || 0) > 0
  }

  shouldDisableCommands(): boolean {
    for (const [kind, count] of this.running) {
      if (count > 0) {
        const op = Object.values(Operations).find(o => o.kind === kind)
        if (op?.blocking) return true
      }
    }
    return false
  }
}

interface GitState {
  initialized: boolean
  isRepo: boolean
  loading: boolean
  error: string | null

  mode: GitMode
  useSystemGit: boolean

  repository: GitRepositoryStatus | null
  branches: GitBranch[]
  commits: GitCommit[]
  currentBranch: string | null

  currentDiff: GitFileDiff | null
  selectedFile: GitFileChange | null

  commitDetail: CommitDetail | null

  viewMode: GitViewMode
  logOptions: GitLogOptions

  autoCommitEnabled: boolean
  autoCommitInterval: number
  autoCommitTimer: NodeJS.Timeout | null

  operationsRunning: boolean

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setViewMode: (mode: GitViewMode) => void

  init: () => Promise<void>
  refresh: () => Promise<void>
  scheduleRefresh: () => void
  checkRepo: () => Promise<boolean>

  getLog: (options?: GitLogOptions) => Promise<void>
  commit: (options: GitCommitOptions) => Promise<boolean>
  reset: (options: GitResetOptions) => Promise<boolean>

  add: (filepaths: string[]) => Promise<boolean>
  addAll: () => Promise<boolean>
  unstage: (filepaths: string[]) => Promise<boolean>
  restore: (filepaths: string[], source?: string) => Promise<boolean>
  getDiff: (filepath: string, staged?: boolean) => Promise<GitFileDiff | null>
  selectFile: (file: GitFileChange | null) => void

  getBranches: () => Promise<void>
  createBranch: (name: string, startPoint?: string) => Promise<boolean>
  deleteBranch: (name: string, force?: boolean) => Promise<boolean>
  checkout: (options: GitCheckoutOptions) => Promise<boolean>
  merge: (options: GitMergeOptions) => Promise<boolean>

  setMode: (mode: GitMode) => Promise<void>

  startAutoCommit: () => void
  stopAutoCommit: () => void
  setAutoCommitConfig: (enabled: boolean, interval: number) => void

  getCommitDetail: (commit: GitCommit) => Promise<void>
  getCommitFileDiff: (commitHash: string, filepath: string) => Promise<GitFileDiff | null>
  clearCommitDetail: () => void

  dispose: () => void
}

export const useGitStore = create<GitState>((set, get) => {
  const opManager = new OperationManager()
  const statusSequencer = new Sequencer()
  const refreshThrottler = new Throttler()
  let currentCts = new CancellationTokenSource()

  const debouncedRefresh = debounce(() => {
    get().refresh()
  }, 1000)

  const runOperation = async <T>(operation: Operation, task: () => Promise<T>): Promise<T> => {
    currentCts.cancel()
    currentCts = new CancellationTokenSource()

    opManager.start(operation)
    set({ operationsRunning: !opManager.isIdle() })

    try {
      const result = await task()

      if (!operation.readOnly) {
        await postOperationRefresh(operation)
      }

      return result
    } catch (error) {
      if (error instanceof CancellationError) {
        return undefined as T
      }

      if (!operation.readOnly) {
        await postOperationRefresh(operation)
      }

      throw error
    } finally {
      opManager.end(operation)
      set({ operationsRunning: !opManager.isIdle() })
    }
  }

  const postOperationRefresh = async (operation: Operation): Promise<void> => {
    const tasks: Promise<void>[] = []

    if (operation.refreshAfter) {
      tasks.push(
        refreshThrottler.queue(async () => {
          await get().refresh()
        })
      )
    }

    if (operation.refreshTree) {
      tasks.push(useFileTreeStore.getState().refreshTree())
    }

    if (operation.refreshEditor) {
      tasks.push(useEditorStore.getState().refreshAllOpenFiles())
    }

    await Promise.allSettled(tasks)
  }

  const syncGitStatusToFileTree = (repository: GitRepositoryStatus) => {
    const changes: { path: string; statusShort: string; staged: boolean }[] = []
    for (const change of repository.changes) {
      changes.push({ path: change.path, statusShort: change.statusShort, staged: change.staged })
    }
    for (const change of repository.stagedChanges) {
      changes.push({ path: change.path, statusShort: change.statusShort, staged: change.staged })
    }
    useFileTreeStore.getState().updateGitStatus(changes)
  }

  return {
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
    commitDetail: null,
    viewMode: 'changes',
    logOptions: { maxCount: 50 },
    autoCommitEnabled: false,
    autoCommitInterval: 10,
    autoCommitTimer: null,
    operationsRunning: false,

    setLoading: (loading: boolean) => set({ loading }),
    setError: (error: string | null) => set({ error }),
    setViewMode: (mode: GitViewMode) => set({ viewMode: mode }),

    init: async () => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) {
        set({ initialized: true, isRepo: false, repository: null })
        useFileTreeStore.getState().updateGitStatus([])
        return
      }

      set({ loading: true, error: null })

      try {
        const modeResult = await window.api.git.getMode()
        if (modeResult) {
          set({ mode: modeResult.mode, useSystemGit: modeResult.useSystemGit })
        }

        let isRepo: boolean
        try {
          isRepo = await window.api.git.isRepo(projectPath)
        } catch (err) {
          console.warn('Git仓库检测失败:', err)
          set({ initialized: true, isRepo: false, repository: null, loading: false, error: null })
          useFileTreeStore.getState().updateGitStatus([])
          return
        }

        if (!isRepo) {
          set({ initialized: true, isRepo: false, repository: null, loading: false })
          useFileTreeStore.getState().updateGitStatus([])
          return
        }

        const statusResult = await window.api.git.status(projectPath)
        if (statusResult.success && statusResult.data) {
          set({
            initialized: true,
            isRepo: true,
            repository: statusResult.data,
            currentBranch: statusResult.data.branch,
            loading: false
          })
          syncGitStatusToFileTree(statusResult.data)
        } else {
          set({
            initialized: true,
            isRepo: true,
            error: statusResult.error || '获取仓库状态失败',
            loading: false
          })
        }
      } catch (error) {
        console.warn('Git初始化失败:', error)
        set({ initialized: true, isRepo: false, error: null, loading: false })
      }
    },

    refresh: async () => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath || !get().isRepo) return

      await statusSequencer.queue(async () => {
        set({ loading: true, error: null })

        try {
          const statusResult = await window.api.git.status(projectPath)
          if (statusResult.success && statusResult.data) {
            set({
              repository: statusResult.data,
              currentBranch: statusResult.data.branch,
              loading: false
            })
            syncGitStatusToFileTree(statusResult.data)
            const { selectedFile } = get()
            if (selectedFile) {
              get().getDiff(selectedFile.path, selectedFile.staged)
            }
          } else {
            set({ error: statusResult.error || '刷新状态失败', loading: false })
          }
        } catch (error) {
          set({ error: String(error), loading: false })
        }
      })
    },

    scheduleRefresh: () => {
      debouncedRefresh()
    },

    checkRepo: async () => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      const isRepo = await window.api.git.isRepo(projectPath)
      set({ isRepo })
      return isRepo
    },

    getLog: async (options?: GitLogOptions) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return

      const logOptions = { ...get().logOptions, ...options }
      set({ logOptions })

      try {
        const result = await window.api.git.log(projectPath, logOptions)
        if (result.success && result.data) {
          set({ commits: result.data })
        }
      } catch (error) {
        set({ error: String(error) })
      }
    },

    commit: async (options: GitCommitOptions) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      set({ loading: true, error: null })

      try {
        return await runOperation(Operations.Commit, async () => {
          const result = await window.api.git.commit(projectPath, options)
          if (result.success) {
            await get().getLog()
            set({ loading: false })
            return true
          } else {
            set({ error: result.error || '提交失败', loading: false })
            return false
          }
        })
      } catch (error) {
        set({ error: String(error), loading: false })
        return false
      }
    },

    reset: async (options: GitResetOptions) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      set({ loading: true, error: null })

      try {
        return await runOperation(Operations.Reset, async () => {
          const result = await window.api.git.reset(projectPath, options)
          if (result.success) {
            await get().getLog()
            set({ loading: false })
            return true
          } else {
            set({ error: result.error || '回退失败', loading: false })
            return false
          }
        })
      } catch (error) {
        set({ error: String(error), loading: false })
        return false
      }
    },

    add: async (filepaths: string[]) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      try {
        return await runOperation(Operations.Add, async () => {
          const result = await window.api.git.add(projectPath, filepaths)
          if (!result.success) {
            set({ error: result.error || '添加失败' })
          }
          return result.success
        })
      } catch (error) {
        set({ error: String(error) })
        return false
      }
    },

    addAll: async () => {
      const repository = get().repository
      if (!repository) return false

      const allChanges = [...repository.changes, ...repository.stagedChanges]
      const filePaths = allChanges.map(f => f.path)
      return get().add(filePaths)
    },

    unstage: async (filepaths: string[]) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      try {
        return await runOperation(Operations.Add, async () => {
          const result = await window.api.git.restoreStaged(projectPath, filepaths)
          if (!result.success) {
            set({ error: result.error || '撤销暂存失败' })
          }
          return result.success
        })
      } catch (error) {
        set({ error: String(error) })
        return false
      }
    },

    restore: async (filepaths: string[], source?: string) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      try {
        return await runOperation(Operations.Restore, async () => {
          const result = await window.api.git.restore(projectPath, filepaths, source)
          if (!result.success) {
            set({ error: result.error || '恢复失败' })
          }
          return result.success
        })
      } catch (error) {
        set({ error: String(error) })
        return false
      }
    },

    getDiff: async (filepath: string, staged: boolean = false) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return null

      try {
        return await runOperation(Operations.Diff, async () => {
          const result = await window.api.git.diff(projectPath, filepath, staged)
          if (result.success && result.data) {
            set({ currentDiff: result.data })
            return result.data
          } else {
            set({ error: result.error || '获取差异失败' })
            return null
          }
        })
      } catch (error) {
        set({ error: String(error) })
        return null
      }
    },

    selectFile: async (file: GitFileChange | null) => {
      set({ selectedFile: file })
      if (!file) {
        set({ currentDiff: null })
        return
      }

      if (file.path.endsWith('.novel')) {
        try {
          const projectPath = useProjectStore.getState().currentProjectPath
          if (!projectPath) return

          const workingContent = await window.api.file.read(file.path)
          const headResult = await window.api.git.showFile(projectPath, file.path, 'HEAD')
          const headContent = headResult.success ? (headResult.data as string) : ''

          const fileName = file.path.split('/').pop() || file.path
          useEditorStore.getState().openNovelDiff(file.path, fileName, headContent, workingContent)
        } catch (e) {
          console.error('打开 novel diff 失败:', e)
          get().getDiff(file.path, file.staged)
        }
      } else {
        get().getDiff(file.path, file.staged)
      }
    },

    getBranches: async () => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return

      try {
        const result = await window.api.git.branchList(projectPath)
        if (result.success && result.data) {
          set({ branches: result.data })
        }
      } catch (error) {
        set({ error: String(error) })
      }
    },

    createBranch: async (name: string, startPoint?: string) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      try {
        return await runOperation(Operations.Branch, async () => {
          const result = await window.api.git.branchCreate(projectPath, name, startPoint)
          if (result.success) {
            await get().getBranches()
            return true
          } else {
            set({ error: result.error || '创建分支失败' })
            return false
          }
        })
      } catch (error) {
        set({ error: String(error) })
        return false
      }
    },

    deleteBranch: async (name: string, force?: boolean) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      try {
        const result = await window.api.git.branchDelete(projectPath, name, force)
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

    checkout: async (options: GitCheckoutOptions) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      set({ loading: true, error: null })

      try {
        return await runOperation(Operations.Checkout, async () => {
          const result = await window.api.git.checkout(projectPath, options)
          if (result.success) {
            await get().getBranches()
            await get().getLog()
            set({ loading: false })
            return true
          } else {
            set({ error: result.error || '切换分支失败', loading: false })
            return false
          }
        })
      } catch (error) {
        set({ error: String(error), loading: false })
        return false
      }
    },

    merge: async (options: GitMergeOptions) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return false

      set({ loading: true, error: null })

      try {
        return await runOperation(Operations.Merge, async () => {
          const result = await window.api.git.merge(projectPath, options)
          if (result.success) {
            await get().getLog()
            set({ loading: false })
            return true
          } else {
            set({ error: result.error || '合并失败', loading: false })
            return false
          }
        })
      } catch (error) {
        set({ error: String(error), loading: false })
        return false
      }
    },

    setMode: async (mode: GitMode) => {
      try {
        const result = await window.api.git.setMode(mode)
        if (result.success) {
          const modeResult = await window.api.git.getMode()
          if (modeResult) {
            set({ mode: modeResult.mode, useSystemGit: modeResult.useSystemGit })
          }
        }
      } catch (error) {
        set({ error: String(error) })
      }
    },

    startAutoCommit: () => {
      const { autoCommitTimer, autoCommitInterval } = get()

      if (autoCommitTimer) {
        clearInterval(autoCommitTimer)
      }

      const timer = setInterval(
        async () => {
          const repository = get().repository
          if (repository && (repository.hasChanges || repository.hasStagedChanges)) {
            await get().addAll()
            const now = new Date()
            const message = `自动保存 - ${now.toLocaleString('zh-CN')}`
            await get().commit({ message, all: true })
          }
        },
        autoCommitInterval * 60 * 1000
      )

      set({ autoCommitTimer: timer, autoCommitEnabled: true })
    },

    stopAutoCommit: () => {
      const { autoCommitTimer } = get()
      if (autoCommitTimer) {
        clearInterval(autoCommitTimer)
      }
      set({ autoCommitTimer: null, autoCommitEnabled: false })
    },

    setAutoCommitConfig: (enabled: boolean, interval: number) => {
      set({ autoCommitEnabled: enabled, autoCommitInterval: interval })

      if (enabled) {
        get().startAutoCommit()
      } else {
        get().stopAutoCommit()
      }
    },

    getCommitDetail: async (commit: GitCommit) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return

      set({ commitDetail: { commit, files: [], loading: true } })

      try {
        const result = await window.api.git.getCommitFiles(projectPath, commit.hash)
        if (result.success && result.data) {
          set({ commitDetail: { commit, files: result.data, loading: false } })
        } else {
          set({
            commitDetail: { commit, files: [], loading: false },
            error: result.error || '获取提交详情失败'
          })
        }
      } catch (error) {
        set({ commitDetail: { commit, files: [], loading: false }, error: String(error) })
      }
    },

    getCommitFileDiff: async (commitHash: string, filepath: string) => {
      const projectPath = useProjectStore.getState().currentProjectPath
      if (!projectPath) return null

      try {
        const result = await window.api.git.getCommitFileDiff(
          projectPath,
          commitHash,
          filepath
        )
        if (result.success && result.data) {
          set({ currentDiff: result.data })
          return result.data
        } else {
          set({ error: result.error || '获取文件差异失败' })
          return null
        }
      } catch (error) {
        set({ error: String(error) })
        return null
      }
    },

    clearCommitDetail: () => {
      set({ commitDetail: null, currentDiff: null })
    },

    dispose: () => {
      const { autoCommitTimer } = get()
      if (autoCommitTimer) {
        clearInterval(autoCommitTimer)
      }
      currentCts.cancel()
      debouncedRefresh.cancel()
      set({
        initialized: false,
        isRepo: false,
        loading: false,
        error: null,
        repository: null,
        branches: [],
        commits: [],
        currentBranch: null,
        currentDiff: null,
        selectedFile: null,
        commitDetail: null,
        autoCommitTimer: null,
        autoCommitEnabled: false,
        operationsRunning: false
      })
      useFileTreeStore.getState().updateGitStatus([])
    }
  }
})

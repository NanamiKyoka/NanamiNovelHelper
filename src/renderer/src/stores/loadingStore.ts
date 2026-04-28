/**
 * 全局加载状态管理
 *
 * 统一管理应用中各模块的加载状态，支持：
 * - 多模块并行加载
 * - 加载进度追踪
 * - 全局加载遮罩
 */

import { create } from 'zustand'

/** 加载模块标识 */
export type LoadingModule =
  | 'project' // 项目
  | 'vocabulary' // 词汇
  | 'sensitive' // 敏感词
  | 'relationship' // 关系图
  | 'timeline' // 时间线
  | 'sequenceChart' // 事序图
  | 'organization' // 组织架构
  | 'map' // 地图
  | 'fileTree' // 文件树
  | 'highlight' // 高亮配置
  | 'settings' // 设置
  | 'git' // Git
  | 'ai' // AI 助手
  | 'terminal' // 终端
  | string // 支持自定义模块

/** 加载任务 */
export interface LoadingTask {
  id: string
  module: LoadingModule
  message?: string
  startTime: number
}

/** 加载状态 */
interface LoadingState {
  /** 当前加载中的任务 */
  tasks: Map<string, LoadingTask>
  /** 全局加载消息（覆盖所有模块） */
  globalMessage: string | null
  /** 是否显示全局遮罩 */
  showGlobalOverlay: boolean

  // Actions
  /** 开始加载 */
  startLoading: (id: string, module: LoadingModule, message?: string) => void
  /** 结束加载 */
  endLoading: (id: string) => void
  /** 设置全局消息 */
  setGlobalMessage: (message: string | null) => void
  /** 设置是否显示全局遮罩 */
  setShowGlobalOverlay: (show: boolean) => void
  /** 清除所有加载状态 */
  clearAll: () => void
  /** 检查模块是否加载中 */
  isModuleLoading: (module: LoadingModule) => boolean
  /** 检查是否有任何加载中 */
  isLoading: () => boolean
  /** 获取加载进度（已完成的模块数/总模块数） */
  getProgress: (modules: LoadingModule[]) => { completed: number; total: number }
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  tasks: new Map(),
  globalMessage: null,
  showGlobalOverlay: false,

  startLoading: (id, module, message) => {
    set(state => {
      const newTasks = new Map(state.tasks)
      newTasks.set(id, {
        id,
        module,
        message,
        startTime: Date.now()
      })
      return { tasks: newTasks }
    })
  },

  endLoading: id => {
    set(state => {
      const newTasks = new Map(state.tasks)
      newTasks.delete(id)
      return { tasks: newTasks }
    })
  },

  setGlobalMessage: message => {
    set({ globalMessage: message })
  },

  setShowGlobalOverlay: show => {
    set({ showGlobalOverlay: show })
  },

  clearAll: () => {
    set({ tasks: new Map(), globalMessage: null })
  },

  isModuleLoading: module => {
    const { tasks } = get()
    for (const task of tasks.values()) {
      if (task.module === module) return true
    }
    return false
  },

  isLoading: () => {
    return get().tasks.size > 0
  },

  getProgress: modules => {
    const { tasks } = get()
    const loadingModules = new Set<LoadingModule>()
    for (const task of tasks.values()) {
      loadingModules.add(task.module)
    }

    const completed = modules.filter(m => !loadingModules.has(m)).length
    return { completed, total: modules.length }
  }
}))

/**
 * 加载状态钩子
 * 简化组件中的使用
 */
export function useLoading() {
  const startLoading = useLoadingStore(s => s.startLoading)
  const endLoading = useLoadingStore(s => s.endLoading)
  const setGlobalMessage = useLoadingStore(s => s.setGlobalMessage)
  const setShowGlobalOverlay = useLoadingStore(s => s.setShowGlobalOverlay)
  const isModuleLoading = useLoadingStore(s => s.isModuleLoading)
  const isLoading = useLoadingStore(s => s.isLoading)

  return {
    startLoading,
    endLoading,
    setGlobalMessage,
    setShowGlobalOverlay,
    isModuleLoading,
    isLoading
  }
}

/**
 * 加载任务包装器
 * 自动管理加载状态
 *
 * @example
 * const withLoading = useLoadingTask()
 * await withLoading('project-init', 'project', async () => {
 *   await loadProject()
 * }, '加载项目中...')
 */
export function useLoadingTask() {
  const startLoading = useLoadingStore(s => s.startLoading)
  const endLoading = useLoadingStore(s => s.endLoading)

  return async <T>(
    id: string,
    module: LoadingModule,
    task: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    startLoading(id, module, message)
    try {
      const result = await task()
      return result
    } finally {
      endLoading(id)
    }
  }
}

/**
 * 选择器：获取所有加载中的模块
 */
export function useLoadingModules(): LoadingModule[] {
  const tasks = useLoadingStore(s => s.tasks)
  const modules = new Set<LoadingModule>()
  for (const task of tasks.values()) {
    modules.add(task.module)
  }
  return Array.from(modules)
}

/**
 * 选择器：获取加载状态摘要
 */
export function useLoadingSummary() {
  const tasks = useLoadingStore(s => s.tasks)
  const globalMessage = useLoadingStore(s => s.globalMessage)
  const showGlobalOverlay = useLoadingStore(s => s.showGlobalOverlay)

  const taskList = Array.from(tasks.values())
  const hasLoading = taskList.length > 0

  // 获取最新的加载消息
  const latestTask =
    taskList.length > 0
      ? taskList.reduce((latest, current) =>
          current.startTime > latest.startTime ? current : latest
        )
      : null

  return {
    isLoading: hasLoading,
    taskCount: taskList.length,
    latestMessage: globalMessage || latestTask?.message || null,
    latestModule: latestTask?.module || null,
    showGlobalOverlay,
    tasks: taskList
  }
}

export default useLoadingStore

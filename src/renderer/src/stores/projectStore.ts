/**
 * 项目状态管理
 *
 * 注意：createProject、openProject、closeProject 方法仅管理项目自身的状态
 * 跨 Store 的协调操作（如初始化 settingsStore）应由 useProjectActions hook 处理
 * 组件应优先使用 useProjectActions hook
 */

import { create } from 'zustand'
import { createErrorHandler } from '@utils/error'
import type { Project, RecentProject, CreateProjectOptions } from '@shared/project'

// 创建带前缀的错误处理器
const handleError = createErrorHandler('[ProjectStore]')

interface ProjectState {
  // 状态
  currentProject: Project | null
  recentProjects: RecentProject[]
  isLoading: boolean
  error: string | null

  // Actions
  createProject: (options: CreateProjectOptions) => Promise<Project>
  openProject: (path: string) => Promise<Project>
  closeProject: () => Promise<void>
  updateProjectInfo: (info: Partial<Project>) => Promise<void>
  loadRecentProjects: () => Promise<void>
  removeRecentProject: (path: string) => Promise<void>
  clearRecentProjects: () => Promise<void>
  showOpenDialog: () => Promise<string | null>
  showCreateDialog: () => Promise<string | null>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  // 批量设置方法（用于聚合接口）
  setCurrentProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  // 初始状态
  currentProject: null,
  recentProjects: [],
  isLoading: false,
  error: null,

  // 创建项目
  createProject: async (options: CreateProjectOptions) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.api.project.create(options)
      const openedProject = await window.api.project.open(project.path)
      set({ currentProject: openedProject, isLoading: false })
      get().loadRecentProjects()
      return openedProject
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '创建项目失败' })
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 打开项目
  openProject: async (path: string) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.api.project.open(path)
      set({ currentProject: project, isLoading: false })
      get().loadRecentProjects()
      return project
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '打开项目失败' })
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 关闭项目
  closeProject: async () => {
    set({ isLoading: true, error: null })
    try {
      await window.api.project.close()
      set({ currentProject: null, isLoading: false })
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '关闭项目失败' })
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 更新项目信息
  updateProjectInfo: async (info: Partial<Project>) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.api.project.updateInfo(info)
      set({ currentProject: project, isLoading: false })
      get().loadRecentProjects()
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '更新项目信息失败' })
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 加载最近项目列表
  loadRecentProjects: async () => {
    try {
      const recent = await window.api.project.getRecent()
      set({ recentProjects: recent })
    } catch (error) {
      handleError(error, { fallbackMessage: '加载最近项目失败' })
    }
  },

  // 从最近项目列表移除
  removeRecentProject: async (path: string) => {
    try {
      await window.api.project.removeRecent(path)
      const recent = await window.api.project.getRecent()
      set({ recentProjects: recent })
    } catch (error) {
      handleError(error, { fallbackMessage: '移除最近项目失败' })
    }
  },

  // 清空最近项目列表
  clearRecentProjects: async () => {
    try {
      await window.api.project.clearRecent()
      set({ recentProjects: [] })
    } catch (error) {
      handleError(error, { fallbackMessage: '清空最近项目失败' })
    }
  },

  // 显示打开项目对话框
  showOpenDialog: async () => {
    return window.api.project.showOpenDialog()
  },

  // 显示创建项目对话框
  showCreateDialog: async () => {
    return window.api.project.showCreateDialog()
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  // 设置错误信息
  setError: (error: string | null) => {
    set({ error })
  },

  // 清除错误信息
  clearError: () => {
    set({ error: null })
  },

  // 批量设置当前项目（用于聚合接口）
  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project, isLoading: false, error: null })
  }
}))

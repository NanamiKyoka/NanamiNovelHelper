/**
 * 项目状态管理
 */

import { create } from 'zustand'
import type { Project, RecentProject, CreateProjectOptions } from '../types/project'
import { useSettingsStore } from './settingsStore'

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
      const project = await window.electron.project.create(options)
      
      // 创建后自动打开项目
      const openedProject = await window.electron.project.open(project.path)
      set({ 
        currentProject: openedProject, 
        isLoading: false 
      })
      
      // 初始化项目设置
      await useSettingsStore.getState().initProjectSettings()
      
      // 刷新最近项目列表
      get().loadRecentProjects()
      
      return openedProject
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 打开项目
  openProject: async (path: string) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.electron.project.open(path)
      set({ 
        currentProject: project, 
        isLoading: false 
      })
      
      // 初始化项目设置
      await useSettingsStore.getState().initProjectSettings()
      
      // 刷新最近项目列表
      get().loadRecentProjects()
      
      return project
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '打开项目失败'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 关闭项目
  closeProject: async () => {
    set({ isLoading: true, error: null })
    try {
      await window.electron.project.close()
      
      // 清除项目设置
      useSettingsStore.getState().clearProjectSettings()
      
      set({ 
        currentProject: null, 
        isLoading: false 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '关闭项目失败'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 更新项目信息
  updateProjectInfo: async (info: Partial<Project>) => {
    set({ isLoading: true, error: null })
    try {
      const project = await window.electron.project.updateInfo(info)
      set({ 
        currentProject: project, 
        isLoading: false 
      })
      
      // 刷新最近项目列表
      get().loadRecentProjects()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新项目信息失败'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // 加载最近项目列表
  loadRecentProjects: async () => {
    try {
      const recent = await window.electron.project.getRecent()
      set({ recentProjects: recent })
    } catch (error) {
      console.error('Failed to load recent projects:', error)
    }
  },

  // 从最近项目列表移除
  removeRecentProject: async (path: string) => {
    try {
      await window.electron.project.removeRecent(path)
      const recent = await window.electron.project.getRecent()
      set({ recentProjects: recent })
    } catch (error) {
      console.error('Failed to remove recent project:', error)
    }
  },

  // 清空最近项目列表
  clearRecentProjects: async () => {
    try {
      await window.electron.project.clearRecent()
      set({ recentProjects: [] })
    } catch (error) {
      console.error('Failed to clear recent projects:', error)
    }
  },

  // 显示打开项目对话框
  showOpenDialog: async () => {
    return window.electron.project.showOpenDialog()
  },

  // 显示创建项目对话框
  showCreateDialog: async () => {
    return window.electron.project.showCreateDialog()
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
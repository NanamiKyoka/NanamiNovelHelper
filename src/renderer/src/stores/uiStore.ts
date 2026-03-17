/**
 * UI 状态管理
 */

import { create } from 'zustand'

interface UIState {
  // 对话框状态
  createProjectModalOpen: boolean
  openProjectModalOpen: boolean

  // 编辑器选中文字（用于词汇查询）
  selectedText: string

  // Actions
  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  openOpenProjectModal: () => void
  closeOpenProjectModal: () => void
  setSelectedText: (text: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  // 初始状态
  createProjectModalOpen: false,
  openProjectModalOpen: false,
  selectedText: '',

  // Actions
  openCreateProjectModal: () => set({ createProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
  openOpenProjectModal: () => set({ openProjectModalOpen: true }),
  closeOpenProjectModal: () => set({ openProjectModalOpen: false }),
  setSelectedText: (text: string) => set({ selectedText: text })
}))

/**
 * UI 状态管理
 */

import { create } from 'zustand'

/** 全屏编辑模式类型 */
export type FullscreenMode = 
  | 'vocabulary'
  | 'sensitive'
  | 'relationship'
  | 'organization'
  | 'timeline'
  | 'sequenceChart'
  | null

interface UIState {
  createProjectModalOpen: boolean
  openProjectModalOpen: boolean
  selectedText: string // 编辑器选中文字，用于词汇查询
  fullscreenMode: FullscreenMode // 全屏模式时隐藏菜单栏

  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  openOpenProjectModal: () => void
  closeOpenProjectModal: () => void
  setSelectedText: (text: string) => void
  setFullscreenMode: (mode: FullscreenMode) => void
  exitFullscreen: () => void
}

export const useUIStore = create<UIState>((set) => ({
  createProjectModalOpen: false,
  openProjectModalOpen: false,
  selectedText: '',
  fullscreenMode: null,

  openCreateProjectModal: () => set({ createProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
  openOpenProjectModal: () => set({ openProjectModalOpen: true }),
  closeOpenProjectModal: () => set({ openProjectModalOpen: false }),
  setSelectedText: (text: string) => set({ selectedText: text }),
  setFullscreenMode: (mode: FullscreenMode) => set({ fullscreenMode: mode }),
  exitFullscreen: () => set({ fullscreenMode: null })
}))
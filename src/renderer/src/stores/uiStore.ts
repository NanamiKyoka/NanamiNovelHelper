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
  | 'map'
  | null

interface UIState {
  createProjectModalOpen: boolean
  openProjectModalOpen: boolean
  selectedText: string // 编辑器选中文字，用于词汇查询
  fullscreenMode: FullscreenMode // 全屏模式时隐藏菜单栏
  aboutModalOpen: boolean // 关于对话框
  focusMode: boolean // 专注模式
  outlineVisible: boolean // 大纲视图可见性
  charCountVisible: boolean // 字符统计可见性
  searchReplaceVisible: boolean // 查找替换面板可见性
  writingGoalPanelVisible: boolean // 写作目标面板可见性

  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  openOpenProjectModal: () => void
  closeOpenProjectModal: () => void
  setSelectedText: (text: string) => void
  setFullscreenMode: (mode: FullscreenMode) => void
  exitFullscreen: () => void
  openAboutModal: () => void
  closeAboutModal: () => void
  toggleFocusMode: () => void
  setFocusMode: (enabled: boolean) => void
  toggleOutline: () => void
  setOutlineVisible: (visible: boolean) => void
  toggleCharCount: () => void
  setCharCountVisible: (visible: boolean) => void
  toggleSearchReplace: () => void
  setSearchReplaceVisible: (visible: boolean) => void
}

export const useUIStore = create<UIState>(set => ({
  createProjectModalOpen: false,
  openProjectModalOpen: false,
  selectedText: '',
  fullscreenMode: null,
  aboutModalOpen: false,
  focusMode: false,
  outlineVisible: true,
  charCountVisible: true,
  searchReplaceVisible: false,

  openCreateProjectModal: () => set({ createProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
  openOpenProjectModal: () => set({ openProjectModalOpen: true }),
  closeOpenProjectModal: () => set({ openProjectModalOpen: false }),
  setSelectedText: (text: string) => set({ selectedText: text }),
  setFullscreenMode: (mode: FullscreenMode) => set({ fullscreenMode: mode }),
  exitFullscreen: () => set({ fullscreenMode: null }),
  openAboutModal: () => set({ aboutModalOpen: true }),
  closeAboutModal: () => set({ aboutModalOpen: false }),
  toggleFocusMode: () => set(state => ({ focusMode: !state.focusMode })),
  setFocusMode: (enabled: boolean) => set({ focusMode: enabled }),
  toggleOutline: () => set(state => ({ outlineVisible: !state.outlineVisible })),
  setOutlineVisible: (visible: boolean) => set({ outlineVisible: visible }),
  toggleCharCount: () => set(state => ({ charCountVisible: !state.charCountVisible })),
  setCharCountVisible: (visible: boolean) => set({ charCountVisible: visible }),
  toggleSearchReplace: () => set(state => ({ searchReplaceVisible: !state.searchReplaceVisible })),
  setSearchReplaceVisible: (visible: boolean) => set({ searchReplaceVisible: visible }),
  toggleWritingGoalPanel: () => set(state => ({ writingGoalPanelVisible: !state.writingGoalPanelVisible })),
  setWritingGoalPanelVisible: (visible: boolean) => set({ writingGoalPanelVisible: visible })
}))

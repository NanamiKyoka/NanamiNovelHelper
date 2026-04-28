/**
 * 终端状态管理
 */

import { create } from 'zustand'
import { useProjectStore } from './projectStore'

interface TerminalInstance {
  id: string
  name: string
  pid: number
  cwd: string
  exited: boolean
  exitCode?: number
}

interface ShellInfo {
  name: string
  path: string
  isDefault?: boolean
}

interface TerminalState {
  // 状态
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  availableShells: ShellInfo[]
  isPanelVisible: boolean
  isLoading: boolean
  error: string | null

  // Actions
  createTerminal: (options?: {
    cwd?: string
    name?: string
    shellPath?: string
  }) => Promise<TerminalInstance | null>
  destroyTerminal: (id: string) => Promise<void>
  setActiveTerminal: (id: string | null) => void
  togglePanel: () => void
  setPanelVisible: (visible: boolean) => void
  loadAvailableShells: () => Promise<void>
  clearTerminal: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// 获取当前项目路径的辅助函数
const getCurrentProjectPath = (): string | undefined => {
  return useProjectStore.getState().currentProject?.path
}

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  // 初始状态
  terminals: [],
  activeTerminalId: null,
  availableShells: [],
  isPanelVisible: false,
  isLoading: false,
  error: null,

  // 创建终端
  createTerminal: async (options?: { cwd?: string; name?: string; shellPath?: string }) => {
    set({ isLoading: true, error: null })
    try {
      // 如果没有指定 cwd，使用当前项目路径
      const cwd = options?.cwd ?? getCurrentProjectPath()

      const terminal = await window.electron.terminal.create({
        cwd,
        name: options?.name,
        shellPath: options?.shellPath
      })

      set(state => ({
        terminals: [...state.terminals, terminal],
        activeTerminalId: terminal.id,
        isPanelVisible: true,
        isLoading: false
      }))

      return terminal
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建终端失败'
      set({ error: errorMessage, isLoading: false })
      return null
    }
  },

  // 销毁终端
  destroyTerminal: async (id: string) => {
    try {
      await window.electron.terminal.destroy(id)
      set(state => {
        const newTerminals = state.terminals.filter(t => t.id !== id)
        const newActiveId =
          state.activeTerminalId === id
            ? newTerminals.length > 0
              ? newTerminals[0].id
              : null
            : state.activeTerminalId

        return {
          terminals: newTerminals,
          activeTerminalId: newActiveId,
          isPanelVisible: newTerminals.length > 0 ? state.isPanelVisible : false
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '销毁终端失败'
      set({ error: errorMessage })
    }
  },

  // 设置活动终端
  setActiveTerminal: (id: string | null) => {
    set({ activeTerminalId: id })
  },

  // 切换面板显示
  togglePanel: () => {
    const state = get()
    // 如果要显示面板但没有终端，先创建一个
    if (!state.isPanelVisible && state.terminals.length === 0) {
      // 使用当前项目路径创建终端
      const cwd = getCurrentProjectPath()
      get().createTerminal({ cwd })
    } else {
      set({ isPanelVisible: !state.isPanelVisible })
    }
  },

  // 设置面板可见性
  setPanelVisible: (visible: boolean) => {
    const state = get()
    if (visible && state.terminals.length === 0) {
      const cwd = getCurrentProjectPath()
      get().createTerminal({ cwd })
    }
    set({ isPanelVisible: visible })
  },

  // 设置面板高度
  setPanelHeight: (height: number) => {
    // 限制高度范围
    const minHeight = 100
    const maxHeight = 600
    const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight)
    set({ panelHeight: clampedHeight })
  },

  // 加载可用 Shell
  loadAvailableShells: async () => {
    try {
      const shells = await window.electron.terminal.getShells()
      set({ availableShells: shells })
    } catch (error) {
      console.error('加载 Shell 列表失败:', error)
    }
  },

  // 清空终端（退出码）
  clearTerminal: () => {
    set(state => {
      const activeTerminal = state.terminals.find(t => t.id === state.activeTerminalId)
      if (activeTerminal) {
        // 标记为已退出
        return {
          terminals: state.terminals.map(t =>
            t.id === state.activeTerminalId ? { ...t, exited: true } : t
          )
        }
      }
      return state
    })
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  // 设置错误
  setError: (error: string | null) => {
    set({ error })
  }
}))

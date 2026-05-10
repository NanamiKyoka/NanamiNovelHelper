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
  terminals: TerminalInstance[]
  activeTerminalId: string | null
  availableShells: ShellInfo[]
  isPanelVisible: boolean
  isLoading: boolean
  error: string | null

  createTerminal: (options?: {
    cwd?: string
    name?: string
    shellPath?: string
  }) => Promise<TerminalInstance | null>
  destroyTerminal: (id: string) => Promise<void>
  renameTerminal: (id: string, name: string) => Promise<void>
  setActiveTerminal: (id: string | null) => void
  togglePanel: () => void
  setPanelVisible: (visible: boolean) => void
  loadAvailableShells: () => Promise<void>
  clearTerminal: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const getCurrentProjectPath = (): string | undefined => {
  return useProjectStore.getState().currentProject?.path
}

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  terminals: [],
  activeTerminalId: null,
  availableShells: [],
  isPanelVisible: false,
  isLoading: false,
  error: null,

  createTerminal: async (options?: { cwd?: string; name?: string; shellPath?: string }) => {
    set({ isLoading: true, error: null })
    try {
      const cwd = options?.cwd ?? getCurrentProjectPath()
      const terminal = await window.api.terminal.create({
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

  destroyTerminal: async (id: string) => {
    try {
      await window.api.terminal.destroy(id)
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

  renameTerminal: async (id: string, name: string) => {
    try {
      await window.api.terminal.rename(id, name)
      set(state => ({
        terminals: state.terminals.map(t =>
          t.id === id ? { ...t, name } : t
        )
      }))
    } catch (_error) {
      // 重命名失败
    }
  },

  setActiveTerminal: (id: string | null) => {
    set({ activeTerminalId: id })
  },

  togglePanel: () => {
    const state = get()
    if (!state.isPanelVisible && state.terminals.length === 0) {
      const cwd = getCurrentProjectPath()
      get().createTerminal({ cwd })
    } else {
      set({ isPanelVisible: !state.isPanelVisible })
    }
  },

  setPanelVisible: (visible: boolean) => {
    const state = get()
    if (visible && state.terminals.length === 0) {
      const cwd = getCurrentProjectPath()
      get().createTerminal({ cwd })
    }
    set({ isPanelVisible: visible })
  },

  setPanelHeight: (height: number) => {
    const minHeight = 100
    const maxHeight = 600
    const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight)
    set({ panelHeight: clampedHeight })
  },

  loadAvailableShells: async () => {
    const state = get()
    if (state.availableShells.length > 0) return

    try {
      const shells = await window.api.terminal.getShells()
      set({ availableShells: shells })
    } catch (_error) {
      // Shell列表加载失败不影响终端使用
    }
  },

  clearTerminal: () => {
    set(state => {
      const activeTerminal = state.terminals.find(t => t.id === state.activeTerminalId)
      if (activeTerminal) {
        return {
          terminals: state.terminals.map(t =>
            t.id === state.activeTerminalId ? { ...t, exited: true } : t
          )
        }
      }
      return state
    })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  }
}))

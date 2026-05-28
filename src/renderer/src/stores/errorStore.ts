/**
 * 全局错误状态管理
 *
 * 管理应用全局错误信息，支持：
 * - 致命错误记录（导致应用崩溃的错误）
 * - 模块级错误状态追踪
 * - 错误历史记录
 */

import { create } from 'zustand'
import type { ErrorCode } from '@shared/errors'

export interface AppErrorRecord {
  /** 唯一标识 */
  id: string
  /** 错误码 */
  code: ErrorCode
  /** 错误消息 */
  message: string
  /** 发生时间 */
  timestamp: number
  /** 发生模块 */
  module: string
  /** 严重程度 */
  severity: 'fatal' | 'error' | 'warning'
  /** 是否可恢复 */
  recoverable: boolean
  /** 恢复建议 */
  suggestion?: string
  /** 错误来源 */
  source: 'runtime' | 'ipc' | 'unhandled' | 'module'
  /** 是否已读 */
  read: boolean
}

interface ErrorState {
  /** 致命错误（导致应用无法继续运行） */
  fatalError: AppErrorRecord | null

  /** 模块错误状态 */
  moduleErrors: Record<string, string | null>

  /** 最近错误历史（最多 50 条） */
  errorHistory: AppErrorRecord[]

  /** 未读错误数 */
  unreadCount: number

  setFatalError: (error: AppErrorRecord | null) => void
  clearFatalError: () => void

  setModuleError: (module: string, error: string | null) => void
  clearModuleError: (module: string) => void

  addErrorHistory: (record: AppErrorRecord) => void
  clearErrorHistory: () => void

  markAllRead: () => void

  reset: () => void
}

const MAX_HISTORY = 50
export const useErrorStore = create<ErrorState>((set, get) => ({
  fatalError: null,
  moduleErrors: {},
  errorHistory: [],
  unreadCount: 0,

  setFatalError: (error) => {
    set({
      fatalError: error,
      errorHistory: error
        ? [error, ...get().errorHistory].slice(0, MAX_HISTORY)
        : get().errorHistory,
      unreadCount: error ? get().unreadCount + 1 : get().unreadCount
    })
  },

  clearFatalError: () => {
    set({ fatalError: null })
  },

  setModuleError: (module, error) => {
    set(state => ({
      moduleErrors: { ...state.moduleErrors, [module]: error }
    }))
  },

  clearModuleError: (module) => {
    set(state => {
      const next = { ...state.moduleErrors }
      delete next[module]
      return { moduleErrors: next }
    })
  },

  addErrorHistory: (record) => {
    set(state => ({
      errorHistory: [record, ...state.errorHistory].slice(0, MAX_HISTORY),
      unreadCount: state.unreadCount + 1
    }))
  },

  clearErrorHistory: () => {
    set({ errorHistory: [], unreadCount: 0 })
  },

  markAllRead: () => {
    set(state => ({
      errorHistory: state.errorHistory.map(e => ({ ...e, read: true })),
      unreadCount: 0
    }))
  },

  reset: () => {
    set({
      fatalError: null,
      moduleErrors: {},
      errorHistory: [],
      unreadCount: 0
    })
  }
}))
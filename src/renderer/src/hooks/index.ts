// Hooks 统一导出

// 项目相关
export { useProjectActions } from './useProjectActions'

/**
 * @deprecated useProjectInit 已废弃，请使用 useProjectActions 替代
 * useProjectActions 包含了所有项目初始化功能，更加完整
 */
export { useProjectInit } from './useProjectInit'

// 编辑器相关
export { useEditorExtensions } from './useEditorExtensions'
export { useMarkdownExtensions } from './useMarkdownExtensions'
export { useHoverCard } from './useHoverCard'

// 错误处理
export { useErrorHandling, useModuleErrorHandler } from './useErrorHandling'
export type { ErrorHandlerOptions, ErrorDetail, ErrorCategory, ErrorSeverity } from './useErrorHandling'

// 快捷键
export { 
  useShortcuts, 
  useShortcut, 
  registerShortcut, 
  registerShortcuts,
  checkShortcutConflict,
  getRegisteredShortcuts,
  formatShortcut
} from './useShortcuts'
export type { ShortcutConfig } from './useShortcuts'

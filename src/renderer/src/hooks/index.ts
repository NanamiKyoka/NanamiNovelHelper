// Hooks 统一导出

// 项目相关
export { useProjectActions } from './useProjectActions'

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

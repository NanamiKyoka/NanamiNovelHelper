/**
 * 统一错误处理 Hook
 *
 * 提供一致的错误处理机制，支持：
 * - 错误分类（网络、文件、权限、数据等）
 * - 自动恢复建议
 * - 错误日志记录
 * - 统一通知展示
 */

import { useCallback, useMemo } from 'react'
import { notification, message } from 'antd'
import { AppError, AppErrorCode, extractErrorMessage } from '@utils/error'

/** 错误分类 */
export type ErrorCategory =
  | 'network' // 网络错误
  | 'file' // 文件操作错误
  | 'permission' // 权限错误
  | 'data' // 数据错误
  | 'validation' // 验证错误
  | 'git' // Git 操作错误
  | 'ai' // AI 服务错误
  | 'unknown' // 未知错误

/** 错误严重程度 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/** 错误处理选项 */
export interface ErrorHandlerOptions {
  /** 是否显示通知 */
  showNotification?: boolean
  /** 通知类型：message（轻量）或 notification（详细） */
  notificationType?: 'message' | 'notification'
  /** 是否记录日志 */
  log?: boolean
  /** 日志前缀 */
  logPrefix?: string
  /** 默认错误消息 */
  fallbackMessage?: string
  /** 是否重新抛出错误 */
  rethrow?: boolean
  /** 自定义恢复操作 */
  recoveryAction?: {
    label: string
    onClick: () => void
  }
  /** 错误分类（自动检测如果未指定） */
  category?: ErrorCategory
  /** 错误严重程度 */
  severity?: ErrorSeverity
}

/** 错误详情 */
export interface ErrorDetail {
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  recoverable: boolean
  suggestion?: string
  action?: {
    label: string
    onClick: () => void
  }
}

/** 错误分类映射 */
const CATEGORY_PATTERNS: Array<{
  category: ErrorCategory
  patterns: RegExp[]
  severity: ErrorSeverity
}> = [
  {
    category: 'network',
    patterns: [/network/i, /fetch/i, /timeout/i, /ECONNREFUSED/i, /ENOTFOUND/i, /ETIMEDOUT/i],
    severity: 'medium'
  },
  {
    category: 'file',
    patterns: [
      /ENOENT/i,
      /file not found/i,
      /文件.*不存在/i,
      /EISDIR/i,
      /ENOTDIR/i,
      /file read/i,
      /file write/i,
      /读取文件/i,
      /写入文件/i
    ],
    severity: 'medium'
  },
  {
    category: 'permission',
    patterns: [/EACCES/i, /EPERM/i, /permission/i, /权限/i, /access denied/i],
    severity: 'high'
  },
  {
    category: 'data',
    patterns: [/JSON/i, /parse/i, /解析/i, /invalid data/i, /数据.*无效/i, /corrupt/i],
    severity: 'medium'
  },
  {
    category: 'validation',
    patterns: [/invalid/i, /required/i, /必填/i, /格式.*错误/i, /参数.*无效/i],
    severity: 'low'
  },
  {
    category: 'git',
    patterns: [/git/i, /repository/i, /branch/i, /merge/i, /conflict/i],
    severity: 'medium'
  },
  {
    category: 'ai',
    patterns: [/AI/i, /API/i, /model/i, /token/i, /rate limit/i, /quota/i],
    severity: 'medium'
  }
]

/** 分类恢复建议 */
const RECOVERY_SUGGESTIONS: Record<ErrorCategory, string> = {
  network: '请检查网络连接后重试',
  file: '文件可能被占用或已移动，请检查后重试',
  permission: '请检查文件权限或以管理员身份运行',
  data: '数据可能已损坏，请尝试重新加载或恢复备份',
  validation: '请检查输入内容是否符合要求',
  git: '请检查 Git 是否正确安装，或在终端中手动操作',
  ai: '请检查 API 配置或稍后重试',
  unknown: '请尝试重新操作或重启应用'
}

/**
 * 检测错误分类
 */
function detectCategory(error: unknown): ErrorCategory {
  if (error instanceof AppError) {
    // 根据错误代码映射分类
    const codeCategoryMap: Partial<Record<AppErrorCode, ErrorCategory>> = {
      [AppErrorCode.FILE_NOT_FOUND]: 'file',
      [AppErrorCode.FILE_READ_FAILED]: 'file',
      [AppErrorCode.FILE_WRITE_FAILED]: 'file',
      [AppErrorCode.PROJECT_NOT_FOUND]: 'file',
      [AppErrorCode.PROJECT_OPEN_FAILED]: 'file',
      [AppErrorCode.PROJECT_CREATE_FAILED]: 'file',
      [AppErrorCode.VOCABULARY_LOAD_FAILED]: 'data',
      [AppErrorCode.VOCABULARY_SAVE_FAILED]: 'data',
      [AppErrorCode.GRAPH_LOAD_FAILED]: 'data',
      [AppErrorCode.GRAPH_SAVE_FAILED]: 'data',
      [AppErrorCode.GIT_OPERATION_FAILED]: 'git'
    }
    const mapped = codeCategoryMap[error.code]
    if (mapped) return mapped
  }

  const errorMessage = error instanceof Error ? error.message : String(error)

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some(pattern => pattern.test(errorMessage))) {
      return category
    }
  }

  return 'unknown'
}

/**
 * 检测错误严重程度
 */
function detectSeverity(error: unknown, category: ErrorCategory): ErrorSeverity {
  const categoryConfig = CATEGORY_PATTERNS.find(c => c.category === category)
  if (categoryConfig) return categoryConfig.severity

  if (error instanceof AppError) {
    const criticalCodes = [AppErrorCode.PROJECT_NOT_FOUND]
    if (criticalCodes.includes(error.code)) return 'critical'
  }

  return 'medium'
}

/**
 * 统一错误处理 Hook
 */
export function useErrorHandling() {
  /**
   * 分析错误详情
   */
  const analyzeError = useCallback((error: unknown): ErrorDetail => {
    const category = detectCategory(error)
    const severity = detectSeverity(error, category)
    const errorMessage = extractErrorMessage(error)

    const detail: ErrorDetail = {
      message: errorMessage,
      category,
      severity,
      recoverable: category !== 'unknown' || severity !== 'critical',
      suggestion: RECOVERY_SUGGESTIONS[category]
    }

    // 从 AppError 获取恢复操作
    if (error instanceof AppError) {
      const recovery = error.getRecovery()
      if (recovery.action) {
        detail.action = recovery.action
      }
    }

    return detail
  }, [])

  /**
   * 处理错误
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}): string => {
      const {
        showNotification = false,
        notificationType = 'message',
        log = true,
        logPrefix = '[Error]',
        fallbackMessage = '操作失败',
        rethrow = false,
        recoveryAction,
        category: overrideCategory,
        severity: overrideSeverity
      } = options

      // 分析错误
      const detail = analyzeError(error)
      if (overrideCategory) detail.category = overrideCategory
      if (overrideSeverity) detail.severity = overrideSeverity
      if (recoveryAction) detail.action = recoveryAction

      // 提取错误消息
      const errorMessage = extractErrorMessage(error, fallbackMessage)

      // 记录日志
      if (log) {
        const logMessage = `${logPrefix} [${detail.category}] ${errorMessage}`
        console.error(logMessage, error instanceof Error ? error : '')
      }

      // 显示通知
      if (showNotification) {
        if (notificationType === 'notification') {
          notification.error({
            message: '操作失败',
            description: (
              <div>
                <p>{errorMessage}</p>
                {detail.suggestion && (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 8 }}>
                    💡 {detail.suggestion}
                  </p>
                )}
                {detail.action && (
                  <button
                    onClick={detail.action.onClick}
                    style={{
                      marginTop: 12,
                      padding: '4px 12px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }}
                  >
                    {detail.action.label}
                  </button>
                )}
              </div>
            ),
            duration: 6
          })
        } else {
          message.error(errorMessage)
        }
      }

      // 重新抛出
      if (rethrow) {
        if (error instanceof Error) throw error
        throw new AppError(AppErrorCode.UNKNOWN_ERROR, errorMessage)
      }

      return errorMessage
    },
    [analyzeError]
  )

  /**
   * 异步操作包装器
   */
  const wrapAsync = useCallback(
    <T,>(
      operation: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<[T | null, string | null]> => {
      return operation()
        .then(data => [data, null] as [T, null])
        .catch(error => {
          const errorMessage = handleError(error, { ...options, rethrow: false })
          return [null, errorMessage] as [null, string]
        })
    },
    [handleError]
  )

  /**
   * 显示带恢复建议的错误
   */
  const showRecoverableError = useCallback(
    (error: unknown, fallbackMessage = '操作失败') => {
      const detail = analyzeError(error)
      const errorMessage = extractErrorMessage(error, fallbackMessage)

      notification.error({
        message: '操作失败',
        description: (
          <div>
            <p>{errorMessage}</p>
            {detail.suggestion && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 8 }}>
                💡 {detail.suggestion}
              </p>
            )}
            {detail.action && (
              <button
                onClick={detail.action.onClick}
                style={{
                  marginTop: 12,
                  padding: '4px 12px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {detail.action.label}
              </button>
            )}
          </div>
        ),
        duration: 8
      })
    },
    [analyzeError]
  )

  /**
   * 创建模块专用错误处理器
   */
  const createModuleHandler = useCallback(
    (moduleName: string) => {
      const prefix = `[${moduleName}]`
      return {
        handle: (error: unknown, options?: Omit<ErrorHandlerOptions, 'logPrefix'>) =>
          handleError(error, { ...options, logPrefix: prefix }),
        wrapAsync: <T,>(
          operation: () => Promise<T>,
          options?: Omit<ErrorHandlerOptions, 'logPrefix'>
        ) => wrapAsync(operation, { ...options, logPrefix: prefix }),
        showRecoverable: (error: unknown, fallbackMessage?: string) =>
          showRecoverableError(error, fallbackMessage)
      }
    },
    [handleError, wrapAsync, showRecoverableError]
  )

  return useMemo(
    () => ({
      handleError,
      wrapAsync,
      analyzeError,
      showRecoverableError,
      createModuleHandler
    }),
    [handleError, wrapAsync, analyzeError, showRecoverableError, createModuleHandler]
  )
}

/**
 * 创建模块专用错误处理 Hook
 */
export function useModuleErrorHandler(moduleName: string) {
  const { handleError, wrapAsync, showRecoverableError } = useErrorHandling()

  return useMemo(
    () => ({
      handle: (error: unknown, options?: Omit<ErrorHandlerOptions, 'logPrefix'>) =>
        handleError(error, { ...options, logPrefix: `[${moduleName}]` }),
      wrapAsync: <T,>(
        operation: () => Promise<T>,
        options?: Omit<ErrorHandlerOptions, 'logPrefix'>
      ) => wrapAsync(operation, { ...options, logPrefix: `[${moduleName}]` }),
      showRecoverable: (error: unknown, fallbackMessage?: string) =>
        showRecoverableError(error, fallbackMessage)
    }),
    [moduleName, handleError, wrapAsync, showRecoverableError]
  )
}

export default useErrorHandling

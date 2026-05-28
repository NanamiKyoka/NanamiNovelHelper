/**
 * 统一错误处理 Hook
 *
 * 提供一致的错误处理机制，基于 @shared/errors 统一错误码体系：
 * - 自动错误分类（从错误码元数据获取，不再依赖正则匹配）
 * - 自动恢复建议（从 ErrorCodeMeta 获取）
 * - 错误日志记录
 * - Ant Design 通知展示
 */

import { useCallback, useMemo } from 'react'
import { App } from 'antd'
import {
  ErrorCode,
  ServiceError,
  CATEGORY_SUGGESTIONS,
  type ErrorCategory,
  type ErrorSeverity
} from '@shared/errors'
import { parseIpcError, extractErrorMessage } from '@utils/error'

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
}

/** 错误详情 */
export interface ErrorDetail {
  message: string
  code: ErrorCode
  category: ErrorCategory
  severity: ErrorSeverity
  recoverable: boolean
  suggestion?: string
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * 分析错误 — 将任意错误转为结构化的 ErrorDetail
 */
function analyzeError(error: unknown): ErrorDetail {
  const appError = parseIpcError(error)
  const meta = appError.meta

  return {
    message: extractErrorMessage(error, meta.defaultMessage),
    code: appError.code,
    category: meta.category,
    severity: meta.severity,
    recoverable: meta.recoverable,
    suggestion: meta.suggestion || CATEGORY_SUGGESTIONS[meta.category]
  }
}

export function useErrorHandling() {
  const { message, notification } = App.useApp()
  /**
   * 分析错误详情
   */
  const analyzeErrorFn = useCallback((error: unknown): ErrorDetail => {
    return analyzeError(error)
  }, [])

  /**
   * 处理错误 — 日志 + 通知 + 可选重抛
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
        recoveryAction
      } = options

      const detail = analyzeError(error)
      const errorMessage = extractErrorMessage(error, fallbackMessage)

      if (recoveryAction) {
        detail.action = recoveryAction
      }

      if (log) {
        const logMessage = `${logPrefix} [${detail.code}] [${detail.category}] ${errorMessage}`
        console.error(logMessage, error instanceof Error ? error : '')
      }

      if (showNotification) {
        if (notificationType === 'notification') {
          notification.error({
            message: '操作失败',
            description: (
              <div>
                <p style={{ marginBottom: 4 }}>
                  <code
                    style={{
                      background: 'var(--bg-tertiary)',
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 11,
                      marginRight: 8
                    }}
                  >
                    {detail.code}
                  </code>
                  {errorMessage}
                </p>
                {detail.suggestion && (
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>
                    解决建议：{detail.suggestion}
                  </p>
                )}
                {detail.action && (
                  <button
                    type="button"
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
            duration: detail.severity === 'fatal' ? 0 : 8
          })
        } else {
          message.error(`${detail.code}: ${errorMessage}`)
        }
      }

      if (rethrow) {
        if (error instanceof Error) throw error
        throw new ServiceError(ErrorCode.UNKNOWN, errorMessage)
      }

      return errorMessage
    },
    [message, notification]
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
   * 显示带错误码和恢复建议的错误通知
   */
  const showRecoverableError = useCallback(
    (error: unknown, fallbackMessage = '操作失败') => {
      const detail = analyzeError(error)
      const errorMessage = extractErrorMessage(error, fallbackMessage)

      notification.error({
        message: '操作失败',
        description: (
          <div>
            <p style={{ marginBottom: 4 }}>
              <code
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 11,
                  marginRight: 8
                }}
              >
                {detail.code}
              </code>
              {errorMessage}
            </p>
            {detail.suggestion && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 6 }}>
                解决建议：{detail.suggestion}
              </p>
            )}
            {detail.action && (
              <button
                type="button"
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
        duration: detail.severity === 'fatal' ? 0 : 8
      })
    },
    [notification]
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
      analyzeError: analyzeErrorFn,
      showRecoverableError,
      createModuleHandler
    }),
    [handleError, wrapAsync, analyzeErrorFn, showRecoverableError, createModuleHandler]
  )
}

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
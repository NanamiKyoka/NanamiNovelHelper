/**
 * 前端错误处理工具
 *
 * 基于 @shared/errors 统一错误码体系，提供 UI 层错误处理能力：
 * - 从 Rust 后端 IPC 错误中提取结构化信息
 * - Ant Design 通知集成
 * - 错误恢复建议展示
 * - 安全操作的 try/catch 包装
 */

import { notification } from 'antd'
import {
  ErrorCode,
  ServiceError,
  ERROR_CODE_META,
  CATEGORY_SUGGESTIONS,
  extractErrorCode,
  isServiceError,
  type ErrorCategory,
  type ErrorSeverity
} from '@shared/errors'

export { ErrorCode, ServiceError, ERROR_CODE_META, CATEGORY_SUGGESTIONS, extractErrorCode, isServiceError }
export type { ErrorCategory, ErrorSeverity }

/**
 * IPC 错误原始格式（Rust 后端返回）
 */
interface IpcErrorPayload {
  code?: string
  message?: string
  module?: string
}

/**
 * 从 IPC 错误中解析为 ServiceError
 *
 * Rust 后端通过 tauri 返回的错误可能是:
 * 1. 字符串格式的消息
 * 2. 结构化 JSON { code, message, module }
 */
export function parseIpcError(error: unknown): ServiceError {
  if (error instanceof ServiceError) return error

  if (typeof error === 'string') {
    return new ServiceError(ErrorCode.UNKNOWN, error, { module: 'IPC' })
  }

  if (error && typeof error === 'object') {
    const payload = error as IpcErrorPayload
    if (payload.code && payload.code in ERROR_CODE_META) {
      return new ServiceError(payload.code as ErrorCode, payload.message, {
        module: payload.module || 'IPC'
      })
    }
    if ('message' in payload && typeof payload.message === 'string') {
      return new ServiceError(ErrorCode.UNKNOWN, payload.message, {
        module: payload.module || 'IPC'
      })
    }
  }

  const meta = ERROR_CODE_META[ErrorCode.UNKNOWN]
  return new ServiceError(ErrorCode.UNKNOWN, meta.defaultMessage, { module: 'IPC' })
}

/**
 * 从各种错误类型中提取用户友好的中文错误信息
 */
export function extractErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof ServiceError) return error.message
  if (error instanceof Error) {
    const message = error.message

    if (message.includes('ENOENT')) return '文件或目录不存在'
    if (message.includes('EACCES') || message.includes('EPERM')) return '没有访问权限'
    if (message.includes('ENOSPC')) return '磁盘空间不足'
    if (message.includes('EISDIR')) return '操作的目标是一个目录'
    if (message.includes('JSON') || message.includes('parse')) return '数据格式错误，无法解析'
    if (message.includes('network') || message.includes('Network')) return '网络连接失败'
    if (message.includes('timeout') || message.includes('Timeout')) return '操作超时'

    return message || fallback
  }
  if (typeof error === 'string') return error || fallback
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message) || fallback
  }
  return fallback
}

/**
 * 获取错误的恢复建议
 */
export function getRecoverySuggestion(error: unknown): string | undefined {
  if (error instanceof ServiceError) return error.suggestion
  return undefined
}

/**
 * 获取错误码
 */
export function getErrorCode(error: unknown): ErrorCode {
  return extractErrorCode(error)
}

/**
 * 是否可恢复
 */
export function isRecoverable(error: unknown): boolean {
  if (error instanceof ServiceError) return error.recoverable
  return true
}

/** 错误处理选项 */
export interface ErrorHandlerOptions {
  log?: boolean
  logPrefix?: string
  fallbackMessage?: string
  rethrow?: boolean
  showNotification?: boolean
}

/**
 * 统一错误处理器
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): string {
  const {
    log = true,
    logPrefix = '[Error]',
    fallbackMessage = '操作失败',
    rethrow = false,
    showNotification = false
  } = options

  const message = extractErrorMessage(error, fallbackMessage)
  const appError = parseIpcError(error)

  if (log) {
    console.error(`${logPrefix} [${appError.code}] ${message}`, error instanceof Error ? error : '')
  }

  if (showNotification) {
    notification.error({
      message: '操作失败',
      description: (
        <div>
          <p style={{ marginBottom: 4 }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginRight: 8 }}>
              [{appError.code}]
            </span>
            {message}
          </p>
          {appError.suggestion && (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>
              解决建议：{appError.suggestion}
            </p>
          )}
        </div>
      ),
      duration: 6
    })
  }

  if (rethrow) {
    if (error instanceof Error) throw error
    throw appError
  }

  return message
}

/**
 * 创建带默认前缀的错误处理器
 */
export function createErrorHandler(prefix: string) {
  return (error: unknown, options: Omit<ErrorHandlerOptions, 'logPrefix'> = {}) =>
    handleError(error, { ...options, logPrefix: prefix })
}

/**
 * 显示带错误码和恢复建议的错误通知
 */
export function showErrorWithRecovery(error: unknown, fallbackMessage = '操作失败'): void {
  const message = extractErrorMessage(error, fallbackMessage)
  const appError = parseIpcError(error)

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
            {appError.code}
          </code>
          {message}
        </p>
        {appError.suggestion && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 6 }}>
            解决建议：{appError.suggestion}
          </p>
        )}
      </div>
    ),
    duration: appError.severity === 'fatal' ? 0 : 8
  })
}

/**
 * 异步操作包装器 — 自动处理错误
 *
 * @returns [数据, 错误信息] 两者必有其一是 null
 */
export async function tryAsync<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<[T | null, string | null]> {
  try {
    const data = await operation()
    return [data, null]
  } catch (error) {
    const message = handleError(error, { ...options, rethrow: false })
    return [null, message]
  }
}

/**
 * 同步操作包装器
 */
export function trySync<T>(
  operation: () => T,
  options: ErrorHandlerOptions = {}
): [T | null, string | null] {
  try {
    const data = operation()
    return [data, null]
  } catch (error) {
    const message = handleError(error, { ...options, rethrow: false })
    return [null, message]
  }
}
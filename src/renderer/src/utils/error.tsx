/**
 * 错误处理工具
 * 
 * 统一的错误处理机制，确保错误信息一致性和可追踪性
 */

import { notification } from 'antd'

/**
 * 应用错误类型
 */
export enum AppErrorCode {
  // 项目相关
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  PROJECT_CREATE_FAILED = 'PROJECT_CREATE_FAILED',
  PROJECT_OPEN_FAILED = 'PROJECT_OPEN_FAILED',
  PROJECT_SAVE_FAILED = 'PROJECT_SAVE_FAILED',
  
  // 文件相关
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_FAILED = 'FILE_READ_FAILED',
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  
  // 词汇相关
  VOCABULARY_LOAD_FAILED = 'VOCABULARY_LOAD_FAILED',
  VOCABULARY_SAVE_FAILED = 'VOCABULARY_SAVE_FAILED',
  
  // 可视化相关
  GRAPH_LOAD_FAILED = 'GRAPH_LOAD_FAILED',
  GRAPH_SAVE_FAILED = 'GRAPH_SAVE_FAILED',
  
  // Git 相关
  GIT_OPERATION_FAILED = 'GIT_OPERATION_FAILED',
  
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误恢复建议配置
 */
interface ErrorRecovery {
  /** 是否可恢复 */
  recoverable: boolean
  /** 恢复建议 */
  suggestion: string
  /** 恢复操作（可选） */
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * 错误类型到恢复建议的映射
 */
const ERROR_RECOVERY_MAP: Partial<Record<AppErrorCode, ErrorRecovery>> = {
  [AppErrorCode.PROJECT_NOT_FOUND]: {
    recoverable: true,
    suggestion: '项目文件可能已被移动或删除，请检查项目路径是否正确。',
    action: { label: '重新打开项目', onClick: () => window.location.reload() }
  },
  [AppErrorCode.PROJECT_CREATE_FAILED]: {
    recoverable: true,
    suggestion: '请检查目标目录是否有写入权限，或尝试选择其他位置。'
  },
  [AppErrorCode.PROJECT_OPEN_FAILED]: {
    recoverable: true,
    suggestion: '请确认项目目录存在且包含有效的项目文件。'
  },
  [AppErrorCode.FILE_NOT_FOUND]: {
    recoverable: true,
    suggestion: '文件可能已被删除或移动，请刷新文件列表。'
  },
  [AppErrorCode.FILE_READ_FAILED]: {
    recoverable: true,
    suggestion: '文件可能被其他程序占用，请关闭后重试。'
  },
  [AppErrorCode.FILE_WRITE_FAILED]: {
    recoverable: true,
    suggestion: '请检查磁盘空间是否充足，或文件是否被其他程序占用。'
  },
  [AppErrorCode.VOCABULARY_LOAD_FAILED]: {
    recoverable: true,
    suggestion: '词汇数据可能已损坏，请尝试重新打开项目。'
  },
  [AppErrorCode.GRAPH_LOAD_FAILED]: {
    recoverable: true,
    suggestion: '可视化数据可能已损坏，请尝试重新创建。'
  },
  [AppErrorCode.GIT_OPERATION_FAILED]: {
    recoverable: true,
    suggestion: '请检查 Git 是否正确安装，或尝试在终端中手动操作。'
  },
  [AppErrorCode.UNKNOWN_ERROR]: {
    recoverable: false,
    suggestion: '发生未知错误，请尝试重新操作或重启应用。'
  }
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  code: AppErrorCode
  cause?: Error
  
  constructor(code: AppErrorCode, message: string, cause?: Error) {
    super(message)
    this.code = code
    this.cause = cause
    this.name = 'AppError'
  }
  
  /**
   * 获取恢复建议
   */
  getRecovery(): ErrorRecovery {
    return ERROR_RECOVERY_MAP[this.code] || ERROR_RECOVERY_MAP[AppErrorCode.UNKNOWN_ERROR]!
  }
}

/**
 * 错误信息提取
 * 从各种错误类型中提取用户友好的错误信息
 */
export function extractErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    // 处理常见错误类型
    const message = error.message
    
    // 文件系统错误
    if (message.includes('ENOENT')) {
      return '文件或目录不存在'
    }
    if (message.includes('EACCES') || message.includes('EPERM')) {
      return '没有访问权限'
    }
    if (message.includes('ENOSPC')) {
      return '磁盘空间不足'
    }
    if (message.includes('EISDIR')) {
      return '操作的目标是一个目录'
    }
    
    // JSON 解析错误
    if (message.includes('JSON') || message.includes('parse')) {
      return '数据格式错误，无法解析'
    }
    
    // 网络错误
    if (message.includes('network') || message.includes('Network')) {
      return '网络连接失败'
    }
    
    return message || fallback
  }
  
  if (typeof error === 'string') {
    return error || fallback
  }
  
  // 处理 IPC 返回的错误对象
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message) || fallback
  }
  
  return fallback
}

/**
 * 错误处理选项
 */
interface ErrorHandlerOptions {
  /** 是否打印到控制台 */
  log?: boolean
  /** 控制台日志前缀 */
  logPrefix?: string
  /** 默认错误信息 */
  fallbackMessage?: string
  /** 是否重新抛出错误 */
  rethrow?: boolean
  /** 是否显示通知 */
  showNotification?: boolean
}

/**
 * 统一错误处理器
 * 
 * @param error 原始错误
 * @param options 处理选项
 * @returns 用户友好的错误信息
 * 
 * @example
 * try {
 *   await someAsyncOperation()
 * } catch (error) {
 *   const message = handleError(error, { logPrefix: '[MyStore]' })
 *   set({ error: message })
 * }
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): string {
  const {
    log = true,
    logPrefix = '[Error]',
    fallbackMessage = '操作失败',
    rethrow = false,
    showNotification = false
  } = options

  const message = extractErrorMessage(error, fallbackMessage)

  if (log) {
    console.error(`${logPrefix} ${message}`, error instanceof Error ? error : '')
  }

  // 显示通知
  if (showNotification) {
    const recovery = error instanceof AppError ? error.getRecovery() : null
    
    notification.error({
      message: '操作失败',
      description: (
        <div>
          <p>{message}</p>
          {recovery && (
            <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 8 }}>
              💡 {recovery.suggestion}
            </p>
          )}
        </div>
      ),
      duration: 6
    })
  }

  if (rethrow) {
    if (error instanceof Error) {
      throw error
    }
    throw new AppError(AppErrorCode.UNKNOWN_ERROR, message)
  }

  return message
}

/**
 * 创建带默认前缀的错误处理器
 * 
 * @param prefix 日志前缀
 * @returns 预配置的错误处理函数
 * 
 * @example
 * const handleError = createErrorHandler('[ProjectStore]')
 * 
 * try {
 *   await openProject(path)
 * } catch (error) {
 *   const message = handleError(error, { fallbackMessage: '打开项目失败' })
 *   set({ error: message })
 * }
 */
export function createErrorHandler(prefix: string) {
  return (error: unknown, options: Omit<ErrorHandlerOptions, 'logPrefix'> = {}) =>
    handleError(error, { ...options, logPrefix: prefix })
}

/**
 * 显示带恢复建议的错误通知
 * 
 * @param error 错误对象
 * @param fallbackMessage 默认错误信息
 */
export function showErrorWithRecovery(error: unknown, fallbackMessage = '操作失败'): void {
  const message = extractErrorMessage(error, fallbackMessage)
  const recovery = error instanceof AppError ? error.getRecovery() : null
  
  notification.error({
    message: '操作失败',
    description: (
      <div>
        <p>{message}</p>
        {recovery?.suggestion && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 8 }}>
            💡 {recovery.suggestion}
          </p>
        )}
        {recovery?.action && (
          <button
            onClick={recovery.action.onClick}
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
            {recovery.action.label}
          </button>
        )}
      </div>
    ),
    duration: 8
  })
}

/**
 * 异步操作包装器
 * 自动处理错误并返回标准化的结果
 * 
 * @param operation 异步操作
 * @param options 错误处理选项
 * @returns [数据, 错误信息]
 * 
 * @example
 * const [project, error] = await tryAsync(
 *   () => window.electron.project.open(path),
 *   { fallbackMessage: '打开项目失败' }
 * )
 * 
 * if (error) {
 *   set({ error })
 *   return
 * }
 * 
 * set({ project })
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

export default {
  AppError,
  AppErrorCode,
  extractErrorMessage,
  handleError,
  createErrorHandler,
  showErrorWithRecovery,
  tryAsync,
  trySync,
}

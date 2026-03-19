/**
 * 错误处理工具
 * 
 * 统一的错误处理机制，确保错误信息一致性和可追踪性
 */

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
    // 处理 IPC 错误（通常包含 message 属性）
    return error.message || fallback
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
    rethrow = false
  } = options

  const message = extractErrorMessage(error, fallbackMessage)

  if (log) {
    console.error(`${logPrefix} ${message}`, error instanceof Error ? error : '')
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
  tryAsync,
  trySync,
}

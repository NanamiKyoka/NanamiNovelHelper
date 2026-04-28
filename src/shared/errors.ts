/**
 * 统一错误处理
 *
 * 提供一致的错误类型和处理方式，减少 Service 层的重复代码
 */

import { logger } from './logger'

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // 项目相关
  PROJECT_NOT_OPEN = 'PROJECT_NOT_OPEN',
  PROJECT_INVALID_PATH = 'PROJECT_INVALID_PATH',
  PROJECT_ALREADY_EXISTS = 'PROJECT_ALREADY_EXISTS',

  // 文件相关
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  FILE_PARSE_ERROR = 'FILE_PARSE_ERROR',

  // 数据相关
  DATA_INVALID = 'DATA_INVALID',
  DATA_LOAD_ERROR = 'DATA_LOAD_ERROR',
  DATA_SAVE_ERROR = 'DATA_SAVE_ERROR',

  // 服务相关
  SERVICE_NOT_INITIALIZED = 'SERVICE_NOT_INITIALIZED',
  SERVICE_ERROR = 'SERVICE_ERROR'
}

/**
 * 错误信息映射
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN]: '未知错误',
  [ErrorCode.INVALID_ARGUMENT]: '参数无效',
  [ErrorCode.NOT_FOUND]: '资源未找到',
  [ErrorCode.ALREADY_EXISTS]: '资源已存在',
  [ErrorCode.PERMISSION_DENIED]: '权限不足',

  [ErrorCode.PROJECT_NOT_OPEN]: '没有打开的项目',
  [ErrorCode.PROJECT_INVALID_PATH]: '项目路径无效',
  [ErrorCode.PROJECT_ALREADY_EXISTS]: '项目已存在',

  [ErrorCode.FILE_NOT_FOUND]: '文件未找到',
  [ErrorCode.FILE_READ_ERROR]: '文件读取失败',
  [ErrorCode.FILE_WRITE_ERROR]: '文件写入失败',
  [ErrorCode.FILE_PARSE_ERROR]: '文件解析失败',

  [ErrorCode.DATA_INVALID]: '数据无效',
  [ErrorCode.DATA_LOAD_ERROR]: '数据加载失败',
  [ErrorCode.DATA_SAVE_ERROR]: '数据保存失败',

  [ErrorCode.SERVICE_NOT_INITIALIZED]: '服务未初始化',
  [ErrorCode.SERVICE_ERROR]: '服务错误'
}

/**
 * 服务错误类
 */
export class ServiceError extends Error {
  public readonly code: ErrorCode
  public readonly module: string
  public readonly cause?: unknown

  constructor(code: ErrorCode, message?: string, options?: { module?: string; cause?: unknown }) {
    super(message ?? ERROR_MESSAGES[code])
    this.code = code
    this.module = options?.module ?? 'Service'
    this.cause = options?.cause
    this.name = 'ServiceError'
  }

  /**
   * 转换为 JSON 格式（用于 IPC 传输）
   */
  toJSON(): { code: ErrorCode; message: string; module: string; name: string } {
    return {
      code: this.code,
      message: this.message,
      module: this.module,
      name: this.name
    }
  }

  /**
   * 从 JSON 恢复错误
   */
  static fromJSON(json: ReturnType<ServiceError['toJSON']>): ServiceError {
    return new ServiceError(json.code, json.message, { module: json.module })
  }
}

/**
 * 创建错误工厂函数
 */
export function createError(
  code: ErrorCode,
  message?: string,
  options?: { module?: string; cause?: unknown }
): ServiceError {
  return new ServiceError(code, message, options)
}

/**
 * 预定义错误创建函数
 */
export const Errors = {
  notFound: (message?: string, module?: string) =>
    createError(ErrorCode.NOT_FOUND, message, { module }),

  projectNotOpen: (module?: string) =>
    createError(ErrorCode.PROJECT_NOT_OPEN, undefined, { module }),

  projectInvalidPath: (message?: string, module?: string) =>
    createError(ErrorCode.PROJECT_INVALID_PATH, message, { module }),

  serviceNotInitialized: (module?: string) =>
    createError(ErrorCode.SERVICE_NOT_INITIALIZED, undefined, { module }),

  fileNotFound: (path: string, module?: string) =>
    createError(ErrorCode.FILE_NOT_FOUND, `文件未找到: ${path}`, { module }),

  fileReadError: (path: string, cause?: unknown, module?: string) =>
    createError(ErrorCode.FILE_READ_ERROR, `读取文件失败: ${path}`, { module, cause }),

  fileWriteError: (path: string, cause?: unknown, module?: string) =>
    createError(ErrorCode.FILE_WRITE_ERROR, `写入文件失败: ${path}`, { module, cause }),

  fileParseError: (path: string, cause?: unknown, module?: string) =>
    createError(ErrorCode.FILE_PARSE_ERROR, `解析文件失败: ${path}`, { module, cause }),

  invalidArgument: (arg: string, module?: string) =>
    createError(ErrorCode.INVALID_ARGUMENT, `参数无效: ${arg}`, { module }),

  alreadyExists: (resource: string, module?: string) =>
    createError(ErrorCode.ALREADY_EXISTS, `资源已存在: ${resource}`, { module })
}

/**
 * 错误处理选项
 */
export interface HandleErrorOptions {
  /** 模块名称（用于日志） */
  module: string
  /** 操作名称（用于日志） */
  operation: string
  /** 是否抛出错误（默认 false，返回 null） */
  throw?: boolean
  /** 是否记录日志（默认 true） */
  log?: boolean
  /** 默认返回值（默认 null） */
  defaultValue?: unknown
}

/**
 * 统一错误处理函数
 *
 * @example
 * // 返回 null 而不是抛出错误
 * const result = handleError(() => someRiskyOperation(), {
 *   module: 'VocabularyService',
 *   operation: 'loadTypes'
 * })
 *
 * @example
 * // 抛出统一错误
 * handleError(() => someRiskyOperation(), {
 *   module: 'ProjectService',
 *   operation: 'openProject',
 *   throw: true
 * })
 */
export function handleError<T>(fn: () => T, options: HandleErrorOptions): T | null {
  const { module, operation, throw: shouldThrow = false, log = true, defaultValue = null } = options

  try {
    return fn()
  } catch (error) {
    if (log) {
      if (error instanceof ServiceError) {
        logger.error(module, `${operation} failed: ${error.message}`, error.cause)
      } else {
        logger.error(module, `${operation} failed`, error)
      }
    }

    if (shouldThrow) {
      if (error instanceof ServiceError) {
        throw error
      }
      throw new ServiceError(ErrorCode.SERVICE_ERROR, String(error), { module, cause: error })
    }

    return defaultValue as T | null
  }
}

/**
 * 异步错误处理函数
 */
export async function handleErrorAsync<T>(
  fn: () => Promise<T>,
  options: HandleErrorOptions
): Promise<T | null> {
  const { module, operation, throw: shouldThrow = false, log = true, defaultValue = null } = options

  try {
    return await fn()
  } catch (error) {
    if (log) {
      if (error instanceof ServiceError) {
        logger.error(module, `${operation} failed: ${error.message}`, error.cause)
      } else {
        logger.error(module, `${operation} failed`, error)
      }
    }

    if (shouldThrow) {
      if (error instanceof ServiceError) {
        throw error
      }
      throw new ServiceError(ErrorCode.SERVICE_ERROR, String(error), { module, cause: error })
    }

    return defaultValue as T | null
  }
}

/**
 * 检查是否是 ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

/**
 * 确保项目已打开
 */
export function ensureProjectOpen(projectPath: string | null, module: string): void {
  if (!projectPath) {
    throw Errors.projectNotOpen(module)
  }
}

/**
 * 确保服务已初始化
 */
export function ensureInitialized(dataDir: string | null, module: string): void {
  if (!dataDir) {
    throw Errors.serviceNotInitialized(module)
  }
}

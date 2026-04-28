/* eslint-disable no-console */
/**
 * 统一日志工具
 *
 * 提供结构化的日志输出，支持模块标识和日志级别控制
 * 可在主进程和渲染进程中使用
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 环境检测函数类型
 */
export type EnvironmentDetector = () => boolean

/**
 * 默认环境检测（兼容主进程和渲染进程）
 */
const defaultIsDev: EnvironmentDetector = () => {
  // 渲染进程：检查 import.meta.env
  // @ts-expect-error - import.meta 在主进程中不存在
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-expect-error - import.meta.env 在主进程中不存在
    return import.meta.env.DEV ?? false
  }
  // 主进程：检查 process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development'
  }
  return false
}

interface LoggerOptions {
  /** 模块名称，用于日志前缀 */
  module: string
  /** 是否启用调试日志（生产环境应设为 false） */
  enableDebug?: boolean
  /** 自定义环境检测函数 */
  isDev?: EnvironmentDetector
}

/**
 * 日志工具类
 */
export class Logger {
  private module: string
  private enableDebug: boolean
  private isDev: EnvironmentDetector

  constructor(options: LoggerOptions) {
    this.module = options.module
    this.isDev = options.isDev ?? defaultIsDev
    this.enableDebug = options.enableDebug ?? this.isDev()
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}`
  }

  /**
   * 调试日志 - 仅开发环境输出
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.enableDebug) {
      console.log(this.formatMessage('debug', message), ...args)
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: unknown[]): void {
    console.info(this.formatMessage('info', message), ...args)
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage('warn', message), ...args)
  }

  /**
   * 错误日志
   */
  error(message: string, error?: unknown): void {
    const formattedMessage = this.formatMessage('error', message)
    if (error instanceof Error) {
      console.error(formattedMessage, error)
    } else if (error !== undefined) {
      console.error(formattedMessage, error)
    } else {
      console.error(formattedMessage)
    }
  }

  /**
   * 创建子日志器
   */
  child(subModule: string): Logger {
    return new Logger({
      module: `${this.module}:${subModule}`,
      enableDebug: this.enableDebug,
      isDev: this.isDev
    })
  }
}

/**
 * 创建日志器
 */
export function createLogger(
  module: string,
  options?: Partial<LoggerOptions> & { isDev?: EnvironmentDetector }
): Logger {
  return new Logger({
    module,
    enableDebug: options?.enableDebug,
    isDev: options?.isDev
  })
}

/**
 * 创建主进程日志器
 */
export function createMainLogger(
  module: string,
  options?: Partial<Omit<LoggerOptions, 'isDev'>>
): Logger {
  return createLogger(module, {
    ...options,
    isDev: () => process.env.NODE_ENV === 'development'
  })
}

/**
 * 创建渲染进程日志器
 */
export function createRendererLogger(
  module: string,
  options?: Partial<Omit<LoggerOptions, 'isDev'>>
): Logger {
  return createLogger(module, {
    ...options,
    // @ts-expect-error - import.meta 在编译时会被处理
    isDev: () => import.meta.env?.DEV ?? process.env.NODE_ENV === 'development'
  })
}

/**
 * 全局日志实例（用于快速使用）
 */
export const logger = {
  _isDev: defaultIsDev,

  debug: (module: string, message: string, ...args: unknown[]) => {
    if (defaultIsDev()) {
      console.log(`[${module}] ${message}`, ...args)
    }
  },
  info: (module: string, message: string, ...args: unknown[]) => {
    console.info(`[${module}] ${message}`, ...args)
  },
  warn: (module: string, message: string, ...args: unknown[]) => {
    console.warn(`[${module}] ${message}`, ...args)
  },
  error: (module: string, message: string, error?: unknown) => {
    if (error instanceof Error) {
      console.error(`[${module}] ${message}`, error)
    } else if (error !== undefined) {
      console.error(`[${module}] ${message}`, error)
    } else {
      console.error(`[${module}] ${message}`)
    }
  }
}

export default Logger

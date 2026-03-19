/**
 * 统一日志工具
 * 
 * 提供结构化的日志输出，支持模块标识和日志级别控制
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  /** 模块名称，用于日志前缀 */
  module: string
  /** 是否启用调试日志（生产环境应设为 false） */
  enableDebug?: boolean
}

/**
 * 日志工具类
 * 
 * @example
 * const logger = createLogger('ProjectStore')
 * 
 * logger.debug('Loading project...', { path })
 * logger.info('Project loaded successfully')
 * logger.warn('File not found, using default')
 * logger.error('Failed to load project', error)
 */
class Logger {
  private module: string
  private enableDebug: boolean

  constructor(options: LoggerOptions) {
    this.module = options.module
    this.enableDebug = options.enableDebug ?? (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development')
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
    })
  }
}

/**
 * 创建日志器
 * 
 * @param module 模块名称
 * @param options 日志选项
 * @returns Logger 实例
 * 
 * @example
 * // 在 Store 中使用
 * const logger = createLogger('VocabularyStore')
 * 
 * export const useVocabularyStore = create<VocabularyState>((set, get) => ({
 *   loadTypes: async () => {
 *     try {
 *       logger.debug('Loading vocabulary types...')
 *       const types = await window.electron.vocabulary.loadTypes()
 *       logger.info('Loaded vocabulary types', { count: types.length })
 *       set({ types })
 *     } catch (error) {
 *       logger.error('Failed to load vocabulary types', error)
 *       set({ error: '加载词汇类型失败' })
 *     }
 *   }
 * }))
 */
export function createLogger(module: string, options?: Partial<LoggerOptions>): Logger {
  return new Logger({
    module,
    enableDebug: options?.enableDebug,
  })
}

/**
 * 全局日志实例（用于快速使用）
 */
export const logger = {
  debug: (module: string, message: string, ...args: unknown[]) => {
    if (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development') {
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
  },
}

export default Logger

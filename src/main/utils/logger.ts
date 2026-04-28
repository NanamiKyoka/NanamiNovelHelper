/**
 * 主进程日志工具
 *
 * 重新导出 shared/logger，提供主进程专用的日志创建函数
 */

// 先导入，确保模块加载完成
import {
  Logger,
  createLogger as createLoggerBase,
  logger,
  createMainLogger as createMainLoggerBase,
  type LogLevel,
  type LoggerOptions,
  type EnvironmentDetector
} from '../../shared/logger'

// 重新导出类型
export type { LogLevel, LoggerOptions, EnvironmentDetector }

// 重新导出类和实例
export { Logger, logger, createLoggerBase }

// 导出主进程专用的日志创建函数
export const createMainLogger = createMainLoggerBase

/**
 * 创建主进程日志器（别名）
 */
export const createLogger = createMainLoggerBase

export default Logger

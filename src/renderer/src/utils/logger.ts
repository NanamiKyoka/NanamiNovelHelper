/**
 * 渲染进程日志工具
 *
 * 重新导出 shared/logger，提供渲染进程专用的日志创建函数
 */

export {
  Logger,
  createLogger as createLoggerBase,
  logger,
  createRendererLogger,
  type LogLevel,
  type LoggerOptions,
  type EnvironmentDetector
} from '../../../shared/logger'

/**
 * 创建渲染进程日志器
 */
export const createLogger = createRendererLogger

export default Logger

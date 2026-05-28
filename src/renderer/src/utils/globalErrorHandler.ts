import { ErrorCode } from '@shared/errors'
import { parseIpcError } from '@utils/error'

/**
 * 安装全局未捕获错误处理器
 *
 * 捕获三种级别的未处理错误：
 * 1. window.onerror — 同步脚本错误
 * 2. window.onunhandledrejection — 未处理的 Promise 拒绝
 * 3. window.onmessageerror — IPC/Worker 消息反序列化错误
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event: ErrorEvent) => {
    const appError = parseIpcError(event.error || event.message)
    console.error(
      `[GlobalError] [${appError.code}] ${appError.message}`,
      '\nSource:',
      event.filename,
      `L${event.lineno}:${event.colno}`
    )

    const suggestion = appError.suggestion
      ? `\n  恢复建议: ${appError.suggestion}`
      : ''
    console.warn(
      `  错误码: ${appError.code}`,
      `  严重程度: ${appError.severity}`,
      `  可恢复: ${appError.recoverable ? '是' : '否'}`,
      suggestion
    )
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const appError = parseIpcError(event.reason || ErrorCode.SYS_UNHANDLED_ERROR)
    console.error(
      `[GlobalError:UnhandledRejection] [${appError.code}] ${appError.message}`,
      event.reason instanceof Error ? event.reason : ''
    )

    const suggestion = appError.suggestion
      ? `\n  恢复建议: ${appError.suggestion}`
      : ''
    console.warn(
      `  错误码: ${appError.code}`,
      `  严重程度: ${appError.severity}`,
      `  可恢复: ${appError.recoverable ? '是' : '否'}`,
      suggestion
    )
  })

  window.addEventListener('messageerror', (event: MessageEvent) => {
    console.error(
      `[GlobalError:MessageDeserialize] IPC消息反序列化失败`,
      '\nOrigin:',
      event.origin,
      '\nData:',
      event.data
    )
  })
}
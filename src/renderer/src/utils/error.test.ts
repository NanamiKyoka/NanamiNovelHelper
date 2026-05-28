import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notification } from 'antd'
import { ErrorCode, ServiceError } from '@shared/errors'
import {
  parseIpcError,
  extractErrorMessage,
  handleError,
  createErrorHandler,
  showErrorWithRecovery,
  tryAsync,
  trySync
} from '@utils/error'

describe('error utils', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from ServiceError', () => {
      const error = new ServiceError(ErrorCode.PRJ_OPEN_FAILED, '打开项目失败')
      expect(extractErrorMessage(error)).toBe('打开项目失败')
    })

    it('should extract message from Error', () => {
      const error = new Error('测试错误')
      expect(extractErrorMessage(error)).toBe('测试错误')
    })

    it('should return string as is', () => {
      expect(extractErrorMessage('字符串错误')).toBe('字符串错误')
    })

    it('should extract message from object with message property', () => {
      const error = { message: '对象错误' }
      expect(extractErrorMessage(error)).toBe('对象错误')
    })

    it('should return fallback for unknown error types', () => {
      expect(extractErrorMessage(null, '默认错误')).toBe('默认错误')
      expect(extractErrorMessage(undefined, '默认错误')).toBe('默认错误')
      expect(extractErrorMessage(123, '默认错误')).toBe('默认错误')
    })

    it('should recognize ENOENT as file not found', () => {
      const error = new Error('ENOENT: no such file or directory')
      expect(extractErrorMessage(error)).toBe('文件或目录不存在')
    })

    it('should recognize EACCES as permission denied', () => {
      const error = new Error('EACCES: permission denied')
      expect(extractErrorMessage(error)).toBe('没有访问权限')
    })

    it('should recognize EPERM as permission denied', () => {
      const error = new Error('EPERM: operation not permitted')
      expect(extractErrorMessage(error)).toBe('没有访问权限')
    })

    it('should recognize ENOSPC as disk full', () => {
      const error = new Error('ENOSPC: no space left on device')
      expect(extractErrorMessage(error)).toBe('磁盘空间不足')
    })

    it('should recognize EISDIR as is directory', () => {
      const error = new Error('EISDIR: illegal operation on a directory')
      expect(extractErrorMessage(error)).toBe('操作的目标是一个目录')
    })

    it('should recognize JSON parse error', () => {
      const error = new Error('Unexpected token in JSON at position 0')
      expect(extractErrorMessage(error)).toBe('数据格式错误，无法解析')
    })

    it('should recognize parse error', () => {
      const error = new Error('Failed to parse input')
      expect(extractErrorMessage(error)).toBe('数据格式错误，无法解析')
    })

    it('should recognize network error', () => {
      const error = new Error('network error')
      expect(extractErrorMessage(error)).toBe('网络连接失败')
    })

    it('should recognize Network (capitalized) error', () => {
      const error = new Error('Network request failed')
      expect(extractErrorMessage(error)).toBe('网络连接失败')
    })

    it('should use fallback when Error message is empty', () => {
      const error = new Error('')
      expect(extractErrorMessage(error, '默认')).toBe('默认')
    })

    it('should use fallback when string is empty', () => {
      expect(extractErrorMessage('', '默认')).toBe('默认')
    })

    it('should use fallback when object message is empty', () => {
      expect(extractErrorMessage({ message: '' }, '默认')).toBe('默认')
    })
  })

  describe('parseIpcError', () => {
    it('should return same ServiceError instance', () => {
      const original = new ServiceError(ErrorCode.PRJ_NOT_OPEN, '项目未打开')
      const parsed = parseIpcError(original)
      expect(parsed).toBe(original)
    })

    it('should wrap plain string with UNKNOWN code', () => {
      const parsed = parseIpcError('一段错误消息')
      expect(parsed.code).toBe(ErrorCode.UNKNOWN)
      expect(parsed.message).toBe('一段错误消息')
      expect(parsed.module).toBe('IPC')
    })

    it('should parse structured IPC error with known code', () => {
      const parsed = parseIpcError({ code: 'FIL_NOT_FOUND', message: '文件不存在', module: 'FileService' })
      expect(parsed.code).toBe(ErrorCode.FIL_NOT_FOUND)
      expect(parsed.message).toBe('文件不存在')
      expect(parsed.module).toBe('FileService')
    })

    it('should parse structured error with unknown code as UNKNOWN', () => {
      const parsed = parseIpcError({ code: 'XYZ_FAKE', message: '消息' })
      expect(parsed.code).toBe(ErrorCode.UNKNOWN)
    })

    it('should handle error with code but no message', () => {
      const parsed = parseIpcError({ code: 'FIL_NOT_FOUND' })
      expect(parsed.code).toBe(ErrorCode.FIL_NOT_FOUND)
      expect(parsed.message).toBe('文件未找到')
    })

    it('should fallback to UNKNOWN for unrecognized format', () => {
      const parsed = parseIpcError(42)
      expect(parsed.code).toBe(ErrorCode.UNKNOWN)
    })
  })

  describe('ServiceError', () => {
    it('should have correct name', () => {
      const error = new ServiceError(ErrorCode.UNKNOWN, '未知错误')
      expect(error.name).toBe('ServiceError')
    })

    it('should store code and message', () => {
      const error = new ServiceError(ErrorCode.PRJ_NOT_OPEN, '项目未打开')
      expect(error.code).toBe(ErrorCode.PRJ_NOT_OPEN)
      expect(error.message).toBe('项目未打开')
    })

    it('should use default message when not provided', () => {
      const error = new ServiceError(ErrorCode.FIL_NOT_FOUND)
      expect(error.message).toBe('文件未找到')
    })

    it('should have severity from metadata', () => {
      const fatalError = new ServiceError(ErrorCode.SYS_APP_START_FAILED)
      expect(fatalError.severity).toBe('fatal')

      const errorError = new ServiceError(ErrorCode.FIL_READ_ERROR)
      expect(errorError.severity).toBe('error')
    })

    it('should have recoverable from metadata', () => {
      const error = new ServiceError(ErrorCode.FIL_NOT_FOUND)
      expect(error.recoverable).toBe(true)

      const fatal = new ServiceError(ErrorCode.SYS_APP_START_FAILED)
      expect(fatal.recoverable).toBe(false)
    })

    it('should serialize to JSON correctly', () => {
      const error = new ServiceError(ErrorCode.NET_TIMEOUT, '网络超时', { module: 'Test' })
      const json = error.toJSON()
      expect(json.code).toBe(ErrorCode.NET_TIMEOUT)
      expect(json.message).toBe('网络超时')
      expect(json.module).toBe('Test')
      expect(json.severity).toBe('error')
    })

    it('should store cause', () => {
      const cause = new Error('原始错误')
      const error = new ServiceError(ErrorCode.UNKNOWN, '包装错误', { cause })
      expect(error.cause).toBe(cause)
    })
  })

  describe('handleError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should log error to console by default', () => {
      const error = new Error('测试错误')
      handleError(error, { logPrefix: '[Test]' })
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should not log when log is false', () => {
      const error = new Error('测试错误')
      handleError(error, { log: false })
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should return extracted message', () => {
      const error = new Error('测试错误')
      const message = handleError(error, { fallbackMessage: '默认' })
      expect(message).toBe('测试错误')
    })

    it('should rethrow error when rethrow is true', () => {
      const error = new Error('测试错误')
      expect(() => handleError(error, { rethrow: true })).toThrow('测试错误')
    })

    it('should wrap non-Error in ServiceError when rethrow is true', () => {
      expect(() => handleError('字符串错误', { rethrow: true })).toThrow(ServiceError)
    })

    it('should show notification when showNotification is true', () => {
      const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => {})
      const error = new Error('文件不存在')
      handleError(error, { showNotification: true, log: false })
      expect(notificationSpy).toHaveBeenCalled()
      notificationSpy.mockRestore()
    })
  })

  describe('createErrorHandler', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should create handler with prefix', () => {
      const handler = createErrorHandler('[CustomPrefix]')
      const error = new Error('测试错误')
      const message = handler(error)
      expect(message).toBe('测试错误')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should respect log option', () => {
      const handler = createErrorHandler('[CustomPrefix]')
      const error = new Error('测试错误')
      const message = handler(error, { log: false })
      expect(message).toBe('测试错误')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })
  })

  describe('showErrorWithRecovery', () => {
    it('should show notification with recovery suggestion for ServiceError', () => {
      const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => {})
      showErrorWithRecovery(new Error('项目未找到'))
      expect(notificationSpy).toHaveBeenCalled()
      notificationSpy.mockRestore()
    })

    it('should show notification for non-ServiceError', () => {
      const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => {})
      showErrorWithRecovery(new Error('普通错误'))
      expect(notificationSpy).toHaveBeenCalled()
      notificationSpy.mockRestore()
    })
  })

  describe('tryAsync', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should return data on success', async () => {
      const [data, error] = await tryAsync(() => Promise.resolve('success'))
      expect(data).toBe('success')
      expect(error).toBeNull()
    })

    it('should return error on failure', async () => {
      const [data, error] = await tryAsync(() => Promise.reject(new Error('失败')), { log: false })
      expect(data).toBeNull()
      expect(error).toBe('失败')
    })

    it('should use fallback message', async () => {
      const [data, error] = await tryAsync(() => Promise.reject(null), {
        fallbackMessage: '默认错误',
        log: false
      })
      expect(data).toBeNull()
      expect(error).toBe('默认错误')
    })
  })

  describe('trySync', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should return data on success', () => {
      const [data, error] = trySync(() => 'success')
      expect(data).toBe('success')
      expect(error).toBeNull()
    })

    it('should return error on failure', () => {
      const [data, error] = trySync(
        () => {
          throw new Error('失败')
        },
        { log: false }
      )
      expect(data).toBeNull()
      expect(error).toBe('失败')
    })
  })
})
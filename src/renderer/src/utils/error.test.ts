import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notification } from 'antd'
import {
  AppError,
  AppErrorCode,
  extractErrorMessage,
  handleError,
  createErrorHandler,
  showErrorWithRecovery,
  tryAsync,
  trySync
} from '@utils/error'

describe('error utils', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from AppError', () => {
      const error = new AppError(AppErrorCode.PROJECT_OPEN_FAILED, '打开项目失败')
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

  describe('AppError', () => {
    it('should have correct name', () => {
      const error = new AppError(AppErrorCode.UNKNOWN_ERROR, '未知错误')
      expect(error.name).toBe('AppError')
    })

    it('should store code', () => {
      const error = new AppError(AppErrorCode.PROJECT_NOT_FOUND, '项目未找到')
      expect(error.code).toBe(AppErrorCode.PROJECT_NOT_FOUND)
    })

    it('should store cause', () => {
      const cause = new Error('原始错误')
      const error = new AppError(AppErrorCode.UNKNOWN_ERROR, '未知错误', cause)
      expect(error.cause).toBe(cause)
    })

    describe('getRecovery', () => {
      it('should return recovery for PROJECT_NOT_FOUND', () => {
        const error = new AppError(AppErrorCode.PROJECT_NOT_FOUND, '项目未找到')
        const recovery = error.getRecovery()
        expect(recovery.recoverable).toBe(true)
        expect(recovery.suggestion).toContain('项目路径')
        expect(recovery.action).toBeDefined()
        expect(recovery.action?.label).toBeDefined()
      })

      it('should return recovery for PROJECT_CREATE_FAILED', () => {
        const error = new AppError(AppErrorCode.PROJECT_CREATE_FAILED, '创建失败')
        const recovery = error.getRecovery()
        expect(recovery.recoverable).toBe(true)
        expect(recovery.suggestion).toContain('写入权限')
      })

      it('should return recovery for FILE_NOT_FOUND', () => {
        const error = new AppError(AppErrorCode.FILE_NOT_FOUND, '文件未找到')
        const recovery = error.getRecovery()
        expect(recovery.recoverable).toBe(true)
        expect(recovery.suggestion).toContain('刷新文件列表')
      })

      it('should return recovery for GIT_OPERATION_FAILED', () => {
        const error = new AppError(AppErrorCode.GIT_OPERATION_FAILED, 'Git操作失败')
        const recovery = error.getRecovery()
        expect(recovery.recoverable).toBe(true)
        expect(recovery.suggestion).toContain('Git')
      })

      it('should return non-recoverable for UNKNOWN_ERROR', () => {
        const error = new AppError(AppErrorCode.UNKNOWN_ERROR, '未知错误')
        const recovery = error.getRecovery()
        expect(recovery.recoverable).toBe(false)
        expect(recovery.suggestion).toContain('重启')
      })

      it('should fallback to UNKNOWN_ERROR for unmapped codes', () => {
        const error = new AppError(AppErrorCode.VOCABULARY_SAVE_FAILED, '保存失败')
        const recovery = error.getRecovery()
        expect(recovery.recoverable).toBe(false)
      })
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

    it('should wrap non-Error in AppError when rethrow is true', () => {
      expect(() => handleError('字符串错误', { rethrow: true })).toThrow(AppError)
    })

    it('should show notification when showNotification is true', () => {
      const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => {})
      const error = new AppError(AppErrorCode.FILE_NOT_FOUND, '文件未找到')
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('[CustomPrefix] 测试错误', error)
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
    it('should show notification with recovery suggestion for AppError', () => {
      const notificationSpy = vi.spyOn(notification, 'error').mockImplementation(() => {})
      const error = new AppError(AppErrorCode.PROJECT_NOT_FOUND, '项目未找到')
      showErrorWithRecovery(error)
      expect(notificationSpy).toHaveBeenCalled()
      notificationSpy.mockRestore()
    })

    it('should show notification without recovery for non-AppError', () => {
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

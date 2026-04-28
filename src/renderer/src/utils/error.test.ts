/**
 * 错误处理工具函数测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AppError,
  AppErrorCode,
  extractErrorMessage,
  handleError,
  createErrorHandler,
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

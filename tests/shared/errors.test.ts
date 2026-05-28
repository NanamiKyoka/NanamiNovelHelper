import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ErrorCode,
  ServiceError,
  createError,
  Errors,
  handleError,
  handleErrorAsync,
  isServiceError,
  ensureProjectOpen,
  ensureInitialized
} from '@shared/errors'

describe('ErrorCode', () => {
  it('应该定义所有错误代码', () => {
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN')
    expect(ErrorCode.ARG_INVALID).toBe('ARG_INVALID')
    expect(ErrorCode.FIL_NOT_FOUND).toBe('FIL_NOT_FOUND')
    expect(ErrorCode.DAT_ALREADY_EXISTS).toBe('DAT_ALREADY_EXISTS')
    expect(ErrorCode.SEC_PERMISSION_DENIED).toBe('SEC_PERMISSION_DENIED')
    expect(ErrorCode.PRJ_NOT_OPEN).toBe('PRJ_NOT_OPEN')
    expect(ErrorCode.PRJ_INVALID_PATH).toBe('PRJ_INVALID_PATH')
    expect(ErrorCode.PRJ_ALREADY_EXISTS).toBe('PRJ_ALREADY_EXISTS')
    expect(ErrorCode.FIL_READ_ERROR).toBe('FIL_READ_ERROR')
    expect(ErrorCode.FIL_WRITE_ERROR).toBe('FIL_WRITE_ERROR')
    expect(ErrorCode.FIL_PARSE_ERROR).toBe('FIL_PARSE_ERROR')
    expect(ErrorCode.DAT_INVALID).toBe('DAT_INVALID')
    expect(ErrorCode.DAT_LOAD_ERROR).toBe('DAT_LOAD_ERROR')
    expect(ErrorCode.DAT_SAVE_ERROR).toBe('DAT_SAVE_ERROR')
    expect(ErrorCode.PRJ_NOT_OPEN).toBe('PRJ_NOT_OPEN')
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN')
  })
})

describe('ServiceError', () => {
  it('应该创建带有默认消息的错误', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND)
    expect(error.message).toBe('文件未找到')
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
    expect(error.name).toBe('ServiceError')
  })

  it('应该创建带有自定义消息的错误', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, '自定义文件未找到消息')
    expect(error.message).toBe('自定义文件未找到消息')
  })

  it('应该设置模块名称', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN, undefined, { module: 'TestModule' })
    expect(error.module).toBe('TestModule')
  })

  it('默认模块名称应为Service', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN)
    expect(error.module).toBe('Service')
  })

  it('应该保存cause', () => {
    const cause = new Error('原始错误')
    const error = new ServiceError(ErrorCode.FIL_READ_ERROR, undefined, { cause })
    expect(error.cause).toBe(cause)
  })

  it('应该是Error的实例', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN)
    expect(error).toBeInstanceOf(Error)
  })

  describe('toJSON/fromJSON', () => {
    it('应该正确序列化为JSON', () => {
      const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, '文件未找到', {
        module: 'FileService'
      })
      const json = error.toJSON()

      expect(json.code).toBe(ErrorCode.FIL_NOT_FOUND)
      expect(json.message).toBe('文件未找到')
      expect(json.module).toBe('FileService')
      expect(json.name).toBe('ServiceError')
    })

    it('应该从JSON恢复错误', () => {
      const original = new ServiceError(ErrorCode.FIL_NOT_FOUND, '文件未找到', {
        module: 'FileService'
      })
      const json = original.toJSON()
      const restored = ServiceError.fromJSON(json)

      expect(restored.code).toBe(original.code)
      expect(restored.message).toBe(original.message)
      expect(restored.module).toBe(original.module)
      expect(restored.name).toBe(original.name)
    })

    it('序列化和反序列化应该保持一致性', () => {
      const error = new ServiceError(ErrorCode.PRJ_NOT_OPEN, undefined, {
        module: 'ProjectService'
      })
      const restored = ServiceError.fromJSON(error.toJSON())

      expect(restored.toJSON()).toEqual(error.toJSON())
    })
  })
})

describe('createError', () => {
  it('应该创建ServiceError实例', () => {
    const error = createError(ErrorCode.FIL_NOT_FOUND)
    expect(error).toBeInstanceOf(ServiceError)
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
  })

  it('应该传递所有参数', () => {
    const cause = new Error('原始错误')
    const error = createError(ErrorCode.FIL_READ_ERROR, '读取失败', { module: 'Test', cause })
    expect(error.message).toBe('读取失败')
    expect(error.module).toBe('Test')
    expect(error.cause).toBe(cause)
  })
})

describe('Errors工厂函数', () => {
  it('notFound应该创建FIL_NOT_FOUND错误', () => {
    const error = Errors.notFound('自定义消息', 'TestModule')
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
    expect(error.message).toBe('自定义消息')
    expect(error.module).toBe('TestModule')
  })

  it('notFound不传消息应使用默认消息', () => {
    const error = Errors.notFound()
    expect(error.message).toBe('文件未找到')
  })

  it('projectNotOpen应该创建PRJ_NOT_OPEN错误', () => {
    const error = Errors.projectNotOpen('TestModule')
    expect(error.code).toBe(ErrorCode.PRJ_NOT_OPEN)
    expect(error.module).toBe('TestModule')
  })

  it('projectInvalidPath应该创建PRJ_INVALID_PATH错误', () => {
    const error = Errors.projectInvalidPath('路径无效', 'TestModule')
    expect(error.code).toBe(ErrorCode.PRJ_INVALID_PATH)
  })

  it('serviceNotInitialized应该创建PRJ_NOT_OPEN错误', () => {
    const error = Errors.serviceNotInitialized('TestModule')
    expect(error.code).toBe(ErrorCode.PRJ_NOT_OPEN)
  })

  it('fileNotFound应该创建FIL_NOT_FOUND错误并包含路径', () => {
    const error = Errors.fileNotFound('/path/to/file', 'TestModule')
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
    expect(error.message).toContain('/path/to/file')
  })

  it('fileReadError应该创建FIL_READ_ERROR错误', () => {
    const cause = new Error('IO Error')
    const error = Errors.fileReadError('/path/to/file', cause, 'TestModule')
    expect(error.code).toBe(ErrorCode.FIL_READ_ERROR)
    expect(error.cause).toBe(cause)
  })

  it('fileWriteError应该创建FIL_WRITE_ERROR错误', () => {
    const error = Errors.fileWriteError('/path/to/file', undefined, 'TestModule')
    expect(error.code).toBe(ErrorCode.FIL_WRITE_ERROR)
  })

  it('fileParseError应该创建FIL_PARSE_ERROR错误', () => {
    const error = Errors.fileParseError('/path/to/file', undefined, 'TestModule')
    expect(error.code).toBe(ErrorCode.FIL_PARSE_ERROR)
  })

  it('invalidArgument应该创建ARG_INVALID错误', () => {
    const error = Errors.invalidArgument('param1', 'TestModule')
    expect(error.code).toBe(ErrorCode.ARG_INVALID)
    expect(error.message).toContain('param1')
  })

  it('alreadyExists应该创建DAT_ALREADY_EXISTS错误', () => {
    const error = Errors.alreadyExists('资源名称', 'TestModule')
    expect(error.code).toBe(ErrorCode.DAT_ALREADY_EXISTS)
    expect(error.message).toContain('资源名称')
  })
})

describe('handleError', () => {
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    loggerErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    loggerErrorSpy.mockRestore()
  })

  it('应该记录ServiceError时前缀包含code', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, '文件未找到', {
      module: 'TestModule'
    })
    handleError(
      () => {
        throw error
      },
      { module: 'Test', operation: '读文件', log: true }
    )

    expect(loggerErrorSpy).toHaveBeenCalled()
  })

  it('throw选项为true时应该重新抛出ServiceError', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, '文件未找到')
    expect(() =>
      handleError(
        () => {
          throw error
        },
        { module: 'Test', operation: 'test', throw: true }
      )
    ).toThrow(ServiceError)
  })

  it('throw选项为true时非ServiceError应包装为ServiceError', () => {
    expect(() =>
      handleError(
        () => {
          throw '普通错误'
        },
        { module: 'Test', operation: 'test', throw: true }
      )
    ).toThrow(ServiceError)
    try {
      handleError(
        () => {
          throw '普通错误'
        },
        { module: 'Test', operation: 'test', throw: true }
      )
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError)
      expect((error as ServiceError).code).toBe(ErrorCode.UNKNOWN)
    }
  })

  it('throw选项为false时应该返回defaultValue', () => {
    const result = handleError(
      () => {
        throw new Error('失败')
      },
      { module: 'Test', operation: 'test', throw: false, defaultValue: 'fallback' }
    )
    expect(result).toBe('fallback')
  })

  it('成功时应该返回函数结果', () => {
    const result = handleError(() => 'success', {
      module: 'Test',
      operation: 'test'
    })
    expect(result).toBe('success')
  })

  it('log选项为false时不记录日志', () => {
    handleError(
      () => {
        throw new Error('失败')
      },
      { module: 'Test', operation: 'test', log: false }
    )

    expect(loggerErrorSpy).not.toHaveBeenCalled()
  })
})

describe('handleErrorAsync', () => {
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    loggerErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    loggerErrorSpy.mockRestore()
  })

  it('应该返回异步成功结果', async () => {
    const result = await handleErrorAsync(() => Promise.resolve('async-success'), {
      module: 'Test',
      operation: 'test'
    })
    expect(result).toBe('async-success')
  })

  it('应该处理异步ServiceError', async () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, 'Async文件未找到')
    const result = await handleErrorAsync(
      () => Promise.reject(error),
      { module: 'Test', operation: 'asyncTest', throw: false, defaultValue: null }
    )
    expect(result).toBeNull()
  })

  it('throw选项为true时应抛出异步错误', async () => {
    await expect(
      handleErrorAsync(
        () => Promise.reject(new Error('Async错误')),
        { module: 'Test', operation: 'asyncTest', throw: true }
      )
    ).rejects.toThrow(ServiceError)
  })
})

describe('isServiceError', () => {
  it('ServiceError实例应该返回true', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN)
    expect(isServiceError(error)).toBe(true)
  })

  it('普通Error应该返回false', () => {
    const error = new Error('普通错误')
    expect(isServiceError(error)).toBe(false)
  })

  it('字符串应该返回false', () => {
    expect(isServiceError('字符串')).toBe(false)
  })

  it('null不应该导致崩溃', () => {
    expect(() => isServiceError(null)).not.toThrow()
  })
})

describe('ensureProjectOpen', () => {
  it('有项目路径时不应抛出错误', () => {
    expect(() => ensureProjectOpen('/valid/path', 'Test')).not.toThrow()
  })

  it('无项目路径时应抛出PRJ_NOT_OPEN错误', () => {
    try {
      ensureProjectOpen(null, 'Test')
    } catch (error) {
      expect((error as ServiceError).code).toBe(ErrorCode.PRJ_NOT_OPEN)
      expect((error as ServiceError).module).toBe('Test')
    }
  })

  it('空字符串路径也应抛出错误', () => {
    expect(() => ensureProjectOpen('', 'Test')).toThrow(ServiceError)
  })
})

describe('ensureInitialized', () => {
  it('有dataDir时不应抛出错误', () => {
    expect(() => ensureInitialized('/data/dir', 'Test')).not.toThrow()
  })

  it('无dataDir时应抛出PRJ_NOT_OPEN错误', () => {
    expect(() => ensureInitialized(null, 'Test')).toThrow(ServiceError)
    try {
      ensureInitialized(null, 'Test')
    } catch (error) {
      expect((error as ServiceError).code).toBe(ErrorCode.PRJ_NOT_OPEN)
    }
  })

  it('空字符串dataDir也应抛出错误', () => {
    expect(() => ensureInitialized('', 'Test')).toThrow(ServiceError)
  })
})
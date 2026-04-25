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
  ensureInitialized,
} from '@shared/errors'

describe('ErrorCode', () => {
  it('应该定义所有错误代码', () => {
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN')
    expect(ErrorCode.INVALID_ARGUMENT).toBe('INVALID_ARGUMENT')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.ALREADY_EXISTS).toBe('ALREADY_EXISTS')
    expect(ErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
    expect(ErrorCode.PROJECT_NOT_OPEN).toBe('PROJECT_NOT_OPEN')
    expect(ErrorCode.PROJECT_INVALID_PATH).toBe('PROJECT_INVALID_PATH')
    expect(ErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND')
    expect(ErrorCode.FILE_READ_ERROR).toBe('FILE_READ_ERROR')
    expect(ErrorCode.FILE_WRITE_ERROR).toBe('FILE_WRITE_ERROR')
    expect(ErrorCode.FILE_PARSE_ERROR).toBe('FILE_PARSE_ERROR')
    expect(ErrorCode.DATA_INVALID).toBe('DATA_INVALID')
    expect(ErrorCode.SERVICE_NOT_INITIALIZED).toBe('SERVICE_NOT_INITIALIZED')
    expect(ErrorCode.SERVICE_ERROR).toBe('SERVICE_ERROR')
  })
})

describe('ServiceError', () => {
  it('应该创建带有默认消息的错误', () => {
    const error = new ServiceError(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('资源未找到')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.name).toBe('ServiceError')
  })

  it('应该创建带有自定义消息的错误', () => {
    const error = new ServiceError(ErrorCode.FILE_NOT_FOUND, '自定义文件未找到消息')
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
    const error = new ServiceError(ErrorCode.FILE_READ_ERROR, undefined, { cause })
    expect(error.cause).toBe(cause)
  })

  it('应该是Error的实例', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN)
    expect(error).toBeInstanceOf(Error)
  })

  describe('toJSON/fromJSON', () => {
    it('应该正确序列化为JSON', () => {
      const error = new ServiceError(ErrorCode.FILE_NOT_FOUND, '文件未找到', { module: 'FileService' })
      const json = error.toJSON()

      expect(json).toEqual({
        code: ErrorCode.FILE_NOT_FOUND,
        message: '文件未找到',
        module: 'FileService',
        name: 'ServiceError',
      })
    })

    it('应该从JSON恢复错误', () => {
      const original = new ServiceError(ErrorCode.FILE_NOT_FOUND, '文件未找到', { module: 'FileService' })
      const json = original.toJSON()
      const restored = ServiceError.fromJSON(json)

      expect(restored.code).toBe(original.code)
      expect(restored.message).toBe(original.message)
      expect(restored.module).toBe(original.module)
      expect(restored.name).toBe(original.name)
    })

    it('序列化和反序列化应该保持一致性', () => {
      const error = new ServiceError(ErrorCode.PROJECT_NOT_OPEN, undefined, { module: 'ProjectService' })
      const restored = ServiceError.fromJSON(error.toJSON())

      expect(restored.toJSON()).toEqual(error.toJSON())
    })
  })
})

describe('createError', () => {
  it('应该创建ServiceError实例', () => {
    const error = createError(ErrorCode.NOT_FOUND)
    expect(error).toBeInstanceOf(ServiceError)
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
  })

  it('应该传递所有参数', () => {
    const cause = new Error('原始错误')
    const error = createError(ErrorCode.FILE_READ_ERROR, '读取失败', { module: 'Test', cause })
    expect(error.message).toBe('读取失败')
    expect(error.module).toBe('Test')
    expect(error.cause).toBe(cause)
  })
})

describe('Errors工厂函数', () => {
  it('notFound应该创建NOT_FOUND错误', () => {
    const error = Errors.notFound('自定义消息', 'TestModule')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('自定义消息')
    expect(error.module).toBe('TestModule')
  })

  it('notFound不传消息应使用默认消息', () => {
    const error = Errors.notFound()
    expect(error.message).toBe('资源未找到')
  })

  it('projectNotOpen应该创建PROJECT_NOT_OPEN错误', () => {
    const error = Errors.projectNotOpen('TestModule')
    expect(error.code).toBe(ErrorCode.PROJECT_NOT_OPEN)
    expect(error.module).toBe('TestModule')
  })

  it('projectInvalidPath应该创建PROJECT_INVALID_PATH错误', () => {
    const error = Errors.projectInvalidPath('路径无效', 'TestModule')
    expect(error.code).toBe(ErrorCode.PROJECT_INVALID_PATH)
  })

  it('serviceNotInitialized应该创建SERVICE_NOT_INITIALIZED错误', () => {
    const error = Errors.serviceNotInitialized('TestModule')
    expect(error.code).toBe(ErrorCode.SERVICE_NOT_INITIALIZED)
  })

  it('fileNotFound应该创建FILE_NOT_FOUND错误并包含路径', () => {
    const error = Errors.fileNotFound('/path/to/file', 'TestModule')
    expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND)
    expect(error.message).toContain('/path/to/file')
  })

  it('fileReadError应该创建FILE_READ_ERROR错误', () => {
    const cause = new Error('IO Error')
    const error = Errors.fileReadError('/path/to/file', cause, 'TestModule')
    expect(error.code).toBe(ErrorCode.FILE_READ_ERROR)
    expect(error.cause).toBe(cause)
  })

  it('fileWriteError应该创建FILE_WRITE_ERROR错误', () => {
    const error = Errors.fileWriteError('/path/to/file', undefined, 'TestModule')
    expect(error.code).toBe(ErrorCode.FILE_WRITE_ERROR)
  })

  it('fileParseError应该创建FILE_PARSE_ERROR错误', () => {
    const error = Errors.fileParseError('/path/to/file', undefined, 'TestModule')
    expect(error.code).toBe(ErrorCode.FILE_PARSE_ERROR)
  })

  it('invalidArgument应该创建INVALID_ARGUMENT错误', () => {
    const error = Errors.invalidArgument('param1', 'TestModule')
    expect(error.code).toBe(ErrorCode.INVALID_ARGUMENT)
    expect(error.message).toContain('param1')
  })

  it('alreadyExists应该创建ALREADY_EXISTS错误', () => {
    const error = Errors.alreadyExists('资源名称', 'TestModule')
    expect(error.code).toBe(ErrorCode.ALREADY_EXISTS)
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

  it('函数正常执行时应该返回结果', () => {
    const result = handleError(() => 42, { module: 'Test', operation: 'testOp' })
    expect(result).toBe(42)
  })

  it('函数抛出错误时默认返回null', () => {
    const result = handleError(() => {
      throw new Error('test error')
    }, { module: 'Test', operation: 'testOp' })

    expect(result).toBeNull()
  })

  it('throw选项为true时应该重新抛出错误', () => {
    expect(() => {
      handleError(() => {
        throw new Error('test error')
      }, { module: 'Test', operation: 'testOp', throw: true })
    }).toThrow()
  })

  it('throw选项为true时ServiceError应原样抛出', () => {
    const serviceError = new ServiceError(ErrorCode.NOT_FOUND, '未找到')

    expect(() => {
      handleError(() => {
        throw serviceError
      }, { module: 'Test', operation: 'testOp', throw: true })
    }).toThrow(serviceError)
  })

  it('throw选项为true时非ServiceError应包装为ServiceError', () => {
    try {
      handleError(() => {
        throw new Error('普通错误')
      }, { module: 'Test', operation: 'testOp', throw: true })
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError)
      expect((error as ServiceError).code).toBe(ErrorCode.SERVICE_ERROR)
    }
  })

  it('log选项为false时不应记录日志', () => {
    const loggerSpy = vi.spyOn(console, 'error')
    handleError(() => {
      throw new Error('test')
    }, { module: 'Test', operation: 'testOp', log: false })

    expect(loggerSpy).not.toHaveBeenCalled()
  })

  it('应该支持自定义defaultValue', () => {
    const result = handleError(() => {
      throw new Error('test')
    }, { module: 'Test', operation: 'testOp', defaultValue: [] })

    expect(result).toEqual([])
  })
})

describe('handleErrorAsync', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('异步函数正常执行时应该返回结果', async () => {
    const result = await handleErrorAsync(async () => 42, { module: 'Test', operation: 'testOp' })
    expect(result).toBe(42)
  })

  it('异步函数抛出错误时默认返回null', async () => {
    const result = await handleErrorAsync(async () => {
      throw new Error('test')
    }, { module: 'Test', operation: 'testOp' })

    expect(result).toBeNull()
  })

  it('throw选项为true时应该重新抛出错误', async () => {
    await expect(
      handleErrorAsync(async () => {
        throw new Error('test')
      }, { module: 'Test', operation: 'testOp', throw: true })
    ).rejects.toThrow()
  })

  it('应该正确处理异步ServiceError', async () => {
    const serviceError = new ServiceError(ErrorCode.FILE_READ_ERROR)

    await expect(
      handleErrorAsync(async () => {
        throw serviceError
      }, { module: 'Test', operation: 'testOp', throw: true })
    ).rejects.toBe(serviceError)
  })
})

describe('isServiceError', () => {
  it('ServiceError实例应返回true', () => {
    expect(isServiceError(new ServiceError(ErrorCode.UNKNOWN))).toBe(true)
  })

  it('普通Error应返回false', () => {
    expect(isServiceError(new Error('test'))).toBe(false)
  })

  it('非Error对象应返回false', () => {
    expect(isServiceError('error')).toBe(false)
    expect(isServiceError(null)).toBe(false)
    expect(isServiceError(undefined)).toBe(false)
    expect(isServiceError(42)).toBe(false)
  })
})

describe('ensureProjectOpen', () => {
  it('有项目路径时不应抛出错误', () => {
    expect(() => ensureProjectOpen('/path/to/project', 'Test')).not.toThrow()
  })

  it('无项目路径时应抛出PROJECT_NOT_OPEN错误', () => {
    expect(() => ensureProjectOpen(null, 'Test')).toThrow(ServiceError)
    try {
      ensureProjectOpen(null, 'Test')
    } catch (error) {
      expect((error as ServiceError).code).toBe(ErrorCode.PROJECT_NOT_OPEN)
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

  it('无dataDir时应抛出SERVICE_NOT_INITIALIZED错误', () => {
    expect(() => ensureInitialized(null, 'Test')).toThrow(ServiceError)
    try {
      ensureInitialized(null, 'Test')
    } catch (error) {
      expect((error as ServiceError).code).toBe(ErrorCode.SERVICE_NOT_INITIALIZED)
      expect((error as ServiceError).module).toBe('Test')
    }
  })

  it('空字符串dataDir也应抛出错误', () => {
    expect(() => ensureInitialized('', 'Test')).toThrow(ServiceError)
  })
})

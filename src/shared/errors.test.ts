import { describe, it, expect } from 'vitest'
import {
  ErrorCode,
  ServiceError,
  createError,
  Errors,
  handleError,
  handleErrorAsync,
  isServiceError
} from './errors'

describe('ErrorCode', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN')
    expect(ErrorCode.INVALID_ARGUMENT).toBe('INVALID_ARGUMENT')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.PROJECT_NOT_OPEN).toBe('PROJECT_NOT_OPEN')
    expect(ErrorCode.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND')
    expect(ErrorCode.SERVICE_NOT_INITIALIZED).toBe('SERVICE_NOT_INITIALIZED')
  })
})

describe('ServiceError', () => {
  it('should create error with code and default message', () => {
    const error = new ServiceError(ErrorCode.NOT_FOUND)
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('资源未找到')
    expect(error.module).toBe('Service')
    expect(error.name).toBe('ServiceError')
  })

  it('should create error with custom message', () => {
    const error = new ServiceError(ErrorCode.FILE_NOT_FOUND, 'Custom file not found')
    expect(error.message).toBe('Custom file not found')
  })

  it('should create error with custom module', () => {
    const error = new ServiceError(ErrorCode.NOT_FOUND, undefined, { module: 'TestModule' })
    expect(error.module).toBe('TestModule')
  })

  it('should create error with cause', () => {
    const cause = new Error('original error')
    const error = new ServiceError(ErrorCode.FILE_READ_ERROR, undefined, { cause })
    expect(error.cause).toBe(cause)
  })

  it('should serialize to JSON', () => {
    const error = new ServiceError(ErrorCode.NOT_FOUND, 'Test message', { module: 'TestModule' })
    const json = error.toJSON()
    expect(json).toEqual({
      code: ErrorCode.NOT_FOUND,
      message: 'Test message',
      module: 'TestModule',
      name: 'ServiceError'
    })
  })

  it('should deserialize from JSON', () => {
    const original = new ServiceError(ErrorCode.FILE_NOT_FOUND, 'File missing', { module: 'FS' })
    const json = original.toJSON()
    const restored = ServiceError.fromJSON(json)

    expect(restored.code).toBe(original.code)
    expect(restored.message).toBe(original.message)
    expect(restored.module).toBe(original.module)
  })

  it('should be instanceof Error', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ServiceError)
  })
})

describe('createError', () => {
  it('should create ServiceError instance', () => {
    const error = createError(ErrorCode.NOT_FOUND)
    expect(error).toBeInstanceOf(ServiceError)
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
  })

  it('should pass through all options', () => {
    const cause = new Error('test')
    const error = createError(ErrorCode.FILE_WRITE_ERROR, 'Write failed', { module: 'Test', cause })
    expect(error.code).toBe(ErrorCode.FILE_WRITE_ERROR)
    expect(error.message).toBe('Write failed')
    expect(error.module).toBe('Test')
    expect(error.cause).toBe(cause)
  })
})

describe('Errors factory', () => {
  it('should create notFound error', () => {
    const error = Errors.notFound('Item missing', 'Test')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('Item missing')
    expect(error.module).toBe('Test')
  })

  it('should create projectNotOpen error', () => {
    const error = Errors.projectNotOpen('Project')
    expect(error.code).toBe(ErrorCode.PROJECT_NOT_OPEN)
  })

  it('should create fileNotFound error with path', () => {
    const error = Errors.fileNotFound('/path/to/file.txt', 'FS')
    expect(error.code).toBe(ErrorCode.FILE_NOT_FOUND)
    expect(error.message).toContain('/path/to/file.txt')
  })

  it('should create invalidArgument error', () => {
    const error = Errors.invalidArgument('userId', 'Auth')
    expect(error.code).toBe(ErrorCode.INVALID_ARGUMENT)
    expect(error.message).toContain('userId')
  })

  it('should create alreadyExists error', () => {
    const error = Errors.alreadyExists('Project X', 'Project')
    expect(error.code).toBe(ErrorCode.ALREADY_EXISTS)
    expect(error.message).toContain('Project X')
  })
})

describe('handleError', () => {
  it('should return result on success', () => {
    const result = handleError(() => 42, { module: 'Test', operation: 'compute' })
    expect(result).toBe(42)
  })

  it('should return null on failure by default', () => {
    const result = handleError(
      () => {
        throw new Error('fail')
      },
      { module: 'Test', operation: 'compute' }
    )
    expect(result).toBeNull()
  })

  it('should return defaultValue on failure', () => {
    const result = handleError(
      () => {
        throw new Error('fail')
      },
      { module: 'Test', operation: 'compute', defaultValue: 0 }
    )
    expect(result).toBe(0)
  })

  it('should rethrow ServiceError when throw is true', () => {
    const serviceError = new ServiceError(ErrorCode.NOT_FOUND)
    expect(() => {
      handleError(
        () => {
          throw serviceError
        },
        { module: 'Test', operation: 'test', throw: true }
      )
    }).toThrow(serviceError)
  })

  it('should wrap non-ServiceError when throw is true', () => {
    expect(() => {
      handleError(
        () => {
          throw new Error('plain error')
        },
        { module: 'Test', operation: 'test', throw: true }
      )
    }).toThrow(ServiceError)
  })

  it('should not log when log is false', () => {
    const result = handleError(
      () => {
        throw new Error('quiet fail')
      },
      { module: 'Test', operation: 'test', log: false }
    )
    expect(result).toBeNull()
  })
})

describe('handleErrorAsync', () => {
  it('should return result on success', async () => {
    const result = await handleErrorAsync(async () => 42, { module: 'Test', operation: 'compute' })
    expect(result).toBe(42)
  })

  it('should return null on failure by default', async () => {
    const result = await handleErrorAsync(
      async () => {
        throw new Error('fail')
      },
      { module: 'Test', operation: 'compute' }
    )
    expect(result).toBeNull()
  })

  it('should rethrow when throw is true', async () => {
    await expect(async () => {
      await handleErrorAsync(
        async () => {
          throw new ServiceError(ErrorCode.SERVICE_ERROR)
        },
        { module: 'Test', operation: 'test', throw: true }
      )
    }).rejects.toThrow(ServiceError)
  })
})

describe('isServiceError', () => {
  it('should return true for ServiceError', () => {
    expect(isServiceError(new ServiceError(ErrorCode.UNKNOWN))).toBe(true)
  })

  it('should return false for plain Error', () => {
    expect(isServiceError(new Error('test'))).toBe(false)
  })

  it('should return false for non-Error values', () => {
    expect(isServiceError(null)).toBe(false)
    expect(isServiceError(undefined)).toBe(false)
    expect(isServiceError('error')).toBe(false)
    expect(isServiceError(42)).toBe(false)
  })
})

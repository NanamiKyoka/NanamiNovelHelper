import { describe, it, expect } from 'vitest'
import {
  ErrorCode,
  ServiceError,
  createError,
  Errors,
  handleError,
  handleErrorAsync,
  isServiceError,
  extractErrorCode,
  ERROR_CODE_META,
  CATEGORY_SUGGESTIONS
} from './errors'

describe('ErrorCode', () => {
  it('should have system error codes', () => {
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN')
    expect(ErrorCode.SYS_APP_START_FAILED).toBe('SYS_APP_START_FAILED')
    expect(ErrorCode.SYS_WINDOW_CREATE_FAILED).toBe('SYS_WINDOW_CREATE_FAILED')
    expect(ErrorCode.SYS_IPC_TIMEOUT).toBe('SYS_IPC_TIMEOUT')
    expect(ErrorCode.SYS_UNHANDLED_ERROR).toBe('SYS_UNHANDLED_ERROR')
  })

  it('should have project error codes', () => {
    expect(ErrorCode.PRJ_NOT_OPEN).toBe('PRJ_NOT_OPEN')
    expect(ErrorCode.PRJ_OPEN_FAILED).toBe('PRJ_OPEN_FAILED')
    expect(ErrorCode.PRJ_CREATE_FAILED).toBe('PRJ_CREATE_FAILED')
    expect(ErrorCode.PRJ_INVALID_PATH).toBe('PRJ_INVALID_PATH')
    expect(ErrorCode.PRJ_ALREADY_EXISTS).toBe('PRJ_ALREADY_EXISTS')
  })

  it('should have file error codes', () => {
    expect(ErrorCode.FIL_NOT_FOUND).toBe('FIL_NOT_FOUND')
    expect(ErrorCode.FIL_READ_ERROR).toBe('FIL_READ_ERROR')
    expect(ErrorCode.FIL_WRITE_ERROR).toBe('FIL_WRITE_ERROR')
    expect(ErrorCode.FIL_PARSE_ERROR).toBe('FIL_PARSE_ERROR')
  })

  it('should have data error codes', () => {
    expect(ErrorCode.DAT_INVALID).toBe('DAT_INVALID')
    expect(ErrorCode.DAT_LOAD_ERROR).toBe('DAT_LOAD_ERROR')
    expect(ErrorCode.DAT_SAVE_ERROR).toBe('DAT_SAVE_ERROR')
    expect(ErrorCode.DAT_PARSE_ERROR).toBe('DAT_PARSE_ERROR')
  })

  it('should have all category-specific codes', () => {
    expect(ErrorCode.GIT_EXEC_FAILED).toBe('GIT_EXEC_FAILED')
    expect(ErrorCode.AI_CALL_FAILED).toBe('AI_CALL_FAILED')
    expect(ErrorCode.NET_TIMEOUT).toBe('NET_TIMEOUT')
    expect(ErrorCode.SEC_PERMISSION_DENIED).toBe('SEC_PERMISSION_DENIED')
  })

  it('should have error codes for all modules', () => {
    const modules = [
      ErrorCode.VOC_LOAD_FAILED,
      ErrorCode.GRP_LOAD_FAILED,
      ErrorCode.TER_CREATE_FAILED,
      ErrorCode.SET_LOAD_FAILED,
      ErrorCode.IMG_PROCESS_FAILED,
      ErrorCode.SRC_EXECUTE_FAILED,
      ErrorCode.SKL_EXECUTE_FAILED,
      ErrorCode.BCK_CREATE_FAILED
    ]
    modules.forEach(code => {
      expect(code).toBeTruthy()
    })
  })
})

describe('ERROR_CODE_META', () => {
  it('should have metadata for all defined error codes', () => {
    const codes = Object.values(ErrorCode)
    codes.forEach(code => {
      const meta = ERROR_CODE_META[code]
      expect(meta).toBeDefined()
      expect(meta.category).toBeTruthy()
      expect(meta.severity).toBeTruthy()
      expect(meta.defaultMessage).toBeTruthy()
      expect(typeof meta.recoverable).toBe('boolean')
    })
  })

  it('should have valid severity values', () => {
    Object.values(ERROR_CODE_META).forEach(meta => {
      expect(['fatal', 'error', 'warning']).toContain(meta.severity)
    })
  })

  it('should have suggestion for all categories', () => {
    const categories = ['system', 'project', 'file', 'data', 'network', 'ai', 'git', 'unknown']
    categories.forEach(cat => {
      expect(CATEGORY_SUGGESTIONS[cat as keyof typeof CATEGORY_SUGGESTIONS]).toBeTruthy()
    })
  })
})

describe('ServiceError', () => {
  it('should create error with code and default message', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND)
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
    expect(error.message).toBe('文件未找到')
    expect(error.module).toBe('Service')
    expect(error.name).toBe('ServiceError')
  })

  it('should have severity and recoverable from meta', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND)
    expect(error.severity).toBe('error')
    expect(error.recoverable).toBe(true)
  })

  it('should create error with custom message', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, 'Custom file not found')
    expect(error.message).toBe('Custom file not found')
  })

  it('should create error with custom module', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, undefined, { module: 'TestModule' })
    expect(error.module).toBe('TestModule')
  })

  it('should create error with cause', () => {
    const cause = new Error('original error')
    const error = new ServiceError(ErrorCode.FIL_READ_ERROR, undefined, { cause })
    expect(error.cause).toBe(cause)
  })

  it('should provide meta accessor', () => {
    const error = new ServiceError(ErrorCode.NET_TIMEOUT)
    expect(error.meta.category).toBe('network')
    expect(error.meta.severity).toBe('error')
  })

  it('should provide suggestion accessor', () => {
    const error = new ServiceError(ErrorCode.NET_TIMEOUT)
    expect(error.suggestion).toBe('请检查网络连接后重试')
  })

  it('should serialize to JSON', () => {
    const error = new ServiceError(ErrorCode.FIL_NOT_FOUND, 'Test message', { module: 'TestModule' })
    const json = error.toJSON()
    expect(json.code).toBe(ErrorCode.FIL_NOT_FOUND)
    expect(json.message).toBe('Test message')
    expect(json.module).toBe('TestModule')
    expect(json.severity).toBe('error')
    expect(json.category).toBe('file')
  })

  it('should deserialize from JSON', () => {
    const original = new ServiceError(ErrorCode.FIL_NOT_FOUND, 'File missing', { module: 'FS' })
    const json = original.toJSON()
    const restored = ServiceError.fromJSON(json)

    expect(restored.code).toBe(original.code)
    expect(restored.message).toBe(original.message)
    expect(restored.module).toBe(original.module)
  })

  it('should deserialize from IPC JSON', () => {
    const restored = ServiceError.fromIpc({
      code: 'PRJ_NOT_OPEN',
      message: '项目未打开',
      module: 'ProjectService'
    })

    expect(restored.code).toBe(ErrorCode.PRJ_NOT_OPEN)
    expect(restored.message).toBe('项目未打开')
    expect(restored.module).toBe('ProjectService')
  })

  it('should fallback to UNKNOWN for unknown IPC code', () => {
    const restored = ServiceError.fromIpc({
      code: 'SOME_UNKNOWN_CODE',
      message: 'Something happened'
    })

    expect(restored.code).toBe(ErrorCode.UNKNOWN)
  })

  it('should be instanceof Error', () => {
    const error = new ServiceError(ErrorCode.UNKNOWN)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ServiceError)
  })
})

describe('createError', () => {
  it('should create ServiceError instance', () => {
    const error = createError(ErrorCode.FIL_NOT_FOUND)
    expect(error).toBeInstanceOf(ServiceError)
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
  })

  it('should pass through all options', () => {
    const cause = new Error('test')
    const error = createError(ErrorCode.FIL_WRITE_ERROR, 'Write failed', { module: 'Test', cause })
    expect(error.code).toBe(ErrorCode.FIL_WRITE_ERROR)
    expect(error.message).toBe('Write failed')
    expect(error.module).toBe('Test')
    expect(error.cause).toBe(cause)
  })
})

describe('Errors factory', () => {
  it('should create notFound error', () => {
    const error = Errors.notFound('Item missing', 'Test')
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
  })

  it('should create projectNotOpen error', () => {
    const error = Errors.projectNotOpen('Project')
    expect(error.code).toBe(ErrorCode.PRJ_NOT_OPEN)
  })

  it('should create fileNotFound error with path', () => {
    const error = Errors.fileNotFound('/path/to/file.txt', 'FS')
    expect(error.code).toBe(ErrorCode.FIL_NOT_FOUND)
    expect(error.message).toContain('/path/to/file.txt')
  })

  it('should create unknown error', () => {
    const error = Errors.unknown('Something failed', 'Test')
    expect(error.code).toBe(ErrorCode.UNKNOWN)
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
    const serviceError = new ServiceError(ErrorCode.FIL_NOT_FOUND)
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
          throw new ServiceError(ErrorCode.UNKNOWN)
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

describe('extractErrorCode', () => {
  it('should return code from ServiceError', () => {
    const error = new ServiceError(ErrorCode.NET_TIMEOUT)
    expect(extractErrorCode(error)).toBe(ErrorCode.NET_TIMEOUT)
  })

  it('should return code from IPC-like object', () => {
    const ipcError = { code: 'PRJ_NOT_OPEN', message: 'not open' }
    expect(extractErrorCode(ipcError)).toBe(ErrorCode.PRJ_NOT_OPEN)
  })

  it('should return UNKNOWN for plain Error', () => {
    expect(extractErrorCode(new Error('test'))).toBe(ErrorCode.UNKNOWN)
  })

  it('should return UNKNOWN for non-objects', () => {
    expect(extractErrorCode(null)).toBe(ErrorCode.UNKNOWN)
    expect(extractErrorCode('string error')).toBe(ErrorCode.UNKNOWN)
  })
})
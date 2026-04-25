import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Logger, createLogger, logger } from '@shared/logger'

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('基本日志方法', () => {
    it('info应该输出信息日志', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.info('test message')
      expect(consoleInfoSpy).toHaveBeenCalled()
      const call = consoleInfoSpy.mock.calls[0]
      expect(call[0]).toContain('[INFO]')
      expect(call[0]).toContain('[Test]')
      expect(call[0]).toContain('test message')
    })

    it('warn应该输出警告日志', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalled()
      const call = consoleWarnSpy.mock.calls[0]
      expect(call[0]).toContain('[WARN]')
    })

    it('error应该输出错误日志', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalled()
      const call = consoleErrorSpy.mock.calls[0]
      expect(call[0]).toContain('[ERROR]')
    })

    it('debug在启用时应该输出调试日志', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.debug('debug message')
      expect(consoleLogSpy).toHaveBeenCalled()
      const call = consoleLogSpy.mock.calls[0]
      expect(call[0]).toContain('[DEBUG]')
    })

    it('debug在禁用时不应输出', () => {
      const log = new Logger({ module: 'Test', enableDebug: false })
      log.debug('debug message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })
  })

  describe('模块标识', () => {
    it('日志应该包含模块名称', () => {
      const log = new Logger({ module: 'MyModule', enableDebug: true })
      log.info('test')
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[MyModule]')
    })

    it('不同模块的日志应显示不同名称', () => {
      const log1 = new Logger({ module: 'ModuleA', enableDebug: true })
      const log2 = new Logger({ module: 'ModuleB', enableDebug: true })
      log1.info('from A')
      log2.info('from B')
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[ModuleA]')
      expect(consoleInfoSpy.mock.calls[1][0]).toContain('[ModuleB]')
    })
  })

  describe('子日志器', () => {
    it('child应该创建子模块日志器', () => {
      const parent = new Logger({ module: 'Parent', enableDebug: true })
      const child = parent.child('Child')
      child.info('child message')
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[Parent:Child]')
    })

    it('子日志器应该继承父日志器的调试设置', () => {
      const parent = new Logger({ module: 'Parent', enableDebug: false })
      const child = parent.child('Child')
      child.debug('should not appear')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('子日志器可以链式创建', () => {
      const parent = new Logger({ module: 'A', enableDebug: true })
      const child = parent.child('B').child('C')
      child.info('deep child')
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[A:B:C]')
    })
  })

  describe('错误日志', () => {
    it('应该正确记录Error对象', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      const error = new Error('test error')
      log.error('something failed', error)
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('应该正确记录非Error对象', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.error('something failed', 'string error')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('无额外参数时也应正常工作', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.error('just a message')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('日志格式', () => {
    it('日志应包含时间戳', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.info('test')
      const message = consoleInfoSpy.mock.calls[0][0] as string
      expect(message).toMatch(/\[\d{4}-\d{2}-\d{2}T/)
    })

    it('日志应包含级别标识', () => {
      const log = new Logger({ module: 'Test', enableDebug: true })
      log.info('info test')
      log.warn('warn test')
      log.error('error test')
      expect(consoleInfoSpy.mock.calls[0][0]).toContain('[INFO]')
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]')
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]')
    })
  })
})

describe('createLogger', () => {
  it('应该创建Logger实例', () => {
    const log = createLogger('TestModule')
    expect(log).toBeInstanceOf(Logger)
  })

  it('应该支持自定义isDev函数', () => {
    const log = createLogger('Test', { isDev: () => true })
    expect(log).toBeInstanceOf(Logger)
  })
})

describe('logger全局实例', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('logger.info应该输出带模块前缀的信息', () => {
    logger.info('TestModule', 'info message')
    expect(consoleInfoSpy).toHaveBeenCalledWith('[TestModule] info message')
  })

  it('logger.warn应该输出带模块前缀的警告', () => {
    logger.warn('TestModule', 'warn message')
    expect(consoleWarnSpy).toHaveBeenCalledWith('[TestModule] warn message')
  })

  it('logger.error应该输出带模块前缀的错误', () => {
    logger.error('TestModule', 'error message')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[TestModule] error message')
  })

  it('logger.error应该正确处理Error对象', () => {
    const error = new Error('test')
    logger.error('TestModule', 'failed', error)
    expect(consoleErrorSpy).toHaveBeenCalledWith('[TestModule] failed', error)
  })
})

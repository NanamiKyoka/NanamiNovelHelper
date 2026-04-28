import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CancellationToken,
  CancellationTokenSource,
  CancellationError,
  Disposable,
  Emitter,
  Sequencer,
  Throttler,
  Limiter,
  debounce,
  dispose,
  type IDisposable
} from '@shared/async'

describe('CancellationToken', () => {
  it('默认不应被取消', () => {
    const token = new CancellationToken()
    expect(token.isCancelled).toBe(false)
  })

  it('cancel应该将isCancelled设为true', () => {
    const token = new CancellationToken()
    token.cancel()
    expect(token.isCancelled).toBe(true)
  })

  it('throwIfCancelled在未取消时不应抛出', () => {
    const token = new CancellationToken()
    expect(() => token.throwIfCancelled()).not.toThrow()
  })

  it('throwIfCancelled在已取消时应抛出CancellationError', () => {
    const token = new CancellationToken()
    token.cancel()
    expect(() => token.throwIfCancelled()).toThrow(CancellationError)
  })

  it('多次cancel不应报错', () => {
    const token = new CancellationToken()
    token.cancel()
    token.cancel()
    expect(token.isCancelled).toBe(true)
  })
})

describe('CancellationTokenSource', () => {
  it('应该创建token', () => {
    const source = new CancellationTokenSource()
    expect(source.token).toBeInstanceOf(CancellationToken)
    expect(source.token.isCancelled).toBe(false)
  })

  it('cancel应该取消关联的token', () => {
    const source = new CancellationTokenSource()
    source.cancel()
    expect(source.token.isCancelled).toBe(true)
  })
})

describe('CancellationError', () => {
  it('应该是Error的实例', () => {
    const error = new CancellationError()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CancellationError)
  })

  it('应该有正确的name和message', () => {
    const error = new CancellationError()
    expect(error.name).toBe('CancellationError')
    expect(error.message).toBe('Operation was cancelled')
  })
})

describe('Disposable', () => {
  it('dispose应该清理所有注册的资源', () => {
    const disposed: string[] = []
    const disposable = new Disposable()
    disposable._register({
      dispose: () => disposed.push('a')
    })
    disposable._register({
      dispose: () => disposed.push('b')
    })

    disposable.dispose()
    expect(disposed).toEqual(['a', 'b'])
  })

  it('_register应该返回注册的资源', () => {
    const disposable = new Disposable()
    const item: IDisposable = { dispose: vi.fn() }
    const result = disposable._register(item)
    expect(result).toBe(item)
  })
})

describe('dispose', () => {
  it('应该调用所有IDisposable的dispose方法', () => {
    const spies = [vi.fn(), vi.fn()]
    const disposables: IDisposable[] = spies.map(fn => ({ dispose: fn }))

    dispose(disposables)
    spies.forEach(spy => expect(spy).toHaveBeenCalledTimes(1))
  })
})

describe('Emitter', () => {
  it('event应该注册监听器', () => {
    const emitter = new Emitter<string>()
    const listener = vi.fn()
    emitter.event(listener)

    emitter.fire('test')
    expect(listener).toHaveBeenCalledWith('test')
  })

  it('应该支持多个监听器', () => {
    const emitter = new Emitter<number>()
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    emitter.event(listener1)
    emitter.event(listener2)

    emitter.fire(42)
    expect(listener1).toHaveBeenCalledWith(42)
    expect(listener2).toHaveBeenCalledWith(42)
  })

  it('dispose监听器后不应再收到事件', () => {
    const emitter = new Emitter<string>()
    const listener = vi.fn()
    const subscription = emitter.event(listener)

    subscription.dispose()
    emitter.fire('test')
    expect(listener).not.toHaveBeenCalled()
  })

  it('dispose emitter后不应触发监听器', () => {
    const emitter = new Emitter<string>()
    const listener = vi.fn()
    emitter.event(listener)

    emitter.dispose()
    emitter.fire('test')
    expect(listener).not.toHaveBeenCalled()
  })

  it('同一监听器多次注册应收到多次事件', () => {
    const emitter = new Emitter<string>()
    const listener = vi.fn()
    emitter.event(listener)
    emitter.event(listener)

    emitter.fire('test')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('Sequencer', () => {
  it('应该按顺序执行任务', async () => {
    const sequencer = new Sequencer()
    const order: number[] = []

    const p1 = sequencer.queue(async () => {
      order.push(1)
      return 'a'
    })

    const p2 = sequencer.queue(async () => {
      order.push(2)
      return 'b'
    })

    await Promise.all([p1, p2])
    expect(order).toEqual([1, 2])
  })

  it('前一个任务失败不应阻止后续任务', async () => {
    const sequencer = new Sequencer()

    const p1 = sequencer.queue(async () => {
      throw new Error('fail')
    })

    const p2 = sequencer.queue(async () => {
      return 'success'
    })

    await expect(p1).rejects.toThrow('fail')
    await expect(p2).resolves.toBe('success')
  })

  it('应该返回任务的结果', async () => {
    const sequencer = new Sequencer()
    const result = await sequencer.queue(async () => 42)
    expect(result).toBe(42)
  })
})

describe('Throttler', () => {
  it('没有活跃任务时应立即执行', async () => {
    const throttler = new Throttler()
    const result = await throttler.queue(async () => 'immediate')
    expect(result).toBe('immediate')
  })

  it('有活跃任务时应排队等待', async () => {
    const throttler = new Throttler()
    let resolveFirst: () => void
    const firstPromise = new Promise<void>(r => {
      resolveFirst = r
    })

    const p1 = throttler.queue(async () => {
      await firstPromise
      return 'first'
    })

    const p2 = throttler.queue(async () => 'second')

    resolveFirst!()

    const results = await Promise.all([p1, p2])
    expect(results).toEqual(['first', 'second'])
  })

  it('多个排队任务应只执行最后一个', async () => {
    const throttler = new Throttler()
    const executionOrder: number[] = []
    let resolveFirst: () => void
    const firstPromise = new Promise<void>(r => {
      resolveFirst = r
    })

    const p1 = throttler.queue(async () => {
      await firstPromise
      executionOrder.push(1)
      return 'first'
    })

    const p2 = throttler.queue(async () => {
      executionOrder.push(2)
      return 'second'
    })

    const p3 = throttler.queue(async () => {
      executionOrder.push(3)
      return 'third'
    })

    resolveFirst!()

    const [r1, r2, r3] = await Promise.all([p1, p2, p3])
    expect(r1).toBe('first')
    expect(r2).toBe('third')
    expect(r3).toBe('third')
    expect(executionOrder).toEqual([1, 3])
  })
})

describe('Limiter', () => {
  it('应该限制并发数', async () => {
    const limiter = new Limiter(2)
    let running = 0
    const maxRunning = { value: 0 }

    const tasks = Array.from({ length: 5 }, (_, i) =>
      limiter.queue(async () => {
        running++
        maxRunning.value = Math.max(maxRunning.value, running)
        await new Promise(r => setTimeout(r, 10))
        running--
        return i
      })
    )

    const results = await Promise.all(tasks)
    expect(maxRunning.value).toBeLessThanOrEqual(2)
    expect(results).toEqual([0, 1, 2, 3, 4])
  })

  it('并发数为1时应按顺序执行', async () => {
    const limiter = new Limiter(1)
    const order: number[] = []

    const tasks = Array.from({ length: 3 }, (_, i) =>
      limiter.queue(async () => {
        order.push(i)
        return i
      })
    )

    await Promise.all(tasks)
    expect(order).toEqual([0, 1, 2])
  })
})

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('应该延迟执行函数', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('在延迟期间再次调用应重置计时器', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('应该传递最新的参数', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    debounced('b')
    debounced('c')

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('cancel应该取消待执行的调用', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()

    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel后再调用应正常工作', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()
    debounced('test')

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('test')
  })
})

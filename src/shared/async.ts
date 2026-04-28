export class CancellationToken {
  private _isCancelled = false

  get isCancelled(): boolean {
    return this._isCancelled
  }

  cancel(): void {
    this._isCancelled = true
  }

  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CancellationError()
    }
  }
}

export class CancellationTokenSource {
  readonly token = new CancellationToken()

  cancel(): void {
    this.token.cancel()
  }
}

export class CancellationError extends Error {
  constructor() {
    super('Operation was cancelled')
    this.name = 'CancellationError'
  }
}

export interface IDisposable {
  dispose(): void
}

export function dispose(disposables: IDisposable[]): void {
  disposables.forEach(d => d.dispose())
}

export class Disposable implements IDisposable {
  private readonly _disposables: IDisposable[] = []

  protected _register<T extends IDisposable>(disposable: T): T {
    this._disposables.push(disposable)
    return disposable
  }

  dispose(): void {
    dispose(this._disposables)
  }
}

export class Emitter<T> {
  private _listeners: ((e: T) => void)[] = []
  private _disposed = false

  get event(): (listener: (e: T) => void) => IDisposable {
    return (listener: (e: T) => void) => {
      this._listeners.push(listener)
      return {
        dispose: () => {
          this._listeners = this._listeners.filter(l => l !== listener)
        }
      }
    }
  }

  fire(data: T): void {
    if (this._disposed) return
    for (const listener of this._listeners) {
      listener(data)
    }
  }

  dispose(): void {
    this._listeners = []
    this._disposed = true
  }
}

export class Sequencer {
  private _current: Promise<unknown> = Promise.resolve(null)

  queue<T>(task: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      await this._current
      return task()
    }
    this._current = run()
    return this._current as Promise<T>
  }
}

export class Throttler {
  private _current: Promise<unknown> | null = null
  private _next: Promise<unknown> | null = null

  queue<T>(task: () => Promise<T>): Promise<T> {
    if (this._current) {
      const runNext = async (): Promise<T> => {
        await this._current
        return task()
      }
      if (!this._next) {
        this._next = runNext()
      }
      return this._next as Promise<T>
    }

    const runCurrent = async (): Promise<T> => {
      try {
        return await task()
      } finally {
        this._current = null
        if (this._next) {
          const next = this._next
          this._next = null
          this._current = next
        }
      }
    }

    this._current = runCurrent()
    return this._current as Promise<T>
  }
}

export class Limiter {
  private _running = 0
  private _queue: {
    factory: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (err: unknown) => void
  }[] = []

  constructor(private readonly maxDegree: number) {}

  queue<T>(factory: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._queue.push({
        factory: factory as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject
      })
      this._consume()
    })
  }

  private _consume(): void {
    while (this._queue.length > 0 && this._running < this.maxDegree) {
      const item = this._queue.shift()!
      this._running++
      item
        .factory()
        .then(item.resolve, item.reject)
        .finally(() => {
          this._running--
          this._consume()
        })
    }
  }
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return debounced
}

export interface LRUCacheOptions<K, V> {
  max: number
  maxAge?: number
  onEvict?: (key: K, value: V) => void
}

interface CacheEntry<V> {
  value: V
  timestamp: number
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>
  private max: number
  private maxAge: number
  private onEvict?: (key: K, value: V) => void

  constructor(options: LRUCacheOptions<K, V>) {
    this.cache = new Map()
    this.max = options.max
    this.maxAge = options.maxAge ?? 0
    this.onEvict = options.onEvict
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (this.maxAge > 0 && Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key)
      return undefined
    }

    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.max) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (this.maxAge > 0 && Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key)
      return false
    }

    return true
  }

  delete(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    this.cache.delete(key)
    this.onEvict?.(key, entry.value)
    return true
  }

  clear(): void {
    if (this.onEvict) {
      for (const [key, entry] of this.cache) {
        this.onEvict(key, entry.value)
      }
    }
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  keys(): IterableIterator<K> {
    return this.cache.keys()
  }

  entries(): IterableIterator<[K, CacheEntry<V>]> {
    return this.cache.entries()
  }

  forEach(callback: (value: V, key: K) => void): void {
    for (const [key, entry] of this.cache) {
      callback(entry.value, key)
    }
  }
}

export default LRUCache

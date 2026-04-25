import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LRUCache } from '@renderer/utils/lruCache'

describe('LRUCache', () => {
  describe('基本操作', () => {
    it('应该能设置和获取值', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
    })

    it('获取不存在的key应返回undefined', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('应该能覆盖已存在的key', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      cache.set('a', 100)
      expect(cache.get('a')).toBe(100)
    })

    it('has方法应该正确判断key是否存在', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      expect(cache.has('a')).toBe(true)
      expect(cache.has('b')).toBe(false)
    })

    it('delete方法应该正确删除key', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      expect(cache.delete('a')).toBe(true)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.has('a')).toBe(false)
    })

    it('删除不存在的key应返回false', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      expect(cache.delete('nonexistent')).toBe(false)
    })

    it('clear方法应该清空所有缓存', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()
      expect(cache.size).toBe(0)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBeUndefined()
    })

    it('size属性应该返回当前缓存大小', () => {
      const cache = new LRUCache<string, number>({ max: 5 })
      expect(cache.size).toBe(0)
      cache.set('a', 1)
      expect(cache.size).toBe(1)
      cache.set('b', 2)
      expect(cache.size).toBe(2)
      cache.delete('a')
      expect(cache.size).toBe(1)
    })
  })

  describe('LRU淘汰策略', () => {
    it('应该在超过max时淘汰最久未使用的条目', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4)

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
      expect(cache.size).toBe(3)
    })

    it('访问key应该更新其使用顺序', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.get('a')

      cache.set('d', 4)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('更新已存在的key应该刷新其使用顺序', () => {
      const cache = new LRUCache<string, number>({ max: 3 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.set('a', 100)

      cache.set('d', 4)

      expect(cache.get('a')).toBe(100)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('max为1时应该只保留最新条目', () => {
      const cache = new LRUCache<string, number>({ max: 1 })
      cache.set('a', 1)
      cache.set('b', 2)

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.size).toBe(1)
    })

    it('连续淘汰应该正确工作', () => {
      const cache = new LRUCache<string, number>({ max: 2 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4)

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })
  })

  describe('TTL过期机制', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('未过期的条目应该可以正常获取', () => {
      const cache = new LRUCache<string, number>({ max: 5, maxAge: 1000 })
      cache.set('a', 1)

      vi.advanceTimersByTime(500)

      expect(cache.get('a')).toBe(1)
    })

    it('过期的条目应该返回undefined', () => {
      const cache = new LRUCache<string, number>({ max: 5, maxAge: 1000 })
      cache.set('a', 1)

      vi.advanceTimersByTime(1001)

      expect(cache.get('a')).toBeUndefined()
    })

    it('has方法应该正确判断过期条目', () => {
      const cache = new LRUCache<string, number>({ max: 5, maxAge: 1000 })
      cache.set('a', 1)

      vi.advanceTimersByTime(1001)

      expect(cache.has('a')).toBe(false)
    })

    it('过期条目被访问时应该被自动删除', () => {
      const cache = new LRUCache<string, number>({ max: 5, maxAge: 1000 })
      cache.set('a', 1)

      vi.advanceTimersByTime(1001)

      cache.get('a')
      expect(cache.size).toBe(0)
    })

    it('maxAge为0时不应启用过期机制', () => {
      const cache = new LRUCache<string, number>({ max: 5, maxAge: 0 })
      cache.set('a', 1)

      vi.advanceTimersByTime(100000)

      expect(cache.get('a')).toBe(1)
    })

    it('不同时间设置的条目应该独立过期', () => {
      const cache = new LRUCache<string, number>({ max: 5, maxAge: 1000 })
      cache.set('a', 1)

      vi.advanceTimersByTime(500)

      cache.set('b', 2)

      vi.advanceTimersByTime(501)

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
    })
  })

  describe('onEvict回调', () => {
    it('淘汰条目时应该调用onEvict', () => {
      const onEvict = vi.fn()
      const cache = new LRUCache<string, number>({ max: 2, onEvict })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      expect(onEvict).toHaveBeenCalledWith('a', 1)
    })

    it('删除条目时应该调用onEvict', () => {
      const onEvict = vi.fn()
      const cache = new LRUCache<string, number>({ max: 5, onEvict })
      cache.set('a', 1)
      cache.delete('a')

      expect(onEvict).toHaveBeenCalledWith('a', 1)
    })

    it('clear方法应该对所有条目调用onEvict', () => {
      const onEvict = vi.fn()
      const cache = new LRUCache<string, number>({ max: 5, onEvict })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.clear()

      expect(onEvict).toHaveBeenCalledTimes(2)
      expect(onEvict).toHaveBeenCalledWith('a', 1)
      expect(onEvict).toHaveBeenCalledWith('b', 2)
    })

    it('不提供onEvict时不应报错', () => {
      const cache = new LRUCache<string, number>({ max: 2 })
      cache.set('a', 1)
      cache.set('b', 2)
      expect(() => cache.set('c', 3)).not.toThrow()
    })
  })

  describe('迭代方法', () => {
    it('keys方法应该返回所有key的迭代器', () => {
      const cache = new LRUCache<string, number>({ max: 5 })
      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      const keys = Array.from(cache.keys())
      expect(keys).toEqual(['a', 'b', 'c'])
    })

    it('forEach方法应该遍历所有条目', () => {
      const cache = new LRUCache<string, number>({ max: 5 })
      cache.set('a', 1)
      cache.set('b', 2)

      const entries: Array<[string, number]> = []
      cache.forEach((value, key) => {
        entries.push([key, value])
      })

      expect(entries).toEqual([
        ['a', 1],
        ['b', 2],
      ])
    })

    it('entries方法应该返回所有条目的迭代器', () => {
      const cache = new LRUCache<string, number>({ max: 5 })
      cache.set('a', 1)
      cache.set('b', 2)

      const entries = Array.from(cache.entries())
      expect(entries.length).toBe(2)
      expect(entries[0][0]).toBe('a')
      expect(entries[0][1].value).toBe(1)
    })
  })

  describe('边界条件', () => {
    it('应该支持各种类型的key', () => {
      const cache = new LRUCache<number, string>({ max: 5 })
      cache.set(1, 'one')
      cache.set(2, 'two')
      expect(cache.get(1)).toBe('one')
      expect(cache.get(2)).toBe('two')
    })

    it('应该支持undefined和null作为value', () => {
      const cache = new LRUCache<string, string | null | undefined>({ max: 5 })
      cache.set('a', null)
      cache.set('b', undefined)
      expect(cache.get('a')).toBeNull()
      expect(cache.get('b')).toBeUndefined()
    })

    it('空缓存的操作不应报错', () => {
      const cache = new LRUCache<string, number>({ max: 5 })
      expect(() => cache.get('a')).not.toThrow()
      expect(() => cache.delete('a')).not.toThrow()
      expect(() => cache.clear()).not.toThrow()
    })

    it('重复set相同key不应增加size', () => {
      const cache = new LRUCache<string, number>({ max: 5 })
      cache.set('a', 1)
      cache.set('a', 2)
      cache.set('a', 3)
      expect(cache.size).toBe(1)
      expect(cache.get('a')).toBe(3)
    })
  })
})

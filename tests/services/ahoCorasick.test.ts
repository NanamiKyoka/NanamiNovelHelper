import { describe, it, expect } from 'vitest'
import { AhoCorasick, createAhoCorasick } from '@renderer/services/ahoCorasick'
import type { HighlightPattern } from '@shared/highlight'

function createPattern(
  overrides: Partial<HighlightPattern> & { id: string; name: string }
): HighlightPattern {
  return {
    aliases: [],
    color: '#1890ff',
    typeId: 'character',
    matchMode: 'wholeWord',
    caseSensitive: false,
    isSensitive: false,
    priority: 10,
    ...overrides
  }
}

describe('AhoCorasick', () => {
  describe('基本匹配', () => {
    it('应该匹配单个模式', () => {
      const ac = new AhoCorasick()
      const pattern = createPattern({ id: '1', name: '张三' })
      ac.addPattern(pattern)
      ac.build()

      const results = ac.search('张三去了北京')
      expect(results.length).toBe(1)
      expect(results[0].matchedText).toBe('张三')
      expect(results[0].patternId).toBe('1')
    })

    it('应该匹配多个不同模式', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.addPattern(createPattern({ id: '2', name: '北京' }))
      ac.build()

      const results = ac.search('张三去了北京')
      expect(results.length).toBe(2)
      expect(results.map(r => r.patternId)).toContain('1')
      expect(results.map(r => r.patternId)).toContain('2')
    })

    it('应该匹配同一模式的多次出现', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      const results = ac.search('张三遇到张三')
      expect(results.length).toBe(2)
      expect(results[0].start).toBe(0)
      expect(results[1].start).toBe(4)
    })

    it('无匹配时应返回空数组', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      const results = ac.search('李四去了上海')
      expect(results).toEqual([])
    })

    it('空文本应返回空数组', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      expect(ac.search('')).toEqual([])
    })
  })

  describe('大小写敏感', () => {
    it('默认不区分大小写', () => {
      const ac = new AhoCorasick(false)
      ac.addPattern(createPattern({ id: '1', name: 'Hello', caseSensitive: false }))
      ac.build()

      const results = ac.search('hello world HELLO')
      expect(results.length).toBe(2)
    })

    it('区分大小写模式', () => {
      const ac = new AhoCorasick(true)
      ac.addPattern(createPattern({ id: '1', name: 'Hello', caseSensitive: true }))
      ac.build()

      const results = ac.search('hello world Hello')
      expect(results.length).toBe(1)
      expect(results[0].matchedText).toBe('Hello')
    })
  })

  describe('别名匹配', () => {
    it('应该匹配模式的别名', () => {
      const ac = new AhoCorasick()
      ac.addPattern(
        createPattern({
          id: '1',
          name: '张三',
          aliases: ['小三', '三哥']
        })
      )
      ac.build()

      const results = ac.search('小三和三哥在一起')
      expect(results.length).toBe(2)
      expect(results.map(r => r.matchedText)).toContain('小三')
      expect(results.map(r => r.matchedText)).toContain('三哥')
    })
  })

  describe('模式管理', () => {
    it('addPatterns应该批量添加模式', () => {
      const ac = new AhoCorasick()
      ac.addPatterns([
        createPattern({ id: '1', name: '张三' }),
        createPattern({ id: '2', name: '李四' })
      ])
      ac.build()

      const results = ac.search('张三和李四')
      expect(results.length).toBe(2)
    })

    it('removePattern应该移除指定模式', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.addPattern(createPattern({ id: '2', name: '李四' }))
      ac.build()

      ac.removePattern('1')
      ac.build()

      const results = ac.search('张三和李四')
      expect(results.length).toBe(1)
      expect(results[0].patternId).toBe('2')
    })

    it('updatePattern应该更新模式', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      ac.updatePattern(createPattern({ id: '1', name: '张四' }))
      ac.build()

      const results = ac.search('张三和张四')
      expect(results.length).toBe(1)
      expect(results[0].matchedText).toBe('张四')
    })

    it('clear应该清空所有模式', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      ac.clear()

      expect(ac.getPatternCount()).toBe(0)
      expect(ac.isBuilt()).toBe(false)
    })

    it('getPatternCount应该返回正确的模式数量', () => {
      const ac = new AhoCorasick()
      expect(ac.getPatternCount()).toBe(0)

      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      expect(ac.getPatternCount()).toBe(1)

      ac.addPattern(createPattern({ id: '2', name: '李四', aliases: ['四哥'] }))
      expect(ac.getPatternCount()).toBe(3)
    })
  })

  describe('增量更新', () => {
    it('添加新模式后应该自动重建', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      ac.addPattern(createPattern({ id: '2', name: '李四' }))

      const results = ac.search('张三和李四')
      expect(results.length).toBe(2)
    })

    it('isBuilt应该正确反映构建状态', () => {
      const ac = new AhoCorasick()
      expect(ac.isBuilt()).toBe(false)

      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      expect(ac.isBuilt()).toBe(false)

      ac.build()
      expect(ac.isBuilt()).toBe(true)

      ac.addPattern(createPattern({ id: '2', name: '李四' }))
      expect(ac.isBuilt()).toBe(false)
    })
  })

  describe('searchHighlights', () => {
    it('应该返回HighlightMatch格式的结果', () => {
      const ac = new AhoCorasick()
      ac.addPattern(
        createPattern({
          id: '1',
          name: '张三',
          color: '#ff0000',
          typeId: 'character'
        })
      )
      ac.build()

      const matches = ac.searchHighlights('张三去了北京')
      expect(matches.length).toBe(1)
      expect(matches[0]).toMatchObject({
        from: 0,
        to: 2,
        text: '张三',
        entryId: '1',
        entryName: '张三',
        typeId: 'character',
        color: '#ff0000',
        isSensitive: false
      })
    })

    it('应该按位置排序匹配结果', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '2', name: '北京' }))
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      const matches = ac.searchHighlights('张三去了北京')
      expect(matches[0].text).toBe('张三')
      expect(matches[1].text).toBe('北京')
    })

    it('filterPatterns应该过滤指定模式', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.addPattern(createPattern({ id: '2', name: '北京' }))
      ac.build()

      const matches = ac.searchHighlights('张三去了北京', {
        filterPatterns: new Set(['2'])
      })
      expect(matches.length).toBe(1)
      expect(matches[0].entryId).toBe('2')
    })

    it('应该去重相同位置的匹配', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.addPattern(createPattern({ id: '2', name: '张三', aliases: [] }))
      ac.build()

      const matches = ac.searchHighlights('张三去了北京')
      const positions = matches.map(m => `${m.from}-${m.to}`)
      const uniquePositions = new Set(positions)
      expect(positions.length).toBe(uniquePositions.size)
    })
  })

  describe('全词匹配', () => {
    it('wholeWord模式下应该跳过非词边界的匹配', () => {
      const ac = new AhoCorasick()
      ac.addPattern(
        createPattern({
          id: '1',
          name: '天',
          matchMode: 'wholeWord'
        })
      )
      ac.build()

      const matches = ac.searchHighlights('天地之间', {
        wholeWord: true
      })

      expect(matches.length).toBe(0)
    })

    it('wholeWord模式下应该匹配词边界的词汇', () => {
      const ac = new AhoCorasick()
      ac.addPattern(
        createPattern({
          id: '1',
          name: '张三',
          matchMode: 'wholeWord'
        })
      )
      ac.build()

      const matches = ac.searchHighlights('张三，你好', {
        wholeWord: true
      })

      expect(matches.length).toBe(1)
    })

    it('wholeWord模式下中文字符间不应匹配', () => {
      const ac = new AhoCorasick()
      ac.addPattern(
        createPattern({
          id: '1',
          name: '张三',
          matchMode: 'wholeWord'
        })
      )
      ac.build()

      const matches = ac.searchHighlights('张三去了北京', {
        wholeWord: true
      })

      expect(matches.length).toBe(0)
    })
  })

  describe('createAhoCorasick工厂函数', () => {
    it('应该创建并构建好自动机', () => {
      const ac = createAhoCorasick([
        createPattern({ id: '1', name: '张三' }),
        createPattern({ id: '2', name: '李四' })
      ])

      expect(ac.isBuilt()).toBe(true)
      const results = ac.search('张三和李四')
      expect(results.length).toBe(2)
    })

    it('应该支持大小写敏感参数', () => {
      const ac = createAhoCorasick(
        [createPattern({ id: '1', name: 'Hello', caseSensitive: true })],
        true
      )

      const results = ac.search('hello Hello')
      expect(results.length).toBe(1)
      expect(results[0].matchedText).toBe('Hello')
    })
  })

  describe('复杂场景', () => {
    it('应该处理模式互为子串的情况', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张' }))
      ac.addPattern(createPattern({ id: '2', name: '张三' }))
      ac.build()

      const results = ac.search('张三来了')
      expect(results.length).toBe(2)
      expect(results.map(r => r.matchedText)).toContain('张')
      expect(results.map(r => r.matchedText)).toContain('张三')
    })

    it('应该处理空模式列表', () => {
      const ac = createAhoCorasick([])
      const results = ac.search('任意文本')
      expect(results).toEqual([])
    })

    it('应该处理特殊字符模式', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: 'A-1' }))
      ac.build()

      const results = ac.search('这是A-1型号')
      expect(results.length).toBe(1)
      expect(results[0].matchedText).toBe('A-1')
    })

    it('应该处理长文本匹配', () => {
      const ac = new AhoCorasick()
      ac.addPattern(createPattern({ id: '1', name: '张三' }))
      ac.build()

      const longText = '这是一段很长的文本'.repeat(100) + '张三' + '继续很长的文本'.repeat(100)
      const results = ac.search(longText)
      expect(results.length).toBe(1)
      expect(results[0].matchedText).toBe('张三')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { generateNames, getRandomSurname, copyToClipboard } from '@utils/randomName'

describe('generateNames', () => {
  it('应该生成中国人名', () => {
    const names = generateNames({ type: 'cn', count: 5 })
    expect(names.length).toBe(5)
    names.forEach(name => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('应该生成日本人名', () => {
    const names = generateNames({ type: 'jp', count: 5 })
    expect(names.length).toBe(5)
    names.forEach(name => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('应该生成西方人名', () => {
    const names = generateNames({ type: 'en', count: 5 })
    expect(names.length).toBe(5)
    names.forEach(name => {
      expect(typeof name).toBe('string')
      expect(name).toContain('·')
    })
  })

  it('应该生成势力名称', () => {
    const names = generateNames({ type: 'force', count: 5 })
    expect(names.length).toBe(5)
    names.forEach(name => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('应该生成地名', () => {
    const names = generateNames({ type: 'place', count: 5 })
    expect(names.length).toBe(5)
  })

  it('应该生成秘籍名称', () => {
    const names = generateNames({ type: 'book', count: 5 })
    expect(names.length).toBe(5)
  })

  it('应该生成法宝名称', () => {
    const names = generateNames({ type: 'item', count: 5 })
    expect(names.length).toBe(5)
  })

  it('应该生成灵药名称', () => {
    const names = generateNames({ type: 'elixir', count: 5 })
    expect(names.length).toBe(5)
  })

  it('默认count应为24', () => {
    const names = generateNames({ type: 'cn' })
    expect(names.length).toBe(24)
  })

  it('指定姓氏应使用该姓氏', () => {
    const names = generateNames({ type: 'cn', count: 10, surname: '李' })
    names.forEach(name => {
      expect(name.startsWith('李')).toBe(true)
    })
  })

  it('指定性别应生成对应名字', () => {
    const maleNames = generateNames({ type: 'cn', count: 10, gender: 'male' })
    const femaleNames = generateNames({ type: 'cn', count: 10, gender: 'female' })
    expect(maleNames.length).toBe(10)
    expect(femaleNames.length).toBe(10)
  })

  it('指定后缀应使用该后缀', () => {
    const names = generateNames({ type: 'force', count: 5, suffix: '宗' })
    names.forEach(name => {
      expect(name.endsWith('宗')).toBe(true)
    })
  })

  it('自定义类型无配置应返回空数组', () => {
    const names = generateNames({ type: 'custom' })
    expect(names).toEqual([])
  })

  it('自定义类型应生成名称', () => {
    const names = generateNames({
      type: 'custom',
      count: 5,
      customType: {
        id: 'test',
        name: '测试',
        prefixes: ['风', '雷', '水'],
        suffixes: ['剑', '刀', '枪'],
        prefixCount: [1, 2],
        usePrefixOnly: false
      }
    })
    expect(names.length).toBe(5)
  })

  it('自定义类型仅前缀模式', () => {
    const names = generateNames({
      type: 'custom',
      count: 5,
      customType: {
        id: 'test',
        name: '测试',
        prefixes: ['风', '雷', '水'],
        suffixes: ['剑'],
        prefixCount: [1, 1],
        usePrefixOnly: true
      }
    })
    expect(names.length).toBe(5)
    names.forEach(name => {
      expect(['风', '雷', '水']).toContain(name)
    })
  })
})

describe('getRandomSurname', () => {
  it('应该返回中国姓氏', () => {
    const surname = getRandomSurname('cn')
    expect(typeof surname).toBe('string')
    expect(surname.length).toBeGreaterThanOrEqual(1)
  })

  it('应该返回中国复姓', () => {
    const surname = getRandomSurname('cn', true)
    expect(typeof surname).toBe('string')
    expect(surname.length).toBeGreaterThanOrEqual(2)
  })

  it('应该返回日本姓氏', () => {
    const surname = getRandomSurname('jp')
    expect(typeof surname).toBe('string')
    expect(surname.length).toBeGreaterThanOrEqual(1)
  })

  it('应该返回西方姓氏', () => {
    const surname = getRandomSurname('en')
    expect(typeof surname).toBe('string')
    expect(surname.length).toBeGreaterThanOrEqual(1)
  })
})

describe('copyToClipboard', () => {
  it('应返回boolean', async () => {
    const result = await copyToClipboard('test')
    expect(typeof result).toBe('boolean')
  })
})

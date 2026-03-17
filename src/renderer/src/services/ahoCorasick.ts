/**
 * Aho-Corasick 自动机多模式匹配算法
 * 用于高效地在文本中查找多个词汇
 */

import type { HighlightPattern, HighlightMatch } from '@types/highlight'

/**
 * AC 自动机节点
 */
interface ACNode {
  /** 子节点映射 */
  children: Map<string, ACNode>
  /** 失败指针 */
  fail: ACNode | null
  /** 匹配到的模式列表（存储模式 ID 和结束位置偏移） */
  outputs: Array<{ patternId: string; length: number }>
  /** 是否为词尾节点 */
  isEnd: boolean
}

/**
 * 内部模式数据
 */
interface InternalPattern {
  id: string
  text: string
  pattern: HighlightPattern
}

/**
 * Aho-Corasick 自动机实现
 */
export class AhoCorasick {
  private root: ACNode
  private patterns: Map<string, InternalPattern>
  private caseSensitive: boolean
  private built: boolean

  constructor(caseSensitive: boolean = false) {
    this.root = this.createNode()
    this.patterns = new Map()
    this.caseSensitive = caseSensitive
    this.built = false
  }

  /**
   * 创建新节点
   */
  private createNode(): ACNode {
    return {
      children: new Map(),
      fail: null,
      outputs: [],
      isEnd: false
    }
  }

  /**
   * 添加模式
   */
  addPattern(pattern: HighlightPattern): void {
    const texts = [pattern.name, ...pattern.aliases]
    
    for (const text of texts) {
      const key = pattern.caseSensitive ? text : text.toLowerCase()
      const id = `${pattern.id}:${key}`
      
      this.patterns.set(id, {
        id: pattern.id,
        text: key,
        pattern
      })
    }
    
    this.built = false
  }

  /**
   * 批量添加模式
   */
  addPatterns(patterns: HighlightPattern[]): void {
    for (const pattern of patterns) {
      this.addPattern(pattern)
    }
    this.built = false
  }

  /**
   * 清空所有模式
   */
  clear(): void {
    this.root = this.createNode()
    this.patterns.clear()
    this.built = false
  }

  /**
   * 构建自动机
   */
  build(): void {
    if (this.built) return

    // 第一步：构建 Trie 树
    for (const [_, internal] of this.patterns) {
      this.insertPattern(internal)
    }

    // 第二步：使用 BFS 构建失败指针
    this.buildFailureLinks()

    this.built = true
  }

  /**
   * 将模式插入 Trie 树
   */
  private insertPattern(internal: InternalPattern): void {
    let node = this.root
    const text = internal.text

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode())
      }
      
      node = node.children.get(char)!
    }

    node.isEnd = true
    node.outputs.push({
      patternId: internal.id,
      length: text.length
    })
  }

  /**
   * 构建失败指针（BFS）
   */
  private buildFailureLinks(): void {
    const queue: ACNode[] = []

    // 根节点的直接子节点的失败指针指向根节点
    for (const [_, child] of this.root.children) {
      child.fail = this.root
      queue.push(child)
    }

    // BFS 遍历构建失败指针
    while (queue.length > 0) {
      const current = queue.shift()!

      for (const [char, child] of current.children) {
        queue.push(child)

        // 沿着失败指针找到可以转移的节点
        let fail = current.fail
        while (fail !== null && !fail.children.has(char)) {
          fail = fail.fail
        }

        child.fail = fail?.children.get(char) || this.root

        // 合并输出
        if (child.fail && child.fail.outputs.length > 0) {
          child.outputs = [...child.outputs, ...child.fail.outputs]
        }
      }
    }
  }

  /**
   * 在文本中搜索所有匹配
   */
  search(text: string): Array<{
    start: number
    end: number
    patternId: string
    matchedText: string
    pattern: HighlightPattern
  }> {
    if (!this.built) {
      this.build()
    }

    const results: Array<{
      start: number
      end: number
      patternId: string
      matchedText: string
      pattern: HighlightPattern
    }> = []

    const searchText = this.caseSensitive ? text : text.toLowerCase()
    let current = this.root

    for (let i = 0; i < searchText.length; i++) {
      const char = searchText[i]

      // 沿着失败指针找到可以转移的节点
      while (current !== this.root && !current.children.has(char)) {
        current = current.fail!
      }

      if (current.children.has(char)) {
        current = current.children.get(char)!
      }

      // 收集所有匹配
      if (current.outputs.length > 0) {
        for (const output of current.outputs) {
          const start = i - output.length + 1
          const end = i + 1
          const matchedText = text.slice(start, end)
          
          const internal = this.patterns.get(`${output.patternId}:${this.caseSensitive ? matchedText : matchedText.toLowerCase()}`)
          
          if (internal) {
            results.push({
              start,
              end,
              patternId: output.patternId,
              matchedText,
              pattern: internal.pattern
            })
          }
        }
      }
    }

    return results
  }

  /**
   * 搜索并返回高亮匹配结果
   */
  searchHighlights(text: string, options?: {
    wholeWord?: boolean
    filterPatterns?: Set<string>
  }): HighlightMatch[] {
    const rawResults = this.search(text)
    const matches: HighlightMatch[] = []
    const seen = new Set<string>()

    for (const result of rawResults) {
      // 过滤特定模式
      if (options?.filterPatterns && !options.filterPatterns.has(result.patternId)) {
        continue
      }

      // 全词匹配检查
      if (options?.wholeWord && result.pattern.matchMode === 'wholeWord') {
        const beforeChar = result.start > 0 ? text[result.start - 1] : ' '
        const afterChar = result.end < text.length ? text[result.end] : ' '
        const isWordBoundary = !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(beforeChar) && 
                               !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(afterChar)
        if (!isWordBoundary) continue
      }

      // 去重
      const key = `${result.start}-${result.end}`
      if (seen.has(key)) continue
      seen.add(key)

      matches.push({
        from: result.start,
        to: result.end,
        text: result.matchedText,
        entryId: result.pattern.id,
        entryName: result.pattern.name,
        typeId: result.pattern.typeId,
        typeName: '',
        color: result.pattern.color,
        isSensitive: result.pattern.isSensitive,
        severity: result.pattern.severity
      })
    }

    // 按位置排序
    matches.sort((a, b) => a.from - b.from)

    return matches
  }
}

/**
 * 创建 AC 自动机实例
 */
export function createAhoCorasick(patterns: HighlightPattern[], caseSensitive: boolean = false): AhoCorasick {
  const ac = new AhoCorasick(caseSensitive)
  ac.addPatterns(patterns)
  ac.build()
  return ac
}

export default AhoCorasick

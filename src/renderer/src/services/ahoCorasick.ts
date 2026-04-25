/**
 * Aho-Corasick 自动机多模式匹配算法
 * 用于高效地在文本中查找多个词汇
 * 支持增量更新模式
 */

import type { HighlightPattern, HighlightMatch } from '@shared/highlight'

interface ACNode {
  children: Map<string, ACNode>
  fail: ACNode | null
  outputs: Array<{ patternId: string; length: number }>
  isEnd: boolean
}

interface InternalPattern {
  id: string
  text: string
  pattern: HighlightPattern
}

export class AhoCorasick {
  private root: ACNode
  private patterns: Map<string, InternalPattern>
  private caseSensitive: boolean
  private built: boolean
  private pendingAdds: Set<string>
  private pendingRemoves: Set<string>

  constructor(caseSensitive: boolean = false) {
    this.root = this.createNode()
    this.patterns = new Map()
    this.caseSensitive = caseSensitive
    this.built = false
    this.pendingAdds = new Set()
    this.pendingRemoves = new Set()
  }

  private createNode(): ACNode {
    return {
      children: new Map(),
      fail: null,
      outputs: [],
      isEnd: false
    }
  }

  addPattern(pattern: HighlightPattern): void {
    const texts = [pattern.name, ...pattern.aliases]
    
    for (const text of texts) {
      const key = pattern.caseSensitive ? text : text.toLowerCase()
      const id = `${pattern.id}:${key}`
      
      if (this.patterns.has(id)) {
        this.pendingRemoves.delete(id)
      }
      
      this.patterns.set(id, {
        id: pattern.id,
        text: key,
        pattern
      })
      
      this.pendingAdds.add(id)
    }
    
    this.built = false
  }

  addPatterns(patterns: HighlightPattern[]): void {
    for (const pattern of patterns) {
      this.addPattern(pattern)
    }
  }

  removePattern(patternId: string): void {
    const keysToRemove: string[] = []
    
    for (const [key, internal] of this.patterns) {
      if (internal.pattern.id === patternId) {
        keysToRemove.push(key)
        this.pendingRemoves.add(key)
        this.pendingAdds.delete(key)
      }
    }
    
    for (const key of keysToRemove) {
      this.patterns.delete(key)
    }
    
    if (keysToRemove.length > 0) {
      this.built = false
    }
  }

  updatePattern(pattern: HighlightPattern): void {
    this.removePattern(pattern.id)
    this.addPattern(pattern)
  }

  clear(): void {
    this.root = this.createNode()
    this.patterns.clear()
    this.pendingAdds.clear()
    this.pendingRemoves.clear()
    this.built = false
  }

  build(): void {
    if (this.built) return

    if (this.pendingRemoves.size > 0 || (this.pendingAdds.size === 0 && this.patterns.size > 0)) {
      this.root = this.createNode()
      this.pendingAdds = new Set(this.patterns.keys())
    }

    for (const id of this.pendingAdds) {
      const internal = this.patterns.get(id)
      if (internal) {
        this.insertPattern(internal)
      }
    }

    this.buildFailureLinks()

    this.pendingAdds.clear()
    this.pendingRemoves.clear()
    this.built = true
  }

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

  private buildFailureLinks(): void {
    const queue: ACNode[] = []

    for (const [_, child] of this.root.children) {
      child.fail = this.root
      queue.push(child)
    }

    while (queue.length > 0) {
      const current = queue.shift()!

      for (const [char, child] of current.children) {
        queue.push(child)

        let fail = current.fail
        while (fail !== null && !fail.children.has(char)) {
          fail = fail.fail
        }

        child.fail = fail?.children.get(char) || this.root

        if (child.fail && child.fail.outputs.length > 0) {
          child.outputs = [...child.outputs, ...child.fail.outputs]
        }
      }
    }
  }

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

      while (current !== this.root && !current.children.has(char)) {
        current = current.fail!
      }

      if (current.children.has(char)) {
        current = current.children.get(char)!
      }

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

  searchHighlights(text: string, options?: {
    wholeWord?: boolean
    filterPatterns?: Set<string>
  }): HighlightMatch[] {
    const rawResults = this.search(text)
    const matches: HighlightMatch[] = []
    const seen = new Set<string>()

    for (const result of rawResults) {
      if (options?.filterPatterns && !options.filterPatterns.has(result.patternId)) {
        continue
      }

      if (options?.wholeWord && result.pattern.matchMode === 'wholeWord') {
        const beforeChar = result.start > 0 ? text[result.start - 1] : ' '
        const afterChar = result.end < text.length ? text[result.end] : ' '
        const isWordBoundary = !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(beforeChar) && 
                               !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(afterChar)
        if (!isWordBoundary) continue
      }

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

    matches.sort((a, b) => a.from - b.from)

    return matches
  }

  getPatternCount(): number {
    return this.patterns.size
  }

  isBuilt(): boolean {
    return this.built
  }
}

export function createAhoCorasick(patterns: HighlightPattern[], caseSensitive: boolean = false): AhoCorasick {
  const ac = new AhoCorasick(caseSensitive)
  ac.addPatterns(patterns)
  ac.build()
  return ac
}

export default AhoCorasick

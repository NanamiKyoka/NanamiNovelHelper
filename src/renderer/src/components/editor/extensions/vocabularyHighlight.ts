/**
 * TipTap 词汇高亮扩展
 * 支持多颜色高亮、AC自动机匹配和分词过滤
 */

import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { HighlightPattern, HighlightStyleConfig, HighlightMatch } from '@types/highlight'
import { AhoCorasick } from '@services/ahoCorasick'
import { useHighlightService } from '@services/highlightService'

export interface VocabularyHighlightOptions {
  /** 高亮模式列表 */
  patterns: HighlightPattern[]
  /** 样式配置 */
  styleConfig: HighlightStyleConfig
  /** 是否启用 */
  enabled: boolean
  /** 点击回调 */
  onClick?: (entryId: string, event: MouseEvent) => void
  /** Hover 回调 */
  onHover?: (entryId: string, event: MouseEvent) => void
}

// 扩展唯一标识
export const VocabularyHighlightPluginKey = new PluginKey('vocabularyHighlight')

// 全局状态，用于动态更新
let globalStyleConfig: HighlightStyleConfig = {
  showTextColor: true,
  showBold: false,
  showItalic: false,
  showUnderline: false,
  underlineWidth: 1,
  underlineStyle: 'solid',
  showHoverTooltip: true,
  hoverDelay: 300
}
let globalEnabled = true
let globalVersion = 0

interface CacheEntry {
  version: number
  decorations: DecorationSet
  docSize: number
}

const decorationCache = new WeakMap<any, CacheEntry>()

/**
 * 分词器实例（使用 Intl.Segmenter 进行中文分词）
 */
let segmenter: Intl.Segmenter | null = null

/**
 * 获取或创建分词器
 */
function getSegmenter(): Intl.Segmenter {
  if (!segmenter) {
    segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
  }
  return segmenter
}

/**
 * 检查匹配是否为完整词（分词过滤）
 * 用于避免单字误匹配，如"小"匹配到"小红"
 */
function isCompleteWord(text: string, start: number, end: number, pattern: HighlightPattern): boolean {
  // 如果模式配置为部分匹配，直接返回 true
  if (pattern.matchMode === 'partial') {
    return true
  }

  // 检查边界字符
  const beforeChar = start > 0 ? text[start - 1] : ' '
  const afterChar = end < text.length ? text[end] : ' '
  
  // 使用正则检查是否为词边界
  const isWordBoundary = !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(beforeChar) && 
                         !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(afterChar)
  
  if (!isWordBoundary) {
    return false
  }

  // 对于中文，使用分词器进行更精确的验证
  // 只对长度 <= 2 的词汇使用分词过滤（避免性能问题）
  const matchedText = text.slice(start, end)
  if (matchedText.length <= 2 && /[\u4e00-\u9fa5]/.test(matchedText)) {
    try {
      const seg = getSegmenter()
      const segments = Array.from(seg.segment(text))
      
      // 查找是否有完整词匹配
      let currentIndex = 0
      for (const segment of segments) {
        if (segment.isWordLike && segment.segment === matchedText) {
          // 检查位置是否匹配
          if (currentIndex === start) {
            return true
          }
        }
        currentIndex += segment.segment.length
      }
      return false
    } catch {
      // 分词失败，使用边界检查结果
      return isWordBoundary
    }
  }

  return true
}

/**
 * 更新高亮模式（从外部调用）
 * 注意：实际的 patterns 和 automaton 存储在 highlightService store 中
 */
export function updateHighlightPatterns(patterns: HighlightPattern[]): void {
  globalVersion++  // 增加版本号，强制刷新
}

/**
 * 更新高亮样式配置
 */
export function updateHighlightStyleConfig(config: HighlightStyleConfig): void {
  globalStyleConfig = config
  globalVersion++  // 增加版本号，强制刷新
}

/**
 * 更新启用状态
 */
export function updateHighlightEnabled(enabled: boolean): void {
  globalEnabled = enabled
  globalVersion++  // 增加版本号，强制刷新
}

/**
 * 清空高亮缓存（文件切换时调用）
 */
export function clearHighlightCache(): void {
  globalVersion++
}

/**
 * 词汇高亮 Mark 扩展
 * 用于存储词汇高亮信息（手动添加的高亮）
 */
export const VocabularyHighlight = Mark.create<VocabularyHighlightOptions>({
  name: 'vocabularyHighlight',

  addOptions() {
    return {
      patterns: [],
      styleConfig: {
        showTextColor: true,
        showBold: false,
        showItalic: false,
        showUnderline: false,
        underlineWidth: 1,
        underlineStyle: 'solid' as const,
        showHoverTooltip: true,
        hoverDelay: 300
      },
      enabled: true,
      onClick: undefined,
      onHover: undefined
    }
  },

  addAttributes() {
    return {
      entryId: {
        default: null,
        parseHTML: element => element.getAttribute('data-entry-id'),
        renderHTML: attributes => {
          if (!attributes.entryId) return {}
          return {
            'data-entry-id': attributes.entryId
          }
        }
      },
      color: {
        default: '#1890ff',
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          return {
            'data-color': attributes.color,
            style: `color: ${attributes.color}`
          }
        }
      },
      typeId: {
        default: null,
        parseHTML: element => element.getAttribute('data-type-id'),
        renderHTML: attributes => {
          if (!attributes.typeId) return {}
          return {
            'data-type-id': attributes.typeId
          }
        }
      },
      isSensitive: {
        default: false,
        parseHTML: element => element.getAttribute('data-sensitive') === 'true',
        renderHTML: attributes => {
          if (!attributes.isSensitive) return {}
          return {
            'data-sensitive': 'true'
          }
        }
      },
      severity: {
        default: null,
        parseHTML: element => element.getAttribute('data-severity'),
        renderHTML: attributes => {
          if (!attributes.severity) return {}
          return {
            'data-severity': attributes.severity
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-entry-id]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setVocabularyHighlight:
        (attributes: { entryId: string; color: string; typeId?: string; isSensitive?: boolean; severity?: string }) =>
        ({ chain }) => {
          return chain().setMark(this.name, attributes).run()
        },
      unsetVocabularyHighlight:
        () =>
        ({ chain }) => {
          return chain().unsetMark(this.name, { extendEmptyMarkRange: true }).run()
        },
      toggleVocabularyHighlight:
        (attributes: { entryId: string; color: string; typeId?: string }) =>
        ({ chain }) => {
          return chain().toggleMark(this.name, attributes).run()
        }
    }
  },

  addProseMirrorPlugins() {
    const extensionThis = this

    return [
      new Plugin({
        key: VocabularyHighlightPluginKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, oldSet, oldState, newState) {
            const storeState = useHighlightService.getState()
            const patterns = storeState.patterns
            const automaton = storeState.automaton
            const enabled = storeState.config?.scope.enabled ?? true
            
            if (!enabled || !globalEnabled || patterns.length === 0) {
              return DecorationSet.empty
            }

            const doc = newState.doc
            const cached = decorationCache.get(doc)
            
            const needsRecompute = 
              tr.docChanged ||
              !cached ||
              cached.version !== globalVersion ||
              cached.docSize !== doc.content.size

            if (!needsRecompute && cached) {
              return cached.decorations
            }

            const newDecorations = createHighlightDecorations(
              doc, 
              automaton,
              patterns,
              globalStyleConfig
            )
            
            decorationCache.set(doc, {
              version: globalVersion,
              decorations: newDecorations,
              docSize: doc.content.size
            })
            
            return newDecorations
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement
            const highlightEl = target.closest('[data-entry-id]')
            if (highlightEl && extensionThis.options.onClick) {
              const entryId = highlightEl.getAttribute('data-entry-id')
              if (entryId) {
                extensionThis.options.onClick(entryId, event)
                return true
              }
            }
            return false
          },
          handleDOMEvents: {
            mouseover(view, event) {
              if (!globalStyleConfig.showHoverTooltip) return false

              const target = event.target as HTMLElement
              const highlightEl = target.closest('[data-entry-id]')
              if (highlightEl && extensionThis.options.onHover) {
                const entryId = highlightEl.getAttribute('data-entry-id')
                if (entryId) {
                  extensionThis.options.onHover(entryId, event)
                  return true
                }
              }
              return false
            }
          }
        }
      })
    ]
  }
})

/**
 * 创建高亮装饰（使用 AC 自动机）
 */
function createHighlightDecorations(
  doc: any,
  automaton: AhoCorasick | null,
  patterns: HighlightPattern[],
  styleConfig: HighlightStyleConfig
): DecorationSet {
  const decorations: Decoration[] = []

  if (!automaton || patterns.length === 0) {
    return DecorationSet.empty
  }

  // 遍历文档节点
  doc.descendants((node: any, pos: number) => {
    if (!node.isText || !node.text) return

    const text = node.text

    // 使用 AC 自动机搜索
    const matches = automaton.search(text)

    for (const match of matches) {
      // match.pattern 包含完整的 HighlightPattern 对象
      const pattern = match.pattern

      const from = pos + match.start
      const to = pos + match.end

      // 检查全词匹配（分词过滤）
      if (!isCompleteWord(text, match.start, match.end, pattern)) {
        continue
      }

      // 创建装饰
      const style = getHighlightStyle(pattern.color, styleConfig, pattern.isSensitive)
      
      decorations.push(
        Decoration.inline(from, to, {
          class: 'vocabulary-highlight',
          style,
          'data-entry-id': pattern.id,
          'data-color': pattern.color,
          'data-type-id': pattern.typeId,
          'data-sensitive': String(pattern.isSensitive),
          'data-severity': pattern.severity || ''
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

/**
 * 获取高亮样式字符串
 */
function getHighlightStyle(
  color: string,
  styleConfig: HighlightStyleConfig,
  isSensitive: boolean
): string {
  const styles: string[] = []

  // 文字颜色
  if (styleConfig.showTextColor) {
    styles.push(`color: ${color}`)
  }

  // 粗体
  if (styleConfig.showBold) {
    styles.push('font-weight: bold')
  }

  // 斜体
  if (styleConfig.showItalic) {
    styles.push('font-style: italic')
  }

  // 下划线
  if (styleConfig.showUnderline) {
    const width = styleConfig.underlineWidth || 1
    const style = styleConfig.underlineStyle || 'solid'
    styles.push(`text-decoration: underline`)
    styles.push(`text-decoration-color: ${color}`)
    styles.push(`text-decoration-thickness: ${width}px`)
    styles.push(`text-decoration-style: ${style}`)
  }

  return styles.join('; ')
}

export default VocabularyHighlight

/**
 * 行号扩展
 * 为 TipTap 编辑器添加行号显示功能
 */

import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Plugin, type EditorState } from '@tiptap/pm/state'

export interface LineNumbersOptions {
  /** 是否显示行号 */
  enabled: boolean
}

/**
 * 计算文档中的块数量
 */
function getBlockPositions(state: EditorState): { pos: number; number: number }[] {
  const positions: { pos: number; number: number }[] = []
  let lineNumber = 0

  state.doc.descendants((node, pos) => {
    // 只处理块级元素（段落、标题、代码块、引用等）
    if (node.isBlock && !node.isTextblock) {
      return true // 继续遍历子节点
    }
    if (node.isTextblock) {
      lineNumber++
      positions.push({ pos: pos, number: lineNumber })
      return false // 不遍历文本块的子节点
    }
    return false
  })

  return positions
}

/**
 * 创建行号装饰
 */
function createLineNumbers(state: EditorState): DecorationSet {
  const positions = getBlockPositions(state)
  const decorations: Decoration[] = []

  positions.forEach(({ pos, number }) => {
    const decoration = Decoration.widget(
      pos,
      () => {
        const lineElement = document.createElement('span')
        lineElement.className = 'line-number'
        lineElement.textContent = String(number)
        return lineElement
      },
      {
        side: -1,
        key: `line-${number}`
      }
    )
    decorations.push(decoration)
  })

  return DecorationSet.create(state.doc, decorations)
}

export const LineNumbers = Extension.create<LineNumbersOptions>({
  name: 'lineNumbers',

  addOptions() {
    return {
      enabled: true
    }
  },

  addProseMirrorPlugins() {
    // 通过闭包访问扩展的 options
    const { enabled } = this.options

    const plugin = new Plugin({
      props: {
        decorations(state: EditorState) {
          if (!enabled) {
            return DecorationSet.empty
          }
          return createLineNumbers(state)
        }
      }
    })

    return [plugin]
  }
})

export default LineNumbers

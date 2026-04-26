/**
 * TipTap 编辑器扩展
 * 共享的扩展定义，避免代码重复
 */

import { Extension } from '@tiptap/core'

export { LineNumbers } from './lineNumbers'

export { SmartLink } from './smartLink'

export { ImagePaste, uploadImageWithResize } from './imagePaste'
export type { ImagePasteOptions } from './imagePaste'

/**
 * Tab 键扩展 - 插入两个空格
 */
export const TabInsert = Extension.create({
  name: 'tabInsert',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        this.editor.commands.insertContent('  ')
        return true
      }
    }
  }
})

/**
 * 自定义快捷键扩展
 * 提供常用的 Markdown 格式化快捷键
 */
export const CustomKeymap = Extension.create({
  name: 'customKeymap',
  addKeyboardShortcuts() {
    return {
      // Ctrl+S 保存 - 由外部处理
      'Mod-s': () => {
        return true
      },
      // Ctrl+B 粗体
      'Mod-b': () => {
        this.editor.chain().focus().toggleBold().run()
        return true
      },
      // Ctrl+I 斜体
      'Mod-i': () => {
        this.editor.chain().focus().toggleItalic().run()
        return true
      },
      // Ctrl+K 插入链接
      'Mod-k': () => {
        const url = window.prompt('输入链接地址:')
        if (url) {
          this.editor.chain().focus().setLink({ href: url }).run()
        }
        return true
      },
      // Ctrl+Shift+X 删除线
      'Mod-Shift-x': () => {
        this.editor.chain().focus().toggleStrike().run()
        return true
      },
      // Ctrl+` 行内代码
      'Mod-`': () => {
        this.editor.chain().focus().toggleCode().run()
        return true
      },
      // Ctrl+1-6 标题
      'Mod-1': () => {
        this.editor.chain().focus().toggleHeading({ level: 1 }).run()
        return true
      },
      'Mod-2': () => {
        this.editor.chain().focus().toggleHeading({ level: 2 }).run()
        return true
      },
      'Mod-3': () => {
        this.editor.chain().focus().toggleHeading({ level: 3 }).run()
        return true
      },
      'Mod-4': () => {
        this.editor.chain().focus().toggleHeading({ level: 4 }).run()
        return true
      },
      'Mod-5': () => {
        this.editor.chain().focus().toggleHeading({ level: 5 }).run()
        return true
      },
      'Mod-6': () => {
        this.editor.chain().focus().toggleHeading({ level: 6 }).run()
        return true
      },
      // Ctrl+Shift+O 有序列表
      'Mod-Shift-o': () => {
        this.editor.chain().focus().toggleOrderedList().run()
        return true
      },
      // Ctrl+Shift+U 无序列表
      'Mod-Shift-u': () => {
        this.editor.chain().focus().toggleBulletList().run()
        return true
      },
      // Ctrl+Shift+Q 引用
      'Mod-Shift-q': () => {
        this.editor.chain().focus().toggleBlockquote().run()
        return true
      },
      // Ctrl+Shift+C 代码块
      'Mod-Shift-c': () => {
        this.editor.chain().focus().toggleCodeBlock().run()
        return true
      },
      // Ctrl+A 全选
      'Mod-a': () => {
        this.editor.chain().focus().selectAll().run()
        return true
      }
    }
  }
})

/**
 * 获取基础扩展列表
 * 用于编辑器初始化
 */
export function getBaseExtensions() {
  return [
    TabInsert,
    CustomKeymap
  ]
}
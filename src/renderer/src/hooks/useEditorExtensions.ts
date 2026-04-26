/**
 * 编辑器扩展配置 Hook
 * 
 * 封装 TipTap 编辑器的扩展配置逻辑
 */

import { useCallback } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { TabInsert, CustomKeymap, LineNumbers, ImagePaste, uploadImageOriginal } from '@components/editor/extensions'
import { VocabularyHighlight } from '@components/editor/extensions/vocabularyHighlight'
import type { HighlightStyleConfig, HoverCardConfig } from '@shared/highlight'

// 创建 lowlight 实例，支持常用语言
const lowlight = createLowlight(common)

interface UseEditorExtensionsOptions {
  /** 高亮样式配置 */
  styleConfig?: HighlightStyleConfig
  /** 是否启用高亮 */
  highlightEnabled: boolean
  /** 悬浮卡片配置 */
  hoverCardConfig?: HoverCardConfig
  /** 点击词汇回调 */
  onVocabularyClick?: (entryId: string) => void
  /** 悬停词汇回调 */
  onVocabularyHover?: (entryId: string, event: MouseEvent) => void
  /** 是否显示行号 */
  showLineNumbers?: boolean
}

/**
 * 获取编辑器扩展配置
 */
export function useEditorExtensions(options: UseEditorExtensionsOptions) {
  const {
    styleConfig,
    highlightEnabled = true,
    onVocabularyClick,
    onVocabularyHover,
    showLineNumbers = false
  } = options

  const getExtensions = useCallback(() => {
    const defaultStyleConfig: HighlightStyleConfig = {
      showTextColor: true,
      showBold: false,
      showItalic: false,
      showUnderline: false,
      underlineWidth: 1,
      underlineStyle: 'solid',
      showHoverTooltip: true,
      hoverDelay: 300
    }

    const extensions = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        codeBlock: false, // 禁用默认的 codeBlock，使用 CodeBlockLowlight 替代
      }),
      // 代码块扩展（带语法高亮）
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
        HTMLAttributes: {
          class: 'code-block'
        }
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Highlight.configure({
        multicolor: true
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'editor-link'
        }
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image'
        }
      }),
      ImagePaste.configure({
        maxSize: 10 * 1024 * 1024,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        onUpload: async (file) => {
          return uploadImageOriginal(file)
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
        emptyEditorClass: 'is-empty'
      }),
      Typography,
      TabInsert,
      CustomKeymap,
      // 行号扩展
      LineNumbers.configure({
        enabled: showLineNumbers
      }),
      // 词汇高亮扩展
      VocabularyHighlight.configure({
        patterns: [], // 初始为空，通过全局状态更新
        styleConfig: styleConfig || defaultStyleConfig,
        enabled: highlightEnabled,
        onClick: (entryId: string) => {
          onVocabularyClick?.(entryId)
        },
        onHover: (entryId: string, event: MouseEvent) => {
          onVocabularyHover?.(entryId, event)
        }
      })
    ]

    return extensions
  }, [styleConfig, highlightEnabled, onVocabularyClick, onVocabularyHover, showLineNumbers])

  return {
    getExtensions
  }
}

export default useEditorExtensions

/**
 * TipTap 命令类型扩展
 */

import '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vocabularyHighlight: {
      /**
       * 设置词汇高亮
       */
      setVocabularyHighlight: (attributes: {
        entryId: string
        color: string
        typeId?: string
        isSensitive?: boolean
        severity?: string
      }) => ReturnType
      /**
       * 移除词汇高亮
       */
      unsetVocabularyHighlight: () => ReturnType
      /**
       * 切换词汇高亮
       */
      toggleVocabularyHighlight: (attributes: {
        entryId: string
        color: string
        typeId?: string
      }) => ReturnType
    }
  }
}

import { useCallback } from 'react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Markdown } from 'tiptap-markdown'
import { common, createLowlight } from 'lowlight'
import {
  TabInsert,
  CustomKeymap,
  SmartLink,
  ImagePaste,
  uploadImageOriginal
} from '@components/editor/extensions'

const lowlight = createLowlight(common)

export function useMarkdownExtensions() {
  const getExtensions = useCallback((plainText = false) => {
    if (plainText) {
      return [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          codeBlock: false,
          horizontalRule: false,
          strike: false,
          code: false
        }),
        Markdown.configure({
          html: false,
          transformPastedText: true,
          transformCopiedText: true,
          breaks: true
        }),
        Placeholder.configure({
          placeholder: 'Start editing...',
          emptyEditorClass: 'is-empty'
        }),
        TabInsert
      ]
    }

    return [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        codeBlock: false
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
        breaks: false
      }),
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
      SmartLink.configure({
        openOnClick: false,
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
        onUpload: async file => {
          return uploadImageOriginal(file)
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing Markdown...',
        emptyEditorClass: 'is-empty'
      }),
      Typography,
      TabInsert,
      CustomKeymap
    ]
  }, [])

  return { getExtensions }
}

export default useMarkdownExtensions

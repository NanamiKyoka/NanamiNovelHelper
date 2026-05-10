import { Link as TiptapLink } from '@tiptap/extension-link'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { Editor } from '@tiptap/core'

export interface LinkOptions {
  HTMLAttributes: Record<string, unknown>
  openOnClick: boolean
  onLinkClick?: (href: string, editor: Editor) => void
}

type LinkType = 'external' | 'file' | 'heading'

function detectLinkType(href: string): LinkType {
  if (href.startsWith('#')) {
    return 'heading'
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    return 'external'
  }

  return 'file'
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
}

function findHeadingPosition(editor: Editor, headingId: string): number | null {
  let foundPos: number | null = null

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const text = node.textContent
      const id = slugify(text)

      if (id === headingId || text === headingId) {
        foundPos = pos
        return false
      }
    }
    return true
  })

  return foundPos
}

export const SmartLink = TiptapLink.extend<LinkOptions>({
  name: 'smartLink',

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'editor-link'
      },
      openOnClick: false,
      onLinkClick: undefined
    }
  },

  addProseMirrorPlugins() {
    const plugins = this.parent?.() || []

    const clickPlugin = new Plugin({
      key: new PluginKey('smartLinkClickHandler'),
      props: {
        handleClick: (view: EditorView, pos: number, event: MouseEvent) => {
          const attrs = this.editor.getAttributes('link')

          if (!attrs.href) {
            return false
          }

          const target = event.target as HTMLElement
          const linkElement = target.closest('a.editor-link')

          if (!linkElement) {
            return false
          }

          event.preventDefault()

          const href = attrs.href as string
          const linkType = detectLinkType(href)

          if (this.options.onLinkClick) {
            this.options.onLinkClick(href, this.editor)
            return true
          }

          switch (linkType) {
            case 'external':
              window.api.shell.openExternal(href)
              break

            case 'heading': {
              const headingId = href.substring(1)
              const headingPos = findHeadingPosition(this.editor, headingId)

              if (headingPos !== null) {
                this.editor.chain().focus().setTextSelection(headingPos).run()

                requestAnimationFrame(() => {
                  const editorDom = this.editor.view.dom
                  const scrollContainer = editorDom.closest('.editorContainer') as HTMLElement

                  if (scrollContainer) {
                    const selection = window.getSelection()
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0)
                      const rangeRect = range.getBoundingClientRect()
                      const containerRect = scrollContainer.getBoundingClientRect()
                      const offsetInContainer = rangeRect.top - containerRect.top
                      const targetScrollTop =
                        scrollContainer.scrollTop + offsetInContainer - containerRect.height / 3
                      scrollContainer.scrollTo({
                        top: Math.max(0, targetScrollTop),
                        behavior: 'smooth'
                      })
                    }
                  }
                })
              }
              break
            }

            case 'file': {
              const editorWithFilePath = this.editor as Editor & { currentFilePath?: string }
              const currentFilePath = editorWithFilePath.currentFilePath

              if (currentFilePath && href) {
                window.dispatchEvent(
                  new CustomEvent('editor:openRelativeFile', {
                    detail: {
                      relativePath: href,
                      currentFilePath: currentFilePath
                    }
                  })
                )
              }
              break
            }
          }

          return true
        }
      }
    })

    return [...plugins, clickPlugin]
  }
})

export default SmartLink

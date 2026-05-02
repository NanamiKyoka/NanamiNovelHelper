import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { useEditorStore } from '@stores/editorStore'
import { useUIStore } from '@stores/uiStore'
import { useMarkdownExtensions } from '@hooks'
import { EditorToolbar } from './EditorToolbar'
import { SearchReplacePanel } from './SearchReplacePanel'
import styles from './MarkdownEditor.module.css'

const WORD_COUNT_DEBOUNCE_MS = 300

function getMarkdownFromEditor(editor: {
  storage: { markdown: { getMarkdown: () => string } }
}): string {
  return editor.storage.markdown.getMarkdown()
}

function plainTextToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const leadingSpaces = line.match(/^(\s*)/)?.[1] || ''
      const rest = line.slice(leadingSpaces.length)
      const preservedSpaces = leadingSpaces.replace(/ /g, '&nbsp;').replace(/\t/g, '&nbsp;&nbsp;')
      return `<p>${preservedSpaces}${escapeHtml(rest)}</p>`
    })
    .join('')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface MarkdownEditorProps {
  onChange?: (content: string) => void
  onSave?: () => void
  readonly?: boolean
  plainText?: boolean
}

export function MarkdownEditor({
  onChange,
  onSave,
  readonly = false,
  plainText = false
}: MarkdownEditorProps) {
  const settings = useEditorStore(state => state.settings)
  const updateSettings = useEditorStore(state => state.updateSettings)
  const updateContent = useEditorStore(state => state.updateContent)
  const getCurrentContent = useEditorStore(state => state.getCurrentContent)
  const saveEditorState = useEditorStore(state => state.saveEditorState)
  const getEditorState = useEditorStore(state => state.getEditorState)
  const activeTabId = useEditorStore(state => state.activeTabId)
  const tabs = useEditorStore(state => state.tabs)
  const updateCursorPosition = useEditorStore(state => state.updateCursorPosition)
  const setSelectedText = useUIStore(state => state.setSelectedText)
  const loadFileContent = useEditorStore(state => state.loadFileContent)
  const updateWordCount = useEditorStore(state => state.updateWordCount)

  const [isComposing, setIsComposing] = useState(false)
  const [searchPanelVisible, setSearchPanelVisible] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wordCountTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const currentFilePath = activeTab?.path || ''

  const currentFilePathRef = useRef<string>(currentFilePath)
  const prevFilePathRef = useRef<string | null>(null)

  useEffect(() => {
    currentFilePathRef.current = currentFilePath
  }, [currentFilePath])

  const debouncedUpdateWordCount = useCallback(
    (textContent: string) => {
      if (wordCountTimeoutRef.current) {
        clearTimeout(wordCountTimeoutRef.current)
      }
      wordCountTimeoutRef.current = setTimeout(() => {
        updateWordCount(textContent)
      }, WORD_COUNT_DEBOUNCE_MS)
    },
    [updateWordCount]
  )

  const { getExtensions } = useMarkdownExtensions()

  const initialContent = getCurrentContent()
  const editor = useEditor({
    extensions: getExtensions(plainText),
    content: plainText ? plainTextToHtml(initialContent) : initialContent,
    editable: !readonly,
    editorProps: {
      attributes: {
        class: styles.editorContent,
        spellcheck: 'false',
        style: `font-family: ${settings.fontFamily}; font-size: ${settings.fontSize}px; line-height: ${settings.lineHeight};`
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault()
          onSave?.()
          return true
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault()
          setSearchPanelVisible(true)
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      if (isComposing) return

      const content = plainText ? editor.getText() : getMarkdownFromEditor(editor)
      const textContent = editor.getText()
      updateContent(content)
      onChange?.(content)

      debouncedUpdateWordCount(textContent)

      const filePath = currentFilePathRef.current
      if (filePath) {
        saveEditorState(filePath, editor.view.state)
      }

      if (settings.autoSaveInterval > 0) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
          onSave?.()
        }, settings.autoSaveInterval)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ')
        setSelectedText(text.trim())
      } else {
        setSelectedText('')
      }

      const $from = editor.state.doc.resolve(from)
      const line =
        $from.start() === 1 ? 1 : editor.state.doc.textContent.substring(0, from).split('\n').length
      const lineStart = from - $from.textOffset
      const column = from - lineStart + 1
      updateCursorPosition({ line, column })
    }
  })

  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom

    const handleCompositionStart = () => setIsComposing(true)
    const handleCompositionEnd = () => {
      setIsComposing(false)
      const content = plainText ? editor.getText() : getMarkdownFromEditor(editor)
      const textContent = editor.getText()
      updateContent(content)
      onChange?.(content)
      debouncedUpdateWordCount(textContent)
    }

    editorElement.addEventListener('compositionstart', handleCompositionStart)
    editorElement.addEventListener('compositionend', handleCompositionEnd)

    return () => {
      editorElement.removeEventListener('compositionstart', handleCompositionStart)
      editorElement.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [editor, updateContent, onChange, debouncedUpdateWordCount, plainText])

  useEffect(() => {
    if (!editor) return

    const editorWithFilePath = editor as typeof editor & { currentFilePath?: string }
    editorWithFilePath.currentFilePath = currentFilePath
  }, [editor, currentFilePath])

  useEffect(() => {
    if (!editor) return

    const prevPath = prevFilePathRef.current
    const currentPath = currentFilePath

    if (prevPath && prevPath !== currentPath) {
      saveEditorState(prevPath, editor.view.state)
    }

    const currentContent = getCurrentContent()
    const displayContent = plainText ? plainTextToHtml(currentContent) : currentContent
    const savedState = getEditorState(currentPath)

    if (savedState) {
      try {
        editor.view.updateState(savedState as typeof editor.view.state)
      } catch {
        editor.commands.setContent(displayContent, false)
      }
    } else {
      editor.commands.setContent(displayContent, false)
    }

    const textContent = editor.getText()
    updateWordCount(textContent)

    prevFilePathRef.current = currentPath
  }, [
    editor,
    getCurrentContent,
    activeTabId,
    currentFilePath,
    getEditorState,
    saveEditorState,
    updateWordCount,
    plainText
  ])

  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom
    editorElement.style.fontFamily = settings.fontFamily
    editorElement.style.fontSize = `${settings.fontSize}px`
    editorElement.style.lineHeight = String(settings.lineHeight)
    editorElement.style.letterSpacing = `${settings.letterSpacing}px`

    const editorContainer = editorElement.closest(`.${styles.editorContainer}`) as HTMLElement
    if (editorContainer) {
      editorContainer.style.setProperty('--paragraph-spacing', `${settings.paragraphSpacing}em`)
    }
  }, [editor, settings])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (wordCountTimeoutRef.current) clearTimeout(wordCountTimeoutRef.current)
    }
  }, [])

  const goToPositionRequest = useEditorStore(state => state.goToPositionRequest)
  const clearGoToPositionRequest = useEditorStore(state => state.clearGoToPositionRequest)

  useEffect(() => {
    if (!editor || !goToPositionRequest) return

    const { filePath, matchText, matchIndex } = goToPositionRequest

    const normalizedRequestPath = filePath.replace(/\\/g, '/')
    const normalizedCurrentPath = currentFilePath.replace(/\\/g, '/')

    if (normalizedRequestPath !== normalizedCurrentPath) {
      return
    }

    const doc = editor.state.doc
    const allMatches: Array<{ from: number; to: number }> = []

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = node.text
        let searchPos = 0

        while (searchPos < text.length) {
          const index = text.indexOf(matchText, searchPos)
          if (index === -1) break
          allMatches.push({
            from: pos + index,
            to: pos + index + matchText.length
          })
          searchPos = index + 1
        }
      }
      return true
    })

    if (allMatches.length > 0 && matchIndex >= 0 && matchIndex < allMatches.length) {
      const targetMatch = allMatches[matchIndex]
      editor.chain().focus().setTextSelection({ from: targetMatch.from, to: targetMatch.to }).run()

      requestAnimationFrame(() => {
        const editorDom = editor.view.dom
        const scrollContainer = editorDom.closest(`.${styles.editorContainer}`) as HTMLElement
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

    clearGoToPositionRequest()
  }, [editor, goToPositionRequest, currentFilePath, clearGoToPositionRequest])

  const insertContentRequest = useEditorStore(state => state.insertContentRequest)
  const clearInsertContentRequest = useEditorStore(state => state.clearInsertContentRequest)

  useEffect(() => {
    if (!editor || !insertContentRequest) return

    editor.chain().focus().insertContent(insertContentRequest).run()
    clearInsertContentRequest()
  }, [editor, insertContentRequest, clearInsertContentRequest])

  const externalRefreshRequest = useEditorStore(state => state.externalRefreshRequest)
  const clearExternalRefreshRequest = useEditorStore(state => state.clearExternalRefreshRequest)
  const lastRefreshTime = useEditorStore(state => state.lastRefreshTime)

  useEffect(() => {
    if (!editor || !externalRefreshRequest) return

    if (externalRefreshRequest === currentFilePathRef.current) {
      loadFileContent(externalRefreshRequest).then(content => {
        const displayContent = plainText ? plainTextToHtml(content) : content
        editor.commands.setContent(displayContent, false)
        const textContent = editor.getText()
        updateWordCount(textContent)
      })
    }
    clearExternalRefreshRequest()
  }, [
    editor,
    externalRefreshRequest,
    loadFileContent,
    clearExternalRefreshRequest,
    updateWordCount,
    plainText
  ])

  // 监听全局刷新时间戳变化（Git操作后触发）
  useEffect(() => {
    if (!editor || lastRefreshTime === 0) return

    const filePath = currentFilePathRef.current
    if (filePath) {
      loadFileContent(filePath).then(content => {
        const displayContent = plainText ? plainTextToHtml(content) : content
        editor.commands.setContent(displayContent, false)
        const textContent = editor.getText()
        updateWordCount(textContent)
      })
    }
  }, [editor, lastRefreshTime, loadFileContent, updateWordCount, plainText])

  useEffect(() => {
    if (!editor) return

    const handleUndo = () => editor.chain().focus().undo().run()
    const handleRedo = () => editor.chain().focus().redo().run()
    const handleCut = async () => {
      const text = editor.state.selection.content().content.textContent
      if (text) {
        await navigator.clipboard.writeText(text)
        editor.chain().focus().deleteSelection().run()
      }
    }
    const handleCopy = async () => {
      const text = editor.state.selection.content().content.textContent
      if (text) {
        await navigator.clipboard.writeText(text)
      }
    }
    const handlePaste = async () => {
      const text = await navigator.clipboard.readText()
      editor.chain().focus().insertContent(text).run()
    }
    const handleSelectAll = () => editor.chain().focus().selectAll().run()
    const handleOpenSearch = () => setSearchPanelVisible(true)
    const handleOpenRelativeFile = async (
      event: CustomEvent<{ relativePath: string; currentFilePath: string }>
    ) => {
      const { relativePath, currentFilePath } = event.detail

      try {
        const dirPath = await window.electron.path.dirname(currentFilePath)
        const targetPath = await window.electron.path.join([dirPath, relativePath])
        const fileName = await window.electron.path.basename(targetPath)
        const openFile = useEditorStore.getState().openFile
        await openFile(targetPath, fileName)
      } catch (error) {
        console.error('Failed to open file:', error)
      }
    }

    window.addEventListener('editor:undo', handleUndo)
    window.addEventListener('editor:redo', handleRedo)
    window.addEventListener('editor:cut', handleCut)
    window.addEventListener('editor:copy', handleCopy)
    window.addEventListener('editor:paste', handlePaste)
    window.addEventListener('editor:selectAll', handleSelectAll)
    window.addEventListener('editor:openSearch', handleOpenSearch)
    window.addEventListener('editor:openRelativeFile', handleOpenRelativeFile as EventListener)

    return () => {
      window.removeEventListener('editor:undo', handleUndo)
      window.removeEventListener('editor:redo', handleRedo)
      window.removeEventListener('editor:cut', handleCut)
      window.removeEventListener('editor:copy', handleCopy)
      window.removeEventListener('editor:paste', handlePaste)
      window.removeEventListener('editor:selectAll', handleSelectAll)
      window.removeEventListener('editor:openSearch', handleOpenSearch)
      window.removeEventListener('editor:openRelativeFile', handleOpenRelativeFile as EventListener)
    }
  }, [editor])

  if (!editor) {
    return <div className={styles.loading}>加载编辑器...</div>
  }

  return (
    <div className={styles.editorWrapper}>
      <EditorToolbar
        editor={editor}
        settings={settings}
        onSettingsChange={(key, value) => updateSettings({ [key]: value })}
        onOpenSearch={() => setSearchPanelVisible(true)}
        fileType={activeTab?.type}
      />

      <SearchReplacePanel
        editor={editor}
        visible={searchPanelVisible}
        onClose={() => setSearchPanelVisible(false)}
      />

      <EditorContent
        editor={editor}
        className={`${styles.editorContainer} ${plainText ? styles.plainTextEditor : ''}`}
      />
    </div>
  )
}

export default MarkdownEditor

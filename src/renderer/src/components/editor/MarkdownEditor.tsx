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

interface MarkdownEditorProps {
  onChange?: (content: string) => void
  onSave?: () => void
  readonly?: boolean
}

export function MarkdownEditor({ onChange, onSave, readonly = false }: MarkdownEditorProps) {
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

  const editor = useEditor({
    extensions: getExtensions(),
    content: getCurrentContent(),
    editable: !readonly,
    editorProps: {
      attributes: {
        class: styles.editorContent,
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

      const markdownContent = getMarkdownFromEditor(editor)
      const textContent = editor.getText()
      updateContent(markdownContent)
      onChange?.(markdownContent)

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
      const markdownContent = getMarkdownFromEditor(editor)
      const textContent = editor.getText()
      updateContent(markdownContent)
      onChange?.(markdownContent)
      debouncedUpdateWordCount(textContent)
    }

    editorElement.addEventListener('compositionstart', handleCompositionStart)
    editorElement.addEventListener('compositionend', handleCompositionEnd)

    return () => {
      editorElement.removeEventListener('compositionstart', handleCompositionStart)
      editorElement.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [editor, updateContent, onChange, debouncedUpdateWordCount])

  useEffect(() => {
    if (!editor) return

    const prevPath = prevFilePathRef.current
    const currentPath = currentFilePath

    if (prevPath && prevPath !== currentPath) {
      saveEditorState(prevPath, editor.view.state)
    }

    const currentContent = getCurrentContent()
    const savedState = getEditorState(currentPath)

    if (savedState) {
      try {
        editor.view.updateState(savedState as typeof editor.view.state)
      } catch {
        editor.commands.setContent(currentContent, false)
      }
    } else {
      editor.commands.setContent(currentContent, false)
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
    updateWordCount
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

  const externalRefreshRequest = useEditorStore(state => state.externalRefreshRequest)
  const clearExternalRefreshRequest = useEditorStore(state => state.clearExternalRefreshRequest)

  useEffect(() => {
    if (!editor || !externalRefreshRequest) return

    if (externalRefreshRequest === currentFilePathRef.current) {
      loadFileContent(externalRefreshRequest).then(content => {
        editor.commands.setContent(content, false)
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
    updateWordCount
  ])

  useEffect(() => {
    if (!editor) return

    const handleUndo = () => editor.chain().focus().undo().run()
    const handleRedo = () => editor.chain().focus().redo().run()
    const handleCut = () => document.execCommand('cut')
    const handleCopy = () => document.execCommand('copy')
    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText()
        editor.chain().focus().insertContent(text).run()
      } catch {
        document.execCommand('paste')
      }
    }
    const handleSelectAll = () => editor.chain().focus().selectAll().run()
    const handleOpenSearch = () => setSearchPanelVisible(true)

    window.addEventListener('editor:undo', handleUndo)
    window.addEventListener('editor:redo', handleRedo)
    window.addEventListener('editor:cut', handleCut)
    window.addEventListener('editor:copy', handleCopy)
    window.addEventListener('editor:paste', handlePaste)
    window.addEventListener('editor:selectAll', handleSelectAll)
    window.addEventListener('editor:openSearch', handleOpenSearch)

    return () => {
      window.removeEventListener('editor:undo', handleUndo)
      window.removeEventListener('editor:redo', handleRedo)
      window.removeEventListener('editor:cut', handleCut)
      window.removeEventListener('editor:copy', handleCopy)
      window.removeEventListener('editor:paste', handlePaste)
      window.removeEventListener('editor:selectAll', handleSelectAll)
      window.removeEventListener('editor:openSearch', handleOpenSearch)
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

      <EditorContent editor={editor} className={styles.editorContainer} />
    </div>
  )
}

export default MarkdownEditor

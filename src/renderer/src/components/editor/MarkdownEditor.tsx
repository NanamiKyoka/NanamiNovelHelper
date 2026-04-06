/**
 * Markdown 编辑器核心组件
 * 基于 TipTap 实现，支持 WYSIWYG 和分栏预览两种模式
 */

import { useEffect, useRef, useState, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { EditorState } from '@tiptap/pm/state'
import { DOMParser } from '@tiptap/pm/model'
import { useEditorStore } from '@stores/editorStore'
import { useUIStore } from '@stores/uiStore'
import { useHighlightService } from '@services/highlightService'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { useEditorExtensions, useHoverCard } from '@hooks'
import { updateHighlightPatterns, updateHighlightStyleConfig, updateHighlightEnabled, clearHighlightCache } from './extensions/vocabularyHighlight'
import { HighlightHoverCard } from './HighlightHoverCard'
import { EditorToolbar } from './EditorToolbar'
import { SearchReplacePanel } from './SearchReplacePanel'
import styles from './MarkdownEditor.module.css'

interface MarkdownEditorProps {
  /** 内容变更回调 */
  onChange?: (content: string) => void
  /** 保存回调 */
  onSave?: () => void
  /** 是否只读 */
  readonly?: boolean
}

export function MarkdownEditor({ onChange, onSave, readonly = false }: MarkdownEditorProps) {
  // Store state
  const settings = useEditorStore((state) => state.settings)
  const updateSettings = useEditorStore((state) => state.updateSettings)
  const updateContent = useEditorStore((state) => state.updateContent)
  const getCurrentContent = useEditorStore((state) => state.getCurrentContent)
  const saveEditorState = useEditorStore((state) => state.saveEditorState)
  const getEditorState = useEditorStore((state) => state.getEditorState)
  const activeTabId = useEditorStore((state) => state.activeTabId)
  const tabs = useEditorStore((state) => state.tabs)
  const updateCursorPosition = useEditorStore((state) => state.updateCursorPosition)
  const setSelectedText = useUIStore((state) => state.setSelectedText)
  const loadFileContent = useEditorStore((state) => state.loadFileContent)
  
  // Local state
  const [isComposing, setIsComposing] = useState(false)
  const [searchPanelVisible, setSearchPanelVisible] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 高亮服务
  const { config, patterns, buildPatterns, hoverCardConfig } = useHighlightService()
  
  // 词汇和敏感词 store
  const { entries, types, isLoaded: vocabLoaded, entriesLoaded } = useVocabularyStore()
  const { words: sensitiveWords, isLoaded: sensitiveLoaded } = useSensitiveStore()

  // 获取当前活动标签页的文件路径
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const currentFilePath = activeTab?.path || ''
  
  // 文件路径追踪 refs
  const currentFilePathRef = useRef<string>(currentFilePath)
  const prevFilePathRef = useRef<string | null>(null)
  
  // 同步 ref
  useEffect(() => {
    currentFilePathRef.current = currentFilePath
  }, [currentFilePath])

  // 检查当前文件是否应该被排除高亮
  const shouldHighlight = useMemo(() => {
    if (!config?.scope.enabled) return false
    if (!currentFilePath) return true

    const excludeExtensions = config.scope.excludeExtensions || []
    if (excludeExtensions.length === 0) return true

    const ext = currentFilePath.split('.').pop()?.toLowerCase() || ''
    return !excludeExtensions.includes(ext)
  }, [config?.scope.enabled, config?.scope.excludeExtensions, currentFilePath])

  // 当词汇或配置变化时，更新高亮模式
  useEffect(() => {
    if (vocabLoaded && entriesLoaded && sensitiveLoaded && config) {
      buildPatterns(entries, types, sensitiveWords)
    }
  }, [entries, types, sensitiveWords, config, vocabLoaded, entriesLoaded, sensitiveLoaded, buildPatterns])

  // 悬浮卡片 hook
  const hoverCard = useHoverCard({ config: hoverCardConfig })

  // 编辑器扩展 hook
  const { getExtensions } = useEditorExtensions({
    styleConfig: config?.style,
    highlightEnabled: config?.scope.enabled ?? true,
    hoverCardConfig,
    onVocabularyClick: (entryId) => {
      console.log('Clicked vocabulary:', entryId)
    },
    onVocabularyHover: (entryId, event) => {
      hoverCard.handleHover(entryId, event)
    },
    showLineNumbers: settings.showLineNumbers
  })

  // 创建编辑器实例
  const editor = useEditor({
    extensions: getExtensions(),
    content: getCurrentContent(),
    editable: !readonly,
    editorProps: {
      attributes: {
        class: `${styles.editorContent}${settings.showLineNumbers ? ` ${styles.hasLineNumbers}` : ''}`,
        style: `font-family: ${settings.fontFamily}; font-size: ${settings.fontSize}px; line-height: ${settings.lineHeight};`
      },
      handleKeyDown: (view, event) => {
        // 处理 Ctrl+S
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault()
          onSave?.()
          return true
        }
        // 处理 Ctrl+F 打开搜索面板
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault()
          setSearchPanelVisible(true)
          return true
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      // 如果正在输入法输入，不更新内容
      if (isComposing) return

      const htmlContent = editor.getHTML()
      const textContent = editor.getText() // 纯文本用于字数统计
      updateContent(htmlContent)
      onChange?.(htmlContent)

      // 更新字数统计（使用纯文本）
      useEditorStore.getState().updateWordCount(textContent)

      // 实时保存编辑器状态（包括历史记录）到当前文件
      const filePath = currentFilePathRef.current
      if (filePath) {
        saveEditorState(filePath, editor.view.state)
      }

      // 自动保存
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

      // 更新光标位置
      const $from = editor.state.doc.resolve(from)
      const line = $from.start() === 1 ? 1 : editor.state.doc.textContent.substring(0, from).split('\n').length
      const lineStart = from - $from.textOffset
      const column = from - lineStart + 1
      updateCursorPosition({ line, column })
    }
  })

  // 当 patterns 变化时，更新扩展的全局状态
  useEffect(() => {
    if (!editor) return

    updateHighlightPatterns(patterns)
    if (config?.style) {
      updateHighlightStyleConfig(config.style)
    }
    updateHighlightEnabled(shouldHighlight)

    // 触发编辑器更新
    const { state, view } = editor
    const tr = state.tr.setMeta('vocabulary-highlight-update', true)
    view.dispatch(tr)
  }, [editor, patterns, config, shouldHighlight])

  // 输入法事件处理
  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom

    const handleCompositionStart = () => setIsComposing(true)
    const handleCompositionEnd = () => {
      setIsComposing(false)
      const htmlContent = editor.getHTML()
      const textContent = editor.getText()
      updateContent(htmlContent)
      onChange?.(htmlContent)
      // 更新字数统计（使用纯文本）
      useEditorStore.getState().updateWordCount(textContent)
    }

    editorElement.addEventListener('compositionstart', handleCompositionStart)
    editorElement.addEventListener('compositionend', handleCompositionEnd)

    return () => {
      editorElement.removeEventListener('compositionstart', handleCompositionStart)
      editorElement.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [editor, updateContent, onChange])

  // 同步内容（切换标签时保存/恢复编辑器状态）
  useEffect(() => {
    if (!editor) return

    const prevPath = prevFilePathRef.current
    const currentPath = currentFilePath
    
    // 切换前，保存当前编辑器状态
    if (prevPath && prevPath !== currentPath) {
      saveEditorState(prevPath, editor.view.state)
      clearHighlightCache()
    }

    // 获取当前文件内容
    const currentContent = getCurrentContent()
    const savedState = getEditorState(currentPath)
    
    if (savedState) {
      // 恢复缓存的状态
      try {
        editor.view.updateState(savedState as typeof editor.view.state)
      } catch {
        // 恢复失败，创建新状态
        restoreEditorContent(editor, currentContent)
      }
    } else {
      // 没有缓存，创建全新状态
      restoreEditorContent(editor, currentContent)
    }

    // 切换标签后更新字数统计（使用纯文本）
    const textContent = editor.getText()
    useEditorStore.getState().updateWordCount(textContent)
    
    prevFilePathRef.current = currentPath
  }, [editor, getCurrentContent, activeTabId, currentFilePath, getEditorState, saveEditorState])

  // 更新编辑器设置
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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])
  
  // 鼠标离开编辑器时关闭悬浮卡片
  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom
    const handleMouseLeave = () => {
      hoverCard.cancelHover()
      hoverCard.hide()
    }

    editorElement.addEventListener('mouseleave', handleMouseLeave)
    return () => editorElement.removeEventListener('mouseleave', handleMouseLeave)
  }, [editor, hoverCard])

  // 处理跳转到指定行/列的请求
  const goToPositionRequest = useEditorStore((state) => state.goToPositionRequest)
  const clearGoToPositionRequest = useEditorStore((state) => state.clearGoToPositionRequest)
  
  useEffect(() => {
    if (!editor || !goToPositionRequest) return

    const { filePath, matchText } = goToPositionRequest

    // 统一路径分隔符进行比较（使用正斜杠）
    const normalizedRequestPath = filePath.replace(/\\/g, '/')
    const normalizedCurrentPath = currentFilePath.replace(/\\/g, '/')

    console.log('[MarkdownEditor] goToPositionRequest:', {
      filePath,
      matchText,
      normalizedRequestPath,
      normalizedCurrentPath,
      isMatch: normalizedRequestPath === normalizedCurrentPath
    })

    // 只处理当前文件的跳转请求
    if (normalizedRequestPath !== normalizedCurrentPath) {
      console.log('[MarkdownEditor] 路径不匹配，跳过')
      return
    }

    // 使用 ProseMirror 的方式在文档中搜索匹配文本
    const doc = editor.state.doc
    let foundFrom = -1
    let foundTo = -1
    
    // 遍历文档节点找到匹配文本
    doc.descendants((node, pos) => {
      if (foundFrom !== -1) return false // 已经找到，停止遍历
      
      if (node.isText && node.text) {
        const text = node.text
        const index = text.indexOf(matchText)
        
        if (index !== -1) {
          // pos 是节点在文档中的起始位置
          // 加上 index 得到匹配文本的起始位置
          foundFrom = pos + index
          foundTo = pos + index + matchText.length
          console.log('[MarkdownEditor] 找到匹配:', {
            nodeText: text.substring(0, 30),
            nodePos: pos,
            matchIndex: index,
            foundFrom,
            foundTo
          })
          return false
        }
      }
      return true
    })
    
    console.log('[MarkdownEditor] 搜索结果:', { foundFrom, foundTo })
    
    if (foundFrom !== -1 && foundTo !== -1) {
      console.log('[MarkdownEditor] 设置选区:', { from: foundFrom, to: foundTo })
      
      // 设置光标位置并选中匹配文本
      editor.chain()
        .focus()
        .setTextSelection({ from: foundFrom, to: foundTo })
        .run()
      
      console.log('[MarkdownEditor] 已设置光标位置')
      
      // 延迟滚动，确保 DOM 已更新
      requestAnimationFrame(() => {
        const editorDom = editor.view.dom
        // 使用 CSS Modules 导出的类名查找滚动容器
        const scrollContainer = editorDom.closest(`.${styles.editorContainer}`) as HTMLElement
        
        if (scrollContainer) {
          const selection = window.getSelection()
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            const rangeRect = range.getBoundingClientRect()
            const containerRect = scrollContainer.getBoundingClientRect()
            
            const offsetInContainer = rangeRect.top - containerRect.top
            const targetScrollTop = scrollContainer.scrollTop + offsetInContainer - containerRect.height / 3
            
            scrollContainer.scrollTo({
              top: Math.max(0, targetScrollTop),
              behavior: 'smooth'
            })
          }
        }
      })
    } else {
      console.log('[MarkdownEditor] 未找到匹配文本')
    }

    // 清除请求
    clearGoToPositionRequest()
  }, [editor, goToPositionRequest, currentFilePath, clearGoToPositionRequest])

  // 处理外部刷新请求
  const externalRefreshRequest = useEditorStore((state) => state.externalRefreshRequest)
  const clearExternalRefreshRequest = useEditorStore((state) => state.clearExternalRefreshRequest)
  
  useEffect(() => {
    if (!editor || !externalRefreshRequest) return

    // 检查是否是当前打开的文件
    if (externalRefreshRequest === currentFilePathRef.current) {
      loadFileContent(externalRefreshRequest).then(content => {
        restoreEditorContent(editor, content)
        const textContent = editor.getText()
        useEditorStore.getState().updateWordCount(textContent)
      })
    }
    clearExternalRefreshRequest()
  }, [editor, externalRefreshRequest, loadFileContent, clearExternalRefreshRequest])

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
      
      <HighlightHoverCard
        entryId={hoverCard.state.entryId}
        isSensitive={hoverCard.state.isSensitive}
        severity={hoverCard.state.severity}
        config={hoverCard.config}
        position={hoverCard.state.position}
        visible={hoverCard.state.visible}
        onClose={() => hoverCard.hide()}
      />
    </div>
  )
}

/**
 * 恢复编辑器内容
 */
function restoreEditorContent(editor: ReturnType<typeof useEditor>, content: string) {
  try {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const parser = DOMParser.fromSchema(editor.schema)
    const newDoc = parser.parse(tempDiv)
    
    const newState = EditorState.create({
      doc: newDoc,
      plugins: editor.view.state.plugins
    })
    
    editor.view.updateState(newState)
  } catch {
    editor.chain().clearContent(false).setContent(content, false).run()
  }
}

export default MarkdownEditor

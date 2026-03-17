/**
 * Markdown 编辑器核心组件
 * 基于 TipTap 实现，支持 WYSIWYG 和分栏预览两种模式
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { EditorState } from '@tiptap/pm/state'
import { DOMParser } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEditorStore } from '@stores/editorStore'
import { useUIStore } from '@stores/uiStore'
import { useHighlightService } from '@services/highlightService'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { TabInsert, CustomKeymap } from './extensions'
import { VocabularyHighlight, updateHighlightPatterns, updateHighlightStyleConfig, updateHighlightEnabled, clearHighlightCache } from './extensions/vocabularyHighlight'
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
  const settings = useEditorStore((state) => state.settings)
  const updateSettings = useEditorStore((state) => state.updateSettings)
  const updateContent = useEditorStore((state) => state.updateContent)
  const getCurrentContent = useEditorStore((state) => state.getCurrentContent)
  const saveEditorState = useEditorStore((state) => state.saveEditorState)
  const getEditorState = useEditorStore((state) => state.getEditorState)
  const activeTabId = useEditorStore((state) => state.activeTabId)
  const tabs = useEditorStore((state) => state.tabs)
  const setSelectedText = useUIStore((state) => state.setSelectedText)
  const [isComposing, setIsComposing] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 搜索面板状态
  const [searchPanelVisible, setSearchPanelVisible] = useState(false)
  
  // 悬浮卡片状态
  const [hoverCardVisible, setHoverCardVisible] = useState(false)
  const [hoverCardEntryId, setHoverCardEntryId] = useState<string>('')
  const [hoverCardIsSensitive, setHoverCardIsSensitive] = useState(false)
  const [hoverCardSeverity, setHoverCardSeverity] = useState<string | undefined>()
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 })
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 高亮服务
  const { config, patterns, buildPatterns, hoverCardConfig } = useHighlightService()
  
  // 词汇和敏感词 store
  const { entries, types, isLoaded: vocabLoaded, entriesLoaded } = useVocabularyStore()
  const { words: sensitiveWords, isLoaded: sensitiveLoaded } = useSensitiveStore()

  // 获取当前活动标签页的文件路径
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const currentFilePath = activeTab?.path || ''
  
  // 追踪当前文件路径的 ref，用于在 onUpdate 闭包中获取最新值
  const currentFilePathRef = useRef<string>(currentFilePath)
  // 追踪前一个文件路径，用于切换时保存状态
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

    // 获取文件扩展名（不含点）
    const ext = currentFilePath.split('.').pop()?.toLowerCase() || ''
    return !excludeExtensions.includes(ext)
  }, [config?.scope.enabled, config?.scope.excludeExtensions, currentFilePath])

  // 当词汇或配置变化时，更新高亮模式
  useEffect(() => {
    if (vocabLoaded && entriesLoaded && sensitiveLoaded && config) {
      buildPatterns(entries, types, sensitiveWords)
    }
  }, [entries, types, sensitiveWords, config, vocabLoaded, entriesLoaded, sensitiveLoaded, buildPatterns])

  // 获取编辑器扩展
  const getExtensions = useCallback(() => {
    const extensions = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block'
          }
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
      Placeholder.configure({
        placeholder: '开始写作...',
        emptyEditorClass: 'is-empty'
      }),
      Typography,
      TabInsert,
      CustomKeymap,
      // 始终添加词汇高亮扩展，通过全局 enabled 状态控制是否生效
      VocabularyHighlight.configure({
        patterns: [],  // 初始为空，通过全局状态更新
        styleConfig: config?.style || {
          showTextColor: true,
          showBold: false,
          showItalic: false,
          showUnderline: false,
          underlineWidth: 1,
          underlineStyle: 'solid',
          showHoverTooltip: true,
          hoverDelay: 300
        },
        enabled: config?.scope.enabled ?? true,
        onClick: (entryId) => {
          console.log('Clicked vocabulary:', entryId)
        },
        onHover: (entryId, event) => {
          // 清除之前的定时器
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
          }
          
          // 设置延迟显示
          const delay = hoverCardConfig?.delay || 300
          hoverTimeoutRef.current = setTimeout(() => {
            const target = event.target as HTMLElement
            const highlightEl = target.closest('[data-entry-id]')
            if (highlightEl) {
              const isSensitive = highlightEl.getAttribute('data-sensitive') === 'true'
              const severity = highlightEl.getAttribute('data-severity') || undefined
              
              setHoverCardEntryId(entryId)
              setHoverCardIsSensitive(isSensitive)
              setHoverCardSeverity(severity)
              setHoverCardPosition({ x: event.clientX, y: event.clientY })
              setHoverCardVisible(true)
            }
          }, delay)
        }
      })
    ]

    return extensions
  }, [config])

  // 创建编辑器实例
  const editor = useEditor({
    extensions: getExtensions(),
    content: getCurrentContent(),
    editable: !readonly,
    editorProps: {
      attributes: {
        class: styles.editorContent,
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

      const content = editor.getHTML()
      updateContent(content)
      onChange?.(content)

      // 实时保存编辑器状态（包括历史记录）到当前文件
      // 使用 ref 获取最新的文件路径，避免闭包问题
      const filePath = currentFilePathRef.current
      if (filePath) {
        saveEditorState(filePath, editor.view.state)
      }

      // 自动保存（如果有设置）
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
      // 获取选中的文字
      const { from, to } = editor.state.selection
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ')
        setSelectedText(text.trim())
      } else {
        setSelectedText('')
      }
    }
  })

  // 当 patterns 变化时，更新扩展的全局状态并触发编辑器重绘
  useEffect(() => {
    if (!editor) return

    // 更新全局状态
    updateHighlightPatterns(patterns)
    if (config?.style) {
      updateHighlightStyleConfig(config.style)
    }
    // 根据文件扩展名和全局启用状态决定是否启用高亮
    updateHighlightEnabled(shouldHighlight)

    // 触发编辑器更新，强制重新计算装饰
    const { state, view } = editor
    const tr = state.tr.setMeta('vocabulary-highlight-update', true)
    view.dispatch(tr)
  }, [editor, patterns, config, shouldHighlight])

  // 输入法事件处理
  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom

    const handleCompositionStart = () => {
      setIsComposing(true)
    }

    const handleCompositionEnd = () => {
      setIsComposing(false)
      // 输入法确认后，更新内容
      const content = editor.getHTML()
      updateContent(content)
      onChange?.(content)
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
    
    // 切换前，保存当前编辑器状态到前一个文件
    if (prevPath && prevPath !== currentPath) {
      saveEditorState(prevPath, editor.view.state)
      // 清空高亮缓存，防止切换文件时使用旧缓存
      clearHighlightCache()
    }

    // 获取当前文件的内容
    const currentContent = getCurrentContent()

    // 尝试恢复之前保存的编辑器状态
    const savedState = getEditorState(currentPath)
    
    if (savedState) {
      // 有缓存的状态，直接恢复（包括历史记录）
      try {
        editor.view.updateState(savedState as typeof editor.view.state)
      } catch {
        // 如果恢复失败（如扩展配置变化），回退到创建新状态
        try {
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = currentContent
          const parser = DOMParser.fromSchema(editor.schema)
          const newDoc = parser.parse(tempDiv)
          const newState = EditorState.create({
            doc: newDoc,
            plugins: editor.view.state.plugins
          })
          editor.view.updateState(newState)
        } catch {
          editor.chain().clearContent(false).setContent(currentContent, false).run()
        }
      }
    } else {
      // 没有缓存状态，创建全新的 EditorState（历史为空）
      try {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = currentContent
        const parser = DOMParser.fromSchema(editor.schema)
        const newDoc = parser.parse(tempDiv)
        
        const newState = EditorState.create({
          doc: newDoc,
          plugins: editor.view.state.plugins
        })
        
        editor.view.updateState(newState)
      } catch {
        editor.chain().clearContent(false).setContent(currentContent, false).run()
      }
    }
    
    // 更新前一个文件路径
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
    
    // 设置段落间距（通过 CSS 变量）
    const editorContainer = editorElement.closest(`.${styles.editorContainer}`) as HTMLElement
    if (editorContainer) {
      editorContainer.style.setProperty('--paragraph-spacing', `${settings.paragraphSpacing}em`)
    }
  }, [editor, settings])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])
  
  // 鼠标离开编辑器时关闭悬浮卡片
  useEffect(() => {
    if (!editor) return

    const editorElement = editor.view.dom

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      setHoverCardVisible(false)
    }

    editorElement.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      editorElement.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [editor])

  if (!editor) {
    return <div className={styles.loading}>加载编辑器...</div>
  }

  return (
    <div className={styles.editorWrapper}>
      {/* 工具栏 */}
      <EditorToolbar 
        editor={editor}
        settings={settings}
        onSettingsChange={(key, value) => updateSettings({ [key]: value })}
        onOpenSearch={() => setSearchPanelVisible(true)}
        fileType={activeTab?.type}
      />
      
      {/* 搜索替换面板 */}
      <SearchReplacePanel
        editor={editor}
        visible={searchPanelVisible}
        onClose={() => setSearchPanelVisible(false)}
      />
      
      {/* 编辑器内容 */}
      <EditorContent editor={editor} className={styles.editorContainer} />
      
      {/* 高亮悬浮卡片 */}
      <HighlightHoverCard
        entryId={hoverCardEntryId}
        isSensitive={hoverCardIsSensitive}
        severity={hoverCardSeverity}
        config={hoverCardConfig}
        position={hoverCardPosition}
        visible={hoverCardVisible}
        onClose={() => setHoverCardVisible(false)}
      />
    </div>
  )
}

export default MarkdownEditor
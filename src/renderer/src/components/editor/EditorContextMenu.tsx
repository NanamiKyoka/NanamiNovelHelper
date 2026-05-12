/**
 * 编辑器右键菜单组件
 * 提供上下文相关的编辑操作，根据文件类型和选中状态动态调整菜单内容
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { Dropdown, MenuProps, App, Modal } from 'antd'
import {
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  LinkOutlined,
  CodeOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  ClearOutlined,
  BgColorsOutlined,
  UndoOutlined,
  RedoOutlined,
  SelectOutlined,
  SearchOutlined,
  PictureOutlined,
  MinusOutlined,
  MenuOutlined,
  FormatPainterOutlined,
  RobotOutlined,
  EditOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  SettingOutlined
} from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import type { EditorTab } from '@types/editor'
import styles from './EditorContextMenu.module.css'

interface EditorContextMenuProps {
  editor: Editor | null
  children: React.ReactNode
  fileType?: EditorTab['type']
}

interface ContextMenuPosition {
  x: number
  y: number
}

const HIGHLIGHT_COLORS = [
  { label: '黄色', value: '#fef3cd' },
  { label: '绿色', value: '#d4edda' },
  { label: '蓝色', value: '#cce5ff' },
  { label: '粉色', value: '#f8d7da' },
  { label: '紫色', value: '#e2d5f1' }
]

export function EditorContextMenu({ editor, children, fileType }: EditorContextMenuProps) {
  const { message } = App.useApp()
  const [position, setPosition] = useState<ContextMenuPosition | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [_aiLoading, setAiLoading] = useState(false)
  const [aiPreviewVisible, setAiPreviewVisible] = useState(false)
  const [aiPreviewContent, setAiPreviewContent] = useState('')
  const [aiCurrentAction, setAiCurrentAction] = useState('')
  const [imageLoading, setImageLoading] = useState(false)

  const isNovel = fileType === 'novel'
  const isMarkdown = fileType === 'markdown'
  const isRichText = isNovel || isMarkdown

  const getSelectedText = useCallback(() => {
    if (!editor) return ''
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, '')
  }, [editor])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (!editor) return
      const text = getSelectedText()
      setSelectedText(text)
      setPosition({ x: e.clientX, y: e.clientY })
    },
    [editor, getSelectedText]
  )

  const closeMenu = useCallback(() => {
    setPosition(null)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    if (position) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [position, closeMenu])

  const callAiApi = useCallback(
    async (
      action: 'polish' | 'continue' | 'rewrite' | 'expand' | 'summarize',
      text: string
    ): Promise<string | null> => {
      const prompts: Record<string, { system: string; user: string }> = {
        polish: {
          system:
            '你是一名专业的中文写作编辑，擅长润色网文、小说。请对用户提供的文本进行润色：优化表达、修正语病、增强可读性，保持原意与风格。只输出润色后的内容，不要添加任何解释。',
          user: `请润色以下文本：\n\n${text}`
        },
        continue: {
          system:
            '你是一名专业的网络小说作家，擅长续写故事。请根据用户提供的文本，自然地续写后续内容，保持原有的风格和语气。只输出续写的内容，不要添加任何解释。',
          user: `请续写以下文本：\n\n${text}`
        },
        rewrite: {
          system:
            '你是一名专业的中文写作编辑，擅长改写文本。请对用户提供的文本进行改写，保持核心意思不变，但用不同的表达方式。只输出改写后的内容，不要添加任何解释。',
          user: `请改写以下文本：\n\n${text}`
        },
        expand: {
          system:
            '你是一名专业的网络小说作家，擅长扩充文本。请对用户提供的文本进行扩充，增加细节描写，使内容更加丰富。只输出扩充后的内容，不要添加任何解释。',
          user: `请扩充以下文本：\n\n${text}`
        },
        summarize: {
          system:
            '你是一名专业的写作助手，擅长总结和提炼内容。请对用户提供的文本进行总结，提取关键信息和要点。只输出总结内容，不要添加任何解释。',
          user: `请总结以下文本：\n\n${text}`
        }
      }

      const prompt = prompts[action]
      if (!prompt) return null

      try {
        const result = await window.api.aiAssistant.callApi(prompt.user, {
          systemPrompt: prompt.system,
          temperature: 0.7,
          maxTokens: 2000
        })
        if (result.success && result.content) {
          return result.content
        } else {
          message.error(result.error || 'AI 调用失败')
          return null
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : 'AI 调用失败')
        return null
      }
    },
    [message]
  )

  const handleAiAction = useCallback(
    async (action: 'polish' | 'continue' | 'rewrite' | 'expand' | 'summarize') => {
      if (!editor) return

      const actionNames: Record<string, string> = {
        polish: '润色',
        continue: '续写',
        rewrite: '改写',
        expand: '扩充',
        summarize: '总结'
      }

      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      const text = hasSelection ? editor.state.doc.textBetween(from, to, '') : editor.getText()

      if (!text.trim()) {
        message.warning('请先选择要处理的文本，或确保文档有内容')
        return
      }

      closeMenu()
      setAiLoading(true)
      setAiCurrentAction(actionNames[action])

      try {
        const result = await callAiApi(action, text)
        if (result) {
          setAiPreviewContent(result)
          setAiPreviewVisible(true)
        }
      } finally {
        setAiLoading(false)
      }
    },
    [editor, callAiApi, message, closeMenu]
  )

  const applyAiResult = useCallback(
    (replace: boolean) => {
      if (!editor || !aiPreviewContent) return
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      if (replace && hasSelection) {
        editor.chain().focus().insertContentAt({ from, to }, aiPreviewContent).run()
      } else {
        editor.chain().focus().insertContent(aiPreviewContent).run()
      }
      setAiPreviewVisible(false)
      setAiPreviewContent('')
      message.success('已应用到编辑器')
    },
    [editor, aiPreviewContent, message]
  )

  const insertImage = useCallback(async () => {
    if (!editor || imageLoading) return
    closeMenu()
    setImageLoading(true)
    try {
      const result = await window.api.image.selectAndUpload({
        maxSize: 10 * 1024 * 1024,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxWidth: 4096,
        maxHeight: 4096,
        quality: 100
      })
      if (result) {
        const base64 = await window.api.image.readAsBase64(result.path)
        editor.chain().focus().setImage({ src: base64, alt: result.originalName }).run()
        message.success('图片插入成功')
      }
    } catch (error) {
      console.error('Failed to insert image:', error)
      message.error(error instanceof Error ? error.message : '图片插入失败')
    } finally {
      setImageLoading(false)
    }
  }, [editor, imageLoading, message, closeMenu])

  const execCommand = useCallback(
    (command: string, ...args: unknown[]) => {
      if (!editor) return
      closeMenu()
      const chain = editor.chain().focus()

      switch (command) {
        case 'copy':
          navigator.clipboard.writeText(getSelectedText()).then(() => {
            message.success('已复制')
          })
          break
        case 'cut':
          navigator.clipboard.writeText(getSelectedText()).then(() => {
            chain.deleteSelection().run()
            message.success('已剪切')
          })
          break
        case 'paste':
          navigator.clipboard.readText().then(text => {
            chain.insertContent(text).run()
          })
          break
        case 'selectAll':
          chain.selectAll().run()
          break
        case 'undo':
          chain.undo().run()
          break
        case 'redo':
          chain.redo().run()
          break
        case 'bold':
          chain.toggleBold().run()
          break
        case 'italic':
          chain.toggleItalic().run()
          break
        case 'strike':
          chain.toggleStrike().run()
          break
        case 'underline':
          chain.toggleUnderline().run()
          break
        case 'code':
          chain.toggleCode().run()
          break
        case 'codeBlock':
          chain.toggleCodeBlock().run()
          break
        case 'link': {
          const url = window.prompt('输入链接地址:')
          if (url) {
            chain.setLink({ href: url }).run()
          }
          break
        }
        case 'removeLink':
          chain.unsetLink().run()
          break
        case 'bulletList':
          chain.toggleBulletList().run()
          break
        case 'orderedList':
          chain.toggleOrderedList().run()
          break
        case 'taskList':
          chain.toggleTaskList().run()
          break
        case 'blockquote':
          chain.toggleBlockquote().run()
          break
        case 'horizontalRule':
          chain.setHorizontalRule().run()
          break
        case 'clearFormat':
          chain.clearNodes().unsetAllMarks().run()
          break
        case 'heading1':
          chain.toggleHeading({ level: 1 }).run()
          break
        case 'heading2':
          chain.toggleHeading({ level: 2 }).run()
          break
        case 'heading3':
          chain.toggleHeading({ level: 3 }).run()
          break
        case 'heading4':
          chain.toggleHeading({ level: 4 }).run()
          break
        case 'heading5':
          chain.toggleHeading({ level: 5 }).run()
          break
        case 'heading6':
          chain.toggleHeading({ level: 6 }).run()
          break
        case 'paragraph':
          chain.setParagraph().run()
          break
        case 'highlight':
          chain.toggleHighlight({ color: (args[0] as string) || '#fef3cd' }).run()
          break
        case 'addQuote': {
          const { from, to } = editor.state.selection
          if (from !== to) {
            const text = editor.state.doc.textBetween(from, to, '')
            chain.insertContent(`「${text}」`).run()
          }
          break
        }
        case 'formatDocument': {
          const content = editor.getHTML()
          let formatted = content
          formatted = formatted.replace(/(<p><\/p>\s*){3,}/g, '<p></p><p></p>')
          formatted = formatted.replace(/<p>\s+<\/p>/g, '<p></p>')
          formatted = formatted.replace(/<p>(&nbsp;|\s)+/g, '<p>')
          editor.commands.setContent(formatted, false)
          break
        }
        case 'search':
          window.dispatchEvent(new CustomEvent('editor:openSearch'))
          break
        default:
          break
      }
    },
    [editor, closeMenu, getSelectedText, message]
  )

  const getMenuItems = useCallback((): MenuProps['items'] => {
    if (!editor) return []

    const hasSelection = selectedText.length > 0
    const isBold = editor.isActive('bold')
    const isItalic = editor.isActive('italic')
    const isStrike = editor.isActive('strike')
    const isUnderline = editor.isActive('underline')
    const isCode = editor.isActive('code')
    const isLink = editor.isActive('link')
    const isHeading1 = editor.isActive('heading', { level: 1 })
    const isHeading2 = editor.isActive('heading', { level: 2 })
    const isHeading3 = editor.isActive('heading', { level: 3 })
    const isHeading4 = editor.isActive('heading', { level: 4 })
    const isHeading5 = editor.isActive('heading', { level: 5 })
    const isHeading6 = editor.isActive('heading', { level: 6 })

    const items: MenuProps['items'] = []

    items.push(
      {
        key: 'undo',
        label: '撤销',
        icon: <UndoOutlined />,
        shortcut: 'Ctrl+Z',
        disabled: !editor.can().undo(),
        onClick: () => execCommand('undo')
      },
      {
        key: 'redo',
        label: '重做',
        icon: <RedoOutlined />,
        shortcut: 'Ctrl+Shift+Z',
        disabled: !editor.can().redo(),
        onClick: () => execCommand('redo')
      },
      { type: 'divider' },
      {
        key: 'copy',
        label: '复制',
        icon: <CopyOutlined />,
        shortcut: 'Ctrl+C',
        disabled: !hasSelection,
        onClick: () => execCommand('copy')
      },
      {
        key: 'cut',
        label: '剪切',
        icon: <ScissorOutlined />,
        shortcut: 'Ctrl+X',
        disabled: !hasSelection,
        onClick: () => execCommand('cut')
      },
      {
        key: 'paste',
        label: '粘贴',
        icon: <SnippetsOutlined />,
        shortcut: 'Ctrl+V',
        onClick: () => execCommand('paste')
      },
      {
        key: 'selectAll',
        label: '全选',
        icon: <SelectOutlined />,
        shortcut: 'Ctrl+A',
        onClick: () => execCommand('selectAll')
      }
    )

    if (isRichText) {
      items.push(
        { type: 'divider' },
        {
          key: 'format-group',
          label: '格式',
          icon: <SettingOutlined />,
          children: [
            {
              key: 'bold',
              label: '粗体',
              icon: <BoldOutlined />,
              shortcut: 'Ctrl+B',
              className: isBold ? styles.menuItemActive : '',
              onClick: () => execCommand('bold')
            },
            {
              key: 'italic',
              label: '斜体',
              icon: <ItalicOutlined />,
              shortcut: 'Ctrl+I',
              className: isItalic ? styles.menuItemActive : '',
              onClick: () => execCommand('italic')
            },
            {
              key: 'underline',
              label: '下划线',
              icon: <UnderlineOutlined />,
              shortcut: 'Ctrl+U',
              className: isUnderline ? styles.menuItemActive : '',
              onClick: () => execCommand('underline')
            },
            {
              key: 'strike',
              label: '删除线',
              icon: <StrikethroughOutlined />,
              shortcut: 'Ctrl+Shift+X',
              className: isStrike ? styles.menuItemActive : '',
              onClick: () => execCommand('strike')
            },
            {
              key: 'code',
              label: '行内代码',
              icon: <CodeOutlined />,
              shortcut: 'Ctrl+`',
              className: isCode ? styles.menuItemActive : '',
              onClick: () => execCommand('code')
            },
            { type: 'divider' },
            {
              key: 'highlight',
              label: '高亮',
              icon: <BgColorsOutlined />,
              children: HIGHLIGHT_COLORS.map(color => ({
                key: `highlight-${color.value}`,
                label: (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        backgroundColor: color.value,
                        border: '1px solid #d9d9d9',
                        borderRadius: 2
                      }}
                    />
                    {color.label}
                  </span>
                ),
                onClick: () => execCommand('highlight', color.value)
              }))
            },
            { type: 'divider' },
            {
              key: 'link',
              label: isLink ? '编辑链接' : '插入链接',
              icon: <LinkOutlined />,
              shortcut: 'Ctrl+K',
              onClick: () => execCommand(isLink ? 'removeLink' : 'link')
            },
            {
              key: 'clearFormat',
              label: '清除格式',
              icon: <ClearOutlined />,
              onClick: () => execCommand('clearFormat')
            }
          ]
        }
      )

      items.push(
        {
          key: 'paragraph-group',
          label: '段落',
          icon: <FontSizeOutlined />,
          children: [
            {
              key: 'heading1',
              label: '标题 1',
              shortcut: 'Ctrl+1',
              className: isHeading1 ? styles.menuItemActive : '',
              onClick: () => execCommand('heading1')
            },
            {
              key: 'heading2',
              label: '标题 2',
              shortcut: 'Ctrl+2',
              className: isHeading2 ? styles.menuItemActive : '',
              onClick: () => execCommand('heading2')
            },
            {
              key: 'heading3',
              label: '标题 3',
              shortcut: 'Ctrl+3',
              className: isHeading3 ? styles.menuItemActive : '',
              onClick: () => execCommand('heading3')
            },
            {
              key: 'heading4',
              label: '标题 4',
              className: isHeading4 ? styles.menuItemActive : '',
              onClick: () => execCommand('heading4')
            },
            {
              key: 'heading5',
              label: '标题 5',
              className: isHeading5 ? styles.menuItemActive : '',
              onClick: () => execCommand('heading5')
            },
            {
              key: 'heading6',
              label: '标题 6',
              className: isHeading6 ? styles.menuItemActive : '',
              onClick: () => execCommand('heading6')
            },
            { type: 'divider' },
            {
              key: 'paragraph',
              label: '正文',
              shortcut: 'Ctrl+0',
              onClick: () => execCommand('paragraph')
            }
          ]
        }
      )

      items.push(
        {
          key: 'insert-group',
          label: '插入',
          icon: <SnippetsOutlined />,
          children: [
            {
              key: 'bulletList',
              label: '无序列表',
              icon: <UnorderedListOutlined />,
              shortcut: 'Ctrl+Shift+U',
              className: editor.isActive('bulletList') ? styles.menuItemActive : '',
              onClick: () => execCommand('bulletList')
            },
            {
              key: 'orderedList',
              label: '有序列表',
              icon: <OrderedListOutlined />,
              shortcut: 'Ctrl+Shift+O',
              className: editor.isActive('orderedList') ? styles.menuItemActive : '',
              onClick: () => execCommand('orderedList')
            },
            {
              key: 'taskList',
              label: '任务列表',
              icon: <CheckSquareOutlined />,
              className: editor.isActive('taskList') ? styles.menuItemActive : '',
              onClick: () => execCommand('taskList')
            },
            {
              key: 'blockquote',
              label: '引用块',
              icon: <MenuOutlined />,
              className: editor.isActive('blockquote') ? styles.menuItemActive : '',
              onClick: () => execCommand('blockquote')
            },
            {
              key: 'codeBlock',
              label: '代码块',
              icon: <CodeOutlined />,
              shortcut: 'Ctrl+Shift+C',
              className: editor.isActive('codeBlock') ? styles.menuItemActive : '',
              onClick: () => execCommand('codeBlock')
            },
            { type: 'divider' },
            {
              key: 'horizontalRule',
              label: '分隔线',
              icon: <MinusOutlined />,
              onClick: () => execCommand('horizontalRule')
            },
            {
              key: 'insertImage',
              label: '插入图片',
              icon: <PictureOutlined />,
              onClick: insertImage
            }
          ]
        }
      )

      items.push(
        { type: 'divider' },
        {
          key: 'search',
          label: '搜索替换',
          icon: <SearchOutlined />,
          shortcut: 'Ctrl+F',
          onClick: () => execCommand('search')
        }
      )

      if (hasSelection) {
        items.push(
          {
            key: 'addQuote',
            label: '添加引号「」',
            icon: <FontSizeOutlined />,
            onClick: () => execCommand('addQuote')
          }
        )
      }

      items.push(
        {
          key: 'formatDocument',
          label: '一键排版',
          icon: <FormatPainterOutlined />,
          onClick: () => execCommand('formatDocument')
        }
      )

      if (isNovel && hasSelection) {
        items.push(
          { type: 'divider' },
          {
            key: 'ai-group',
            label: 'AI 辅助',
            icon: <RobotOutlined />,
            children: [
              {
                key: 'ai-polish',
                label: '润色选中/全文',
                icon: <EditOutlined />,
                onClick: () => handleAiAction('polish')
              },
              {
                key: 'ai-continue',
                label: '续写',
                icon: <ThunderboltOutlined />,
                onClick: () => handleAiAction('continue')
              },
              {
                key: 'ai-rewrite',
                label: '改写',
                icon: <FileTextOutlined />,
                onClick: () => handleAiAction('rewrite')
              },
              {
                key: 'ai-expand',
                label: '扩充细节',
                icon: <FileTextOutlined />,
                onClick: () => handleAiAction('expand')
              },
              {
                key: 'ai-summarize',
                label: '总结要点',
                icon: <FileTextOutlined />,
                onClick: () => handleAiAction('summarize')
              }
            ]
          }
        )
      }
    } else {
      items.push(
        { type: 'divider' },
        {
          key: 'search',
          label: '搜索替换',
          icon: <SearchOutlined />,
          shortcut: 'Ctrl+F',
          onClick: () => execCommand('search')
        }
      )
    }

    return items
  }, [editor, selectedText, execCommand, isRichText, isNovel, insertImage, handleAiAction])

  if (!editor) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className={styles.container} onContextMenu={handleContextMenu}>
      {children}
      {position && (
        <div
          className={styles.menuWrapper}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 1000
          }}
        >
          <Dropdown
            menu={{ items: getMenuItems() }}
            open={!!position}
            onOpenChange={open => {
              if (!open) closeMenu()
            }}
            trigger={['contextMenu']}
          >
            <div style={{ width: 0, height: 0 }} />
          </Dropdown>
        </div>
      )}

      <Modal
        title={`AI ${aiCurrentAction}结果`}
        open={aiPreviewVisible}
        onCancel={() => setAiPreviewVisible(false)}
        width={800}
        footer={[
          <button
            key="cancel"
            className="ant-btn"
            onClick={() => setAiPreviewVisible(false)}
            type="button"
          >
            取消
          </button>,
          <button
            key="copy"
            className="ant-btn"
            onClick={() => {
              navigator.clipboard.writeText(aiPreviewContent)
              message.success('已复制到剪贴板')
            }}
            type="button"
          >
            复制
          </button>,
          <button
            key="replace"
            className="ant-btn ant-btn-primary"
            onClick={() => applyAiResult(true)}
            type="button"
          >
            替换原文
          </button>,
          <button
            key="insert"
            className="ant-btn ant-btn-primary"
            onClick={() => applyAiResult(false)}
            type="button"
          >
            插入到光标
          </button>
        ]}
      >
        <div
          style={{
            maxHeight: '60vh',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            padding: 16,
            background: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-primary)',
            fontSize: 14,
            lineHeight: 1.8
          }}
        >
          {aiPreviewContent}
        </div>
      </Modal>
    </div>
  )
}

export default EditorContextMenu

/**
 * 编辑器右键菜单组件
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { Dropdown, MenuProps, message } from 'antd'
import {
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  LinkOutlined,
  CodeOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  ClearOutlined,
  BgColorsOutlined
} from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import styles from './EditorContextMenu.module.css'

interface EditorContextMenuProps {
  editor: Editor | null
  children: React.ReactNode
}

interface ContextMenuPosition {
  x: number
  y: number
}

export function EditorContextMenu({ editor, children }: EditorContextMenuProps) {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null)
  const [selectedText, setSelectedText] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // 获取选中文本
  const getSelectedText = useCallback(() => {
    if (!editor) return ''
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, '')
  }, [editor])

  // 处理右键菜单
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

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setPosition(null)
  }, [])

  // 点击外部关闭
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

  // 执行格式化命令
  const execCommand = useCallback(
    (command: string, ..._args: unknown[]) => {
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
        case 'bold':
          chain.toggleBold().run()
          break
        case 'italic':
          chain.toggleItalic().run()
          break
        case 'strike':
          chain.toggleStrike().run()
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
        case 'paragraph':
          chain.setParagraph().run()
          break
        case 'highlight':
          chain.toggleHighlight({ color: '#fef3cd' }).run()
          break
        default:
          break
      }
    },
    [editor, closeMenu, getSelectedText]
  )

  // 构建菜单项
  const getMenuItems = useCallback((): MenuProps['items'] => {
    if (!editor) return []

    const hasSelection = selectedText.length > 0
    const isBold = editor.isActive('bold')
    const isItalic = editor.isActive('italic')
    const isStrike = editor.isActive('strike')
    const isCode = editor.isActive('code')
    const isLink = editor.isActive('link')
    const isHeading1 = editor.isActive('heading', { level: 1 })
    const isHeading2 = editor.isActive('heading', { level: 2 })
    const isHeading3 = editor.isActive('heading', { level: 3 })

    const items: MenuProps['items'] = [
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
      { type: 'divider' }
    ]

    // 格式化菜单（有选中文本时显示）
    if (hasSelection) {
      items.push(
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
        {
          key: 'highlight',
          label: '高亮',
          icon: <BgColorsOutlined />,
          onClick: () => execCommand('highlight')
        },
        { type: 'divider' },
        {
          key: 'link',
          label: isLink ? '编辑链接' : '插入链接',
          icon: <LinkOutlined />,
          shortcut: 'Ctrl+K',
          onClick: () => execCommand(isLink ? 'removeLink' : 'link')
        }
      )
    }

    // 段落格式菜单
    items.push(
      { type: 'divider' },
      {
        key: 'heading-group',
        label: '段落格式',
        type: 'group',
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
            key: 'paragraph',
            label: '正文',
            shortcut: 'Ctrl+0',
            onClick: () => execCommand('paragraph')
          }
        ]
      }
    )

    // 列表菜单
    items.push(
      { type: 'divider' },
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
        key: 'codeBlock',
        label: '代码块',
        icon: <CodeOutlined />,
        shortcut: 'Ctrl+Shift+C',
        className: editor.isActive('codeBlock') ? styles.menuItemActive : '',
        onClick: () => execCommand('codeBlock')
      }
    )

    // 清除格式
    if (hasSelection) {
      items.push(
        { type: 'divider' },
        {
          key: 'clearFormat',
          label: '清除格式',
          icon: <ClearOutlined />,
          onClick: () => execCommand('clearFormat')
        }
      )
    }

    return items
  }, [editor, selectedText, execCommand])

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
    </div>
  )
}

export default EditorContextMenu

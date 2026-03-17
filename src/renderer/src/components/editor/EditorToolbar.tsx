/**
 * 编辑器工具栏组件
 * 提供 Markdown 格式化和编辑工具
 */

import { useCallback, useState, useMemo } from 'react'
import { Button, Tooltip, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  LinkOutlined,
  PictureOutlined,
  CodeOutlined,
  MinusOutlined,
  SearchOutlined,
  UndoOutlined,
  RedoOutlined,
  FormatPainterOutlined,
  BgColorsOutlined,
  ClearOutlined,
  MenuOutlined,
  FontSizeOutlined
} from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import type { EditorSettings, EditorTab } from '@types/editor'
import styles from './EditorToolbar.module.css'

interface EditorToolbarProps {
  editor: Editor | null
  settings: EditorSettings
  onSettingsChange: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void
  onOpenSearch?: () => void
  /** 当前文件类型，用于控制 Markdown 特定功能的显示 */
  fileType?: EditorTab['type']
}

// 预设字体选项
const FONT_FAMILIES = [
  { value: 'PingFang SC, Microsoft YaHei, sans-serif', label: '苹方 / 微软雅黑' },
  { value: 'SimHei, sans-serif', label: '黑体' },
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'Source Han Sans SC, Noto Sans CJK SC, sans-serif', label: '思源黑体' },
  { value: 'Source Han Serif SC, Noto Serif CJK SC, serif', label: '思源宋体' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'monospace', label: '等宽字体' }
]

// 字号选项
const FONT_SIZES = [12, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32, 36, 42, 48]

// 行高选项
const LINE_HEIGHTS = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0]

// 段落间距选项
const PARAGRAPH_SPACINGS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

// 字间距选项
const LETTER_SPACINGS = [0, 0.5, 1, 1.5, 2, 3, 4, 5]

// 高亮颜色选项
const HIGHLIGHT_COLORS = [
  { label: '黄色', value: '#fef3cd' },
  { label: '绿色', value: '#d4edda' },
  { label: '蓝色', value: '#cce5ff' },
  { label: '粉色', value: '#f8d7da' },
  { label: '紫色', value: '#e2d5f1' }
]

// 标题级别选项
const HEADING_LEVELS = [
  { key: 'paragraph', label: '正文' },
  { key: 'heading1', label: '标题 1' },
  { key: 'heading2', label: '标题 2' },
  { key: 'heading3', label: '标题 3' },
  { key: 'heading4', label: '标题 4' },
  { key: 'heading5', label: '标题 5' },
  { key: 'heading6', label: '标题 6' }
]

export function EditorToolbar({ editor, settings, onSettingsChange, onOpenSearch, fileType }: EditorToolbarProps) {
  const [highlightColor, setHighlightColor] = useState('#fef3cd')
  
  // 是否为 Markdown 文件，决定是否显示格式化工具
  const isMarkdown = fileType === 'markdown'

  // 获取当前字体显示名称
  const fontLabel = useMemo(() => {
    const font = FONT_FAMILIES.find(f => f.value === settings.fontFamily)
    return font?.label || '字体'
  }, [settings.fontFamily])

  // 执行编辑器命令
  const execCommand = useCallback((command: string, ...args: unknown[]) => {
    if (!editor) return

    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run()
        break
      case 'italic':
        editor.chain().focus().toggleItalic().run()
        break
      case 'strike':
        editor.chain().focus().toggleStrike().run()
        break
      case 'underline':
        editor.chain().focus().toggleUnderline().run()
        break
      case 'highlight':
        editor.chain().focus().toggleHighlight({ color: args[0] as string }).run()
        break
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run()
        break
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'taskList':
        editor.chain().focus().toggleTaskList().run()
        break
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run()
        break
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run()
        break
      case 'horizontalRule':
        editor.chain().focus().setHorizontalRule().run()
        break
      case 'paragraph':
        editor.chain().focus().setParagraph().run()
        break
      case 'heading':
        editor.chain().focus().toggleHeading({ level: args[0] as number }).run()
        break
      case 'undo':
        editor.chain().focus().undo().run()
        break
      case 'redo':
        editor.chain().focus().redo().run()
        break
      case 'clearFormat':
        editor.chain().focus().clearNodes().unsetAllMarks().run()
        break
      case 'addQuote':
        const { from, to } = editor.state.selection
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, '')
          editor.chain().focus().insertContent(`「${text}」`).run()
        }
        break
      case 'formatDocument':
        formatDocument()
        break
      case 'setLink':
        const url = window.prompt('输入链接地址：')
        if (url) {
          editor.chain().focus().setLink({ href: url }).run()
        }
        break
      case 'unsetLink':
        editor.chain().focus().unsetLink().run()
        break
    }
  }, [editor])

  // 一键排版
  const formatDocument = useCallback(() => {
    if (!editor) return

    const content = editor.getHTML()
    let formatted = content

    formatted = formatted.replace(/(<p><\/p>\s*){3,}/g, '<p></p><p></p>')
    formatted = formatted.replace(/<p>\s+<\/p>/g, '<p></p>')
    formatted = formatted.replace(/<p>(&nbsp;|\s)+/g, '<p>')

    editor.commands.setContent(formatted, false)
  }, [editor])

  // 插入图片
  const insertImage = useCallback(() => {
    if (!editor) return

    const url = window.prompt('输入图片地址：')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // 字体设置下拉菜单
  const fontSettingsMenuItems: MenuProps['items'] = [
    // 字体
    {
      key: 'font-group',
      type: 'group',
      label: '字体',
      children: FONT_FAMILIES.map(font => ({
        key: `font-${font.value}`,
        label: (
          <span style={{ 
            fontFamily: font.value,
            fontWeight: settings.fontFamily === font.value ? 'bold' : 'normal'
          }}>
            {font.label}
            {settings.fontFamily === font.value && ' ✓'}
          </span>
        ),
        onClick: () => onSettingsChange('fontFamily', font.value)
      }))
    },
    { type: 'divider' },
    // 字号
    {
      key: 'size-group',
      type: 'group',
      label: `字号 (当前: ${settings.fontSize}px)`,
      children: FONT_SIZES.map(size => ({
        key: `size-${size}`,
        label: (
          <span style={{ fontWeight: settings.fontSize === size ? 'bold' : 'normal' }}>
            {size}px {settings.fontSize === size ? '✓' : ''}
          </span>
        ),
        onClick: () => onSettingsChange('fontSize', size)
      }))
    },
    { type: 'divider' },
    // 行高
    {
      key: 'lineheight-group',
      type: 'group',
      label: `行高 (当前: ${settings.lineHeight})`,
      children: LINE_HEIGHTS.map(lh => ({
        key: `lh-${lh}`,
        label: (
          <span style={{ fontWeight: settings.lineHeight === lh ? 'bold' : 'normal' }}>
            {lh} {settings.lineHeight === lh ? '✓' : ''}
          </span>
        ),
        onClick: () => onSettingsChange('lineHeight', lh)
      }))
    },
    { type: 'divider' },
    // 段落间距
    {
      key: 'paragraph-group',
      type: 'group',
      label: `段落间距 (当前: ${settings.paragraphSpacing}em)`,
      children: PARAGRAPH_SPACINGS.map(ps => ({
        key: `ps-${ps}`,
        label: (
          <span style={{ fontWeight: settings.paragraphSpacing === ps ? 'bold' : 'normal' }}>
            {ps}em {settings.paragraphSpacing === ps ? '✓' : ''}
          </span>
        ),
        onClick: () => onSettingsChange('paragraphSpacing', ps)
      }))
    },
    { type: 'divider' },
    // 字间距
    {
      key: 'letterspacing-group',
      type: 'group',
      label: `字间距 (当前: ${settings.letterSpacing}px)`,
      children: LETTER_SPACINGS.map(ls => ({
        key: `ls-${ls}`,
        label: (
          <span style={{ fontWeight: settings.letterSpacing === ls ? 'bold' : 'normal' }}>
            {ls}px {settings.letterSpacing === ls ? '✓' : ''}
          </span>
        ),
        onClick: () => onSettingsChange('letterSpacing', ls)
      }))
    }
  ]

  // 标题下拉菜单
  const headingMenuItems: MenuProps['items'] = HEADING_LEVELS.map(item => ({
    key: item.key,
    label: item.label,
    onClick: () => {
      if (item.key === 'paragraph') {
        execCommand('paragraph')
      } else {
        const level = parseInt(item.key.replace('heading', ''))
        execCommand('heading', level)
      }
    }
  }))

  // 高亮颜色菜单
  const highlightMenuItems: MenuProps['items'] = HIGHLIGHT_COLORS.map(color => ({
    key: color.value,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ 
          width: 16, 
          height: 16, 
          backgroundColor: color.value, 
          border: '1px solid #d9d9d9',
          borderRadius: 2 
        }} />
        {color.label}
      </div>
    ),
    onClick: () => {
      setHighlightColor(color.value)
      execCommand('highlight', color.value)
    }
  }))

  // 检查当前格式状态
  const isActive = (format: string): boolean => {
    if (!editor) return false
    switch (format) {
      case 'bold':
        return editor.isActive('bold')
      case 'italic':
        return editor.isActive('italic')
      case 'strike':
        return editor.isActive('strike')
      case 'underline':
        return editor.isActive('underline')
      case 'bulletList':
        return editor.isActive('bulletList')
      case 'orderedList':
        return editor.isActive('orderedList')
      case 'taskList':
        return editor.isActive('taskList')
      case 'blockquote':
        return editor.isActive('blockquote')
      case 'codeBlock':
        return editor.isActive('codeBlock')
      case 'link':
        return editor.isActive('link')
      default:
        return false
    }
  }

  if (!editor) return null

  return (
    <div className={styles.toolbar}>
      {/* 撤销/重做 */}
      <div className={styles.group}>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button
            type="text"
            size="small"
            icon={<UndoOutlined />}
            onClick={() => execCommand('undo')}
            disabled={!editor.can().undo()}
          />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Shift+Z)">
          <Button
            type="text"
            size="small"
            icon={<RedoOutlined />}
            onClick={() => execCommand('redo')}
            disabled={!editor.can().redo()}
          />
        </Tooltip>
      </div>

      <div className={styles.divider} />

      {/* 字体设置（整合下拉菜单） */}
      <div className={styles.group}>
        <Dropdown 
          menu={{ items: fontSettingsMenuItems }} 
          trigger={['click']}
          overlayClassName={styles.fontDropdown}
        >
          <Button type="text" size="small" icon={<FontSizeOutlined />}>
            字体设置 <span className={styles.arrow}>▼</span>
          </Button>
        </Dropdown>
      </div>

      {/* Markdown 特定功能：标题级别 */}
      {isMarkdown && (
        <>
          <div className={styles.divider} />
          <div className={styles.group}>
            <Dropdown menu={{ items: headingMenuItems }} trigger={['click']}>
              <Button type="text" size="small">
                标题 <span className={styles.arrow}>▼</span>
              </Button>
            </Dropdown>
          </div>
        </>
      )}

      {/* Markdown 特定功能：文本格式 */}
      {isMarkdown && (
        <>
          <div className={styles.divider} />
          <div className={styles.group}>
            <Tooltip title="加粗 (Ctrl+B)">
              <Button
                type="text"
                size="small"
                icon={<BoldOutlined />}
                className={isActive('bold') ? styles.active : ''}
                onClick={() => execCommand('bold')}
              />
            </Tooltip>
            <Tooltip title="斜体 (Ctrl+I)">
              <Button
                type="text"
                size="small"
                icon={<ItalicOutlined />}
                className={isActive('italic') ? styles.active : ''}
                onClick={() => execCommand('italic')}
              />
            </Tooltip>
            <Tooltip title="删除线">
              <Button
                type="text"
                size="small"
                icon={<StrikethroughOutlined />}
                className={isActive('strike') ? styles.active : ''}
                onClick={() => execCommand('strike')}
              />
            </Tooltip>
            <Dropdown menu={{ items: highlightMenuItems }} trigger={['click']}>
              <Tooltip title="高亮标记">
                <Button
                  type="text"
                  size="small"
                  icon={<BgColorsOutlined />}
                  className={editor.isActive('highlight') ? styles.active : ''}
                />
              </Tooltip>
            </Dropdown>
          </div>
        </>
      )}

      {/* Markdown 特定功能：列表 */}
      {isMarkdown && (
        <>
          <div className={styles.divider} />
          <div className={styles.group}>
            <Tooltip title="无序列表">
              <Button
                type="text"
                size="small"
                icon={<UnorderedListOutlined />}
                className={isActive('bulletList') ? styles.active : ''}
                onClick={() => execCommand('bulletList')}
              />
            </Tooltip>
            <Tooltip title="有序列表">
              <Button
                type="text"
                size="small"
                icon={<OrderedListOutlined />}
                className={isActive('orderedList') ? styles.active : ''}
                onClick={() => execCommand('orderedList')}
              />
            </Tooltip>
            <Tooltip title="任务列表">
              <Button
                type="text"
                size="small"
                icon={<CheckSquareOutlined />}
                className={isActive('taskList') ? styles.active : ''}
                onClick={() => execCommand('taskList')}
              />
            </Tooltip>
            <Tooltip title="引用块">
              <Button
                type="text"
                size="small"
                icon={<MenuOutlined />}
                className={isActive('blockquote') ? styles.active : ''}
                onClick={() => execCommand('blockquote')}
              />
            </Tooltip>
          </div>
        </>
      )}

      {/* Markdown 特定功能：插入 */}
      {isMarkdown && (
        <>
          <div className={styles.divider} />
          <div className={styles.group}>
            <Tooltip title="链接 (Ctrl+K)">
              <Button
                type="text"
                size="small"
                icon={<LinkOutlined />}
                className={isActive('link') ? styles.active : ''}
                onClick={() => execCommand('setLink')}
              />
            </Tooltip>
            <Tooltip title="图片">
              <Button
                type="text"
                size="small"
                icon={<PictureOutlined />}
                onClick={insertImage}
              />
            </Tooltip>
            <Tooltip title="代码块">
              <Button
                type="text"
                size="small"
                icon={<CodeOutlined />}
                className={isActive('codeBlock') ? styles.active : ''}
                onClick={() => execCommand('codeBlock')}
              />
            </Tooltip>
            <Tooltip title="分隔线">
              <Button
                type="text"
                size="small"
                icon={<MinusOutlined />}
                onClick={() => execCommand('horizontalRule')}
              />
            </Tooltip>
          </div>
        </>
      )}

      <div className={styles.divider} />

      {/* 工具（所有文件类型通用） */}
      <div className={styles.group}>
        <Tooltip title="搜索替换 (Ctrl+F)">
          <Button
            type="text"
            size="small"
            icon={<SearchOutlined />}
            onClick={onOpenSearch}
          />
        </Tooltip>
        <Tooltip title="添加引号「」">
          <Button
            type="text"
            size="small"
            onClick={() => execCommand('addQuote')}
          >
            「」
          </Button>
        </Tooltip>
        <Tooltip title="一键排版">
          <Button
            type="text"
            size="small"
            icon={<FormatPainterOutlined />}
            onClick={() => execCommand('formatDocument')}
          />
        </Tooltip>
        {/* 清除格式仅对 Markdown 文件显示 */}
        {isMarkdown && (
          <Tooltip title="清除格式">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={() => execCommand('clearFormat')}
            />
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default EditorToolbar
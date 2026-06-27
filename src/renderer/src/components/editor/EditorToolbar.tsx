/**
 * 编辑器工具栏组件
 * 提供文本格式化和编辑工具
 */

import { useCallback, useState } from 'react'
import { Button, Tooltip, Dropdown, Modal, App, Popover } from 'antd'
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
  FontSizeOutlined,
  CheckOutlined,
  RobotOutlined,
  EditOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  UserAddOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import type { EditorSettings, EditorTab } from '@types/editor'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import type { AiApiStreamChunk } from '@shared/ai-assistant'
import { useAiWriting } from './ai/useAiWriting'
import { ContinueWritingPanel, type ContinueParams } from './ai/ContinueWritingPanel'
import { MultiVersionPanel } from './ai/MultiVersionPanel'
import { RandomNamePanel } from '@components/random-name'
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

export function EditorToolbar({
  editor,
  settings,
  onSettingsChange,
  onOpenSearch,
  fileType
}: EditorToolbarProps) {
  const { message } = App.useApp()
  const [, setHighlightColor] = useState('#fef3cd')

  const {
    isStreaming,
    streamingContent,
    aiPreviewVisible,
    aiCurrentAction,
    aiLoading,
    startStream,
    stopStream,
    closePreview,
    applyResult
  } = useAiWriting()

  const { callApiStream, onStreamChunk, removeStreamChunkListener } = useAiAssistantStore()

  const [showContinuePanel, setShowContinuePanel] = useState(false)
  const [showMultiVersionPanel, setShowMultiVersionPanel] = useState(false)
  const [multiVersions, setMultiVersions] = useState<string[]>([])
  const [isGeneratingVersions, setIsGeneratingVersions] = useState(false)
  const [continueMode, setContinueMode] = useState<'continue' | 'multiVersion'>('continue')

  const isNovel = fileType === 'novel'
  const isMarkdown = fileType === 'markdown'
  const isRichText = isNovel || isMarkdown

  // 收集上下文：前文 + 角色设定
  const collectContext = useCallback(async (ed: Editor) => {
    const cursorPos = ed.state.selection.from
    const textBefore = ed.state.doc.textBetween(Math.max(0, cursorPos - 2000), cursorPos, '')
    let characters = ''
    try {
      const types = await window.api.vocabulary.loadTypes()
      const charType = types.find(
        (t: Record<string, unknown>) => t.id === 'character' || (t.name as string)?.includes('角色')
      )
      if (charType) {
        const entries = await window.api.vocabulary.loadEntries(charType.id as string)
        characters = entries
          .map((e: Record<string, unknown>) => `${e.name}：${e.description || ''}`)
          .join('\n')
      }
    } catch (_e) {
      /* ignore */
    }
    return { textBefore, characters }
  }, [])

  // 构建续写 prompt
  const buildContinuePrompt = useCallback(
    (params: ContinueParams, context: { textBefore: string; characters: string }) => {
      const lengthMap: Record<string, string> = {
        short: '短（100-200字）',
        medium: '中（300-500字）',
        long: '长（500-800字）'
      }
      const styleMap: Record<string, string> = {
        original: '保持原风格',
        vivid: '更生动',
        concise: '更简洁',
        suspense: '更悬疑',
        warm: '更温馨'
      }
      const directionMap: Record<string, string> = {
        natural: '顺其自然',
        mainPlot: '推进主线',
        conflict: '增加冲突',
        environment: '环境描写',
        dialogue: '对话展开'
      }

      const systemPrompt =
        '你是一名专业的网络小说作家，擅长根据前文和角色设定自然地续写故事。请只输出续写内容，不要重复前文，不要添加任何解释。'
      const userPrompt = `【前文】\n${context.textBefore}\n\n【角色设定】\n${context.characters || '（无）'}\n\n要求：\n- 续写长度：${lengthMap[params.length]}\n- 风格：${styleMap[params.style]}\n- 走向：${directionMap[params.direction]}${params.customPrompt ? `\n额外要求：${params.customPrompt}` : ''}\n\n请只输出续写内容，不要重复前文。`

      return { systemPrompt, userPrompt }
    },
    []
  )

  // 简单 AI 操作（润色、改写、扩充、总结）
  const handleSimpleAiAction = useCallback(
    async (action: string, actionName: string) => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      const text = hasSelection ? editor.state.doc.textBetween(from, to, '') : editor.getText()

      if (!text.trim()) {
        message.warning('请先选择要处理的文本，或确保文档有内容')
        return
      }

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
      if (!prompt) return

      await startStream(actionName, prompt.user, {
        systemPrompt: prompt.system,
        temperature: 0.7,
        maxTokens: 2000
      })
    },
    [editor, message, startStream]
  )

  // 续写参数提交
  const handleContinueSubmit = useCallback(
    async (params: ContinueParams) => {
      if (!editor) return
      setShowContinuePanel(false)
      const context = await collectContext(editor)
      const { systemPrompt, userPrompt } = buildContinuePrompt(params, context)
      await startStream('续写', userPrompt, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2000
      })
    },
    [editor, collectContext, buildContinuePrompt, startStream]
  )

  // 多版本续写提交
  const handleMultiVersionSubmit = useCallback(
    async (params: ContinueParams) => {
      if (!editor) return
      setShowContinuePanel(false)
      setShowMultiVersionPanel(true)
      setMultiVersions([])
      setIsGeneratingVersions(true)

      const context = await collectContext(editor)
      const { systemPrompt, userPrompt } = buildContinuePrompt(params, context)

      const versions: string[] = []
      for (let i = 0; i < 3; i++) {
        let content = ''
        const streamChunkHandler = (chunk: AiApiStreamChunk) => {
          if (chunk.type === 'chunk' && chunk.content) {
            content += chunk.content
          }
        }
        const unlisten = onStreamChunk(streamChunkHandler)
        try {
          await callApiStream(userPrompt, {
            systemPrompt,
            temperature: 0.8,
            maxTokens: 2000
          })
        } catch (_err) {
          /* ignore single version failure */
        } finally {
          unlisten?.()
          removeStreamChunkListener()
        }
        versions.push(content)
        setMultiVersions([...versions])
      }
      setIsGeneratingVersions(false)
    },
    [editor, collectContext, buildContinuePrompt, callApiStream, onStreamChunk, removeStreamChunkListener]
  )

  // 应用多版本选中结果
  const handleApplyVersion = useCallback(
    (index: number) => {
      if (!editor || !multiVersions[index]) return
      editor.chain().focus().insertContent(multiVersions[index]).run()
      setShowMultiVersionPanel(false)
      setMultiVersions([])
      message.success('已应用到编辑器')
    },
    [editor, multiVersions, message]
  )

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

  // 执行编辑器命令
  const execCommand = useCallback(
    (command: string, ...args: unknown[]) => {
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
        case 'addQuote': {
          const { from, to } = editor.state.selection
          if (from !== to) {
            const text = editor.state.doc.textBetween(from, to, '')
            editor.chain().focus().insertContent(`「${text}」`).run()
          }
          break
        }
        case 'formatDocument':
          formatDocument()
          break
        case 'setLink': {
          const url = window.prompt('输入链接地址：')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
          break
        }
        case 'unsetLink':
          editor.chain().focus().unsetLink().run()
          break
      }
    },
    [editor, formatDocument]
  )

  const [imageLoading, setImageLoading] = useState(false)

  const insertImage = useCallback(async () => {
    if (!editor || imageLoading) return
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
  }, [editor, imageLoading, message])

  const [fontPopoverOpen, setFontPopoverOpen] = useState(false)

  const fontSettingsContent = (
    <div className={styles.fontColumns}>
      <div className={styles.fontColumn}>
        <div className={styles.columnHeader}>字体</div>
        <div className={styles.columnList}>
          {FONT_FAMILIES.map(font => (
            <div
              key={font.value}
              className={`${styles.columnItem} ${settings.fontFamily === font.value ? styles.columnItemActive : ''}`}
              style={{ fontFamily: font.value }}
              onClick={() => {
                onSettingsChange('fontFamily', font.value)
              }}
            >
              {font.label}
              {settings.fontFamily === font.value && <CheckOutlined className={styles.checkIcon} />}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.fontColumn}>
        <div className={styles.columnHeader}>字号</div>
        <div className={styles.columnList}>
          {FONT_SIZES.map(size => (
            <div
              key={size}
              className={`${styles.columnItem} ${settings.fontSize === size ? styles.columnItemActive : ''}`}
              onClick={() => {
                onSettingsChange('fontSize', size)
              }}
            >
              {size}px
              {settings.fontSize === size && <CheckOutlined className={styles.checkIcon} />}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.fontColumn}>
        <div className={styles.columnHeader}>行高</div>
        <div className={styles.columnList}>
          {LINE_HEIGHTS.map(lh => (
            <div
              key={lh}
              className={`${styles.columnItem} ${settings.lineHeight === lh ? styles.columnItemActive : ''}`}
              onClick={() => {
                onSettingsChange('lineHeight', lh)
              }}
            >
              {lh}
              {settings.lineHeight === lh && <CheckOutlined className={styles.checkIcon} />}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.fontColumn}>
        <div className={styles.columnHeader}>段落间距</div>
        <div className={styles.columnList}>
          {PARAGRAPH_SPACINGS.map(ps => (
            <div
              key={ps}
              className={`${styles.columnItem} ${settings.paragraphSpacing === ps ? styles.columnItemActive : ''}`}
              onClick={() => {
                onSettingsChange('paragraphSpacing', ps)
              }}
            >
              {ps}em
              {settings.paragraphSpacing === ps && <CheckOutlined className={styles.checkIcon} />}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.fontColumn}>
        <div className={styles.columnHeader}>字间距</div>
        <div className={styles.columnList}>
          {LETTER_SPACINGS.map(ls => (
            <div
              key={ls}
              className={`${styles.columnItem} ${settings.letterSpacing === ls ? styles.columnItemActive : ''}`}
              onClick={() => {
                onSettingsChange('letterSpacing', ls)
              }}
            >
              {ls}px
              {settings.letterSpacing === ls && <CheckOutlined className={styles.checkIcon} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

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
        <div
          style={{
            width: 16,
            height: 16,
            backgroundColor: color.value,
            border: '1px solid #d9d9d9',
            borderRadius: 2
          }}
        />
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

  // AI 下拉菜单
  const aiMenuItems: MenuProps['items'] = [
    {
      key: 'polish',
      icon: <EditOutlined />,
      label: '润色选中/全文',
      onClick: () => handleSimpleAiAction('polish', '润色')
    },
    {
      key: 'continue',
      icon: <ThunderboltOutlined />,
      label: '续写',
      onClick: () => {
        setContinueMode('continue')
        setShowContinuePanel(true)
      }
    },
    {
      key: 'rewrite',
      icon: <FileTextOutlined />,
      label: '改写',
      onClick: () => handleSimpleAiAction('rewrite', '改写')
    },
    {
      key: 'expand',
      icon: <FileTextOutlined />,
      label: '扩充细节',
      onClick: () => handleSimpleAiAction('expand', '扩充')
    },
    {
      key: 'summarize',
      icon: <FileTextOutlined />,
      label: '总结要点',
      onClick: () => handleSimpleAiAction('summarize', '总结')
    },
    { type: 'divider' },
    {
      key: 'multiVersion',
      icon: <BranchesOutlined />,
      label: '多版本续写',
      onClick: () => {
        setContinueMode('multiVersion')
        setShowContinuePanel(true)
      }
    },

  ]

  // AI 预览模态框 footer
  const aiPreviewFooter = isStreaming
    ? [
        <Button key="stop" danger onClick={stopStream}>
          停止生成
        </Button>
      ]
    : [
        <Button key="cancel" onClick={closePreview}>
          取消
        </Button>,
        <Button
          key="copy"
          onClick={() => {
            navigator.clipboard.writeText(streamingContent)
            message.success('已复制到剪贴板')
          }}
        >
          复制
        </Button>,
        <Button
          key="regenerate"
          onClick={() => {
            // 重新生成：清空内容后重新调用（需要保留上一次的 prompt 和 options，这里简化处理：关闭后由用户再次触发）
            closePreview()
          }}
        >
          重新生成
        </Button>,
        <Button key="insert" type="default" onClick={() => applyResult(editor, false, streamingContent)}>
          插入到当前位置
        </Button>,
        <Button key="replace" type="primary" onClick={() => applyResult(editor, true, streamingContent)}>
          替换选中内容
        </Button>
      ]

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
        <Popover
          content={fontSettingsContent}
          trigger="click"
          open={fontPopoverOpen}
          onOpenChange={setFontPopoverOpen}
          overlayClassName={styles.fontPopover}
          placement="bottomLeft"
        >
          <Button type="text" size="small" icon={<FontSizeOutlined />}>
            字体设置 <span className={styles.arrow}>▼</span>
          </Button>
        </Popover>
      </div>

      {/* 富文本功能：标题级别 */}
      {isRichText && (
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

      {/* 富文本功能：文本格式 */}
      {isRichText && (
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

      {/* 富文本功能：列表 */}
      {isRichText && (
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

      {/* 富文本功能：插入 */}
      {isRichText && (
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
                loading={imageLoading}
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
          <Button type="text" size="small" icon={<SearchOutlined />} onClick={onOpenSearch} />
        </Tooltip>
        <Tooltip title="添加引号「」">
          <Button type="text" size="small" onClick={() => execCommand('addQuote')}>
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
        {/* 清除格式仅对 Novel 文件显示 */}
        {isNovel && (
          <Tooltip title="清除格式">
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              onClick={() => execCommand('clearFormat')}
            />
          </Tooltip>
        )}
        <RandomNamePanel onNameSelect={(name) => editor?.chain().focus().insertContent(name).run()}>
          <Tooltip title="随机起名">
            <Button type="text" size="small" icon={<UserAddOutlined />} />
          </Tooltip>
        </RandomNamePanel>
      </div>

      {/* AI 辅助功能 */}
      <div className={styles.divider} />
      <div className={styles.group}>
        <Dropdown menu={{ items: aiMenuItems }} trigger={['click']}>
          <Tooltip title="AI 辅助写作">
            <Button
              type="text"
              size="small"
              icon={<RobotOutlined />}
              loading={aiLoading}
              className={styles.aiButton}
            >
              AI
            </Button>
          </Tooltip>
        </Dropdown>
      </div>

      {/* AI 结果预览模态框 */}
      <Modal
        title={`AI ${aiCurrentAction}结果`}
        open={aiPreviewVisible}
        onCancel={closePreview}
        width={800}
        footer={aiPreviewFooter}
      >
        <div className={styles.aiPreviewContainer}>
          <div className={styles.aiPreviewContent}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
              {streamingContent}
            </pre>
          </div>
        </div>
      </Modal>

      {/* 续写参数面板 */}
      <ContinueWritingPanel
        open={showContinuePanel}
        onSubmit={continueMode === 'continue' ? handleContinueSubmit : handleMultiVersionSubmit}
        onCancel={() => setShowContinuePanel(false)}
      />

      {/* 多版本续写面板 */}
      <MultiVersionPanel
        open={showMultiVersionPanel}
        versions={multiVersions}
        isLoading={isGeneratingVersions}
        onSelect={handleApplyVersion}
        onRegenerate={() => {
          setShowMultiVersionPanel(false)
          setContinueMode('multiVersion')
          setShowContinuePanel(true)
        }}
        onCancel={() => {
          setShowMultiVersionPanel(false)
          setMultiVersions([])
        }}
      />


    </div>
  )
}

export default EditorToolbar

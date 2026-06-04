/**
 * AI 写作助手侧边栏面板 — 常驻对话界面
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Button, Input, Space, Tooltip, App, Dropdown, Modal } from 'antd'
import {
  SendOutlined,
  ClearOutlined,
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  CheckOutlined,
  HighlightOutlined,
  UserOutlined,
  MessageOutlined,
  LoadingOutlined,
  DownOutlined,
  PlusOutlined,
  DeleteOutlined,
  RollbackOutlined,
  RedoOutlined
} from '@ant-design/icons'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import { useEditorStore } from '@stores/editorStore'
import { useProjectStore } from '@stores/projectStore'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { AiApiStreamChunk, ChatSession, AnyAgentEvent, ToolCallRecord } from '@shared/ai-assistant'
import { ToolCallCard } from './ToolCallCard'
import { textToGitDiff } from '@utils/diff'
import styles from './AiAssistantPanel.module.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ThinkingStep {
  type: 'tool_call' | 'tool_result' | 'thinking'
  content: string
  timestamp: number
}

const QUICK_ACTIONS = [
  { key: 'polish', label: '润色', icon: <HighlightOutlined />, prompt: '请对以下文章进行润色，保持原意的同时让文字更加流畅优美：\n\n{content}' },
  { key: 'continue', label: '续写', icon: <EditOutlined />, prompt: '请根据以下文章内容续写后续情节，保持原有风格和人物设定：\n\n{content}' },
  { key: 'logic', label: '检查逻辑', icon: <CheckOutlined />, prompt: '请检查以下文章的逻辑一致性，指出可能的漏洞或矛盾，并给出修改建议：\n\n{content}' },
  { key: 'summary', label: '生成摘要', icon: <FileTextOutlined />, prompt: '请为以下文章生成一段简洁的摘要：\n\n{content}' },
  { key: 'character', label: '角色分析', icon: <UserOutlined />, prompt: '请分析以下文章中的主要角色，包括性格特点、动机和发展弧线：\n\n{content}' }
]

const FILE_TOOLS = `\n\n【项目文件说明】
本项目的小说文件后缀为 .novel，内容使用 HTML 标签（如 <p>、<br> 等）进行排版和分段。文件可以存放在项目中的任何位置，没有固定的目录结构或命名规范。\n\n【文件工具 - 可选使用】
如果你需要查看项目中的文件来回答用户问题，可以使用以下工具（只返回JSON，不要添加解释文字）：
1. list_files — 列出项目中的所有文件和文件夹。调用格式：{"tool":"list_files"}
2. read_file — 读取指定文件的内容。调用格式：{"tool":"read_file","path":"文件相对路径"}
3. search_files — 在 .novel 文件的内容中搜索关键词。调用格式：{"tool":"search_files","keyword":"关键词"}`

function AiAssistantPanel(): JSX.Element {
  const { message } = App.useApp()
  const {
    callApiStream,
    sessions,
    loadSessions,
    saveSession,
    deleteSession,
    createSession,
    switchSession,
    runAgent,
    stopAgent: _stopAgent,
    onAgentEvent,
    createAgentSession,
    agentEvents: _agentEvents,
    addAgentEvent: _addAgentEvent
  } = useAiAssistantStore()
  const getCurrentContent = useEditorStore(state => state.getCurrentContent)
  const requestInsertContent = useEditorStore(state => state.requestInsertContent)
  const activeTabId = useEditorStore(state => state.activeTabId)
  const tabs = useEditorStore(state => state.tabs)
  const currentProject = useProjectStore(state => state.currentProject)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [thinkingSteps, setThinkingSteps] = useState<Map<string, ThinkingStep[]>>(new Map())
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Set<string>>(new Set())
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const streamingContentRef = useRef('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const currentThinkingRef = useRef<ThinkingStep[]>([])
  const messagesRef = useRef<ChatMessage[]>([])

  // Agent 状态
  const [currentAgentSessionId, setCurrentAgentSessionId] = useState<string | null>(null)
  const [currentToolCalls, setCurrentToolCalls] = useState<Map<string, ToolCallRecord>>(new Map())
  const agentUnsubscribeRef = useRef<(() => void) | null>(null)
  const currentAssistantContentRef = useRef('')
  const currentToolCallsRef = useRef<Map<string, ToolCallRecord>>(new Map())
  const hasSubscribedRef = useRef(false)

  // 同步 state 到 ref
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  useEffect(() => {
    currentToolCallsRef.current = currentToolCalls
  }, [currentToolCalls])

  const currentSessionTitle = useMemo(() => {
    return sessions.find(s => s.id === currentSessionId)?.title || '新对话'
  }, [sessions, currentSessionId])

  const handleNewSession = useCallback(async () => {
    const session = await createSession()
    setCurrentSessionId(session.id)
    setMessages([])
    setThinkingSteps(new Map())
    // 创建 Agent 会话
    try {
      const agentSession = await createAgentSession()
      setCurrentAgentSessionId(agentSession.id)
      setCurrentToolCalls(new Map())
    } catch (_e) {
      /* ignore */
    }
  }, [createSession, createAgentSession])

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
      agentUnsubscribeRef.current?.()
      agentUnsubscribeRef.current = null
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (sessions.length === 0 && !currentSessionId) {
      handleNewSession()
    }
  }, [sessions, currentSessionId, handleNewSession])

  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      const timeout = setTimeout(() => {
        saveSession({
          id: currentSessionId,
          title: currentSessionTitle,
          messages: messages.filter(m => m.role !== 'system'),
          createdAt: sessions.find(s => s.id === currentSessionId)?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [messages, currentSessionId, currentSessionTitle, saveSession, sessions])

  const handleSwitchSession = useCallback(async (id: string) => {
    const session = await switchSession(id)
    if (session) {
      setCurrentSessionId(session.id)
      setMessages((session as ChatSession).messages.map((m: { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || Date.now()
      })))
      setThinkingSteps(new Map())
    }
  }, [switchSession])

  const handleDeleteSession = useCallback(async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会话吗？此操作不可撤销。',
      onOk: async () => {
        await deleteSession(id)
        if (currentSessionId === id) {
          setCurrentSessionId(null)
          setMessages([])
          setThinkingSteps(new Map())
        }
      }
    })
  }, [deleteSession, currentSessionId])

  const getContextContent = useCallback(() => {
    const content = getCurrentContent()
    const activeTab = tabs.find(t => t.id === activeTabId)
    const fileName = activeTab?.name || '未命名文档'
    const projectPath = currentProject?.path || ''
    return { content, fileName, projectPath }
  }, [getCurrentContent, activeTabId, tabs, currentProject])

  const buildSystemPrompt = useCallback(() => {
    let systemPrompt = '你是一名专业的网络小说创作助手。'
    systemPrompt += FILE_TOOLS
    systemPrompt += `\n\n【输出格式规则】
当用户要求你修改某段文字时，请返回以下JSON格式（不要添加markdown代码块）：
{"oldString":"原文片段","newString":"修改后的片段"}
oldString 必须是原文中精确存在的片段（包含HTML标签）。当用户不要求修改时，直接返回普通文本。`
    return systemPrompt
  }, [])

  const parseEditJson = useCallback((content: string): { oldString: string; newString: string } | null => {
    try {
      const trimmed = content.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed)
        if (
          typeof parsed.oldString === 'string' &&
          typeof parsed.newString === 'string' &&
          parsed.oldString !== '' &&
          parsed.oldString !== parsed.newString
        ) {
          return { oldString: parsed.oldString, newString: parsed.newString }
        }
      }
    } catch {
      /* ignore parse error */
    }
    return null
  }, [])

  const parseToolCall = useCallback((content: string): { tool: string; path?: string; keyword?: string } | null => {
    try {
      const trimmed = content.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed.tool === 'string') {
          if (parsed.tool === 'read_file' && typeof parsed.path === 'string') {
            return { tool: parsed.tool, path: parsed.path }
          }
          if (parsed.tool === 'list_files') {
            return { tool: parsed.tool }
          }
          if (parsed.tool === 'search_files' && typeof parsed.keyword === 'string') {
            return { tool: parsed.tool, keyword: parsed.keyword }
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }, [])

  const applyStructuredEdit = useCallback(
    (edit: { oldString: string; newString: string }): string | null => {
      const current = getCurrentContent()
      if (!current) return null
      const count = current.split(edit.oldString).length - 1
      if (count === 0) {
        message.error('无法定位要修改的文本，请让 AI 提供更精确的上下文')
        return null
      }
      if (count > 1) {
        message.error(`找到 ${count} 处匹配的文本，请让 AI 提供更长的上下文以精确定位`)
        return null
      }
      return current.replace(edit.oldString, edit.newString)
    },
    [getCurrentContent, message]
  )

  const executeTool = useCallback(async (toolCall: { tool: string; path?: string; keyword?: string }): Promise<string> => {
    try {
      if (toolCall.tool === 'list_files') {
        const tree = await window.api.file.getTree(false, [])
        const simplify = (nodes: Array<{ name: string; path: string; is_directory: boolean; children?: Array<unknown> }>): string => {
          return nodes.map(n => {
            if (n.is_directory && n.children && n.children.length > 0) {
              return `${n.path}/\n${simplify(n.children as Array<{ name: string; path: string; is_directory: boolean; children?: Array<unknown> }>).split('\n').map(l => '  ' + l).join('\n')}`
            }
            return n.path
          }).join('\n')
        }
        return simplify(tree)
      }
      if (toolCall.tool === 'read_file' && toolCall.path) {
        const content = await window.api.file.read(toolCall.path)
        if (content.length > 8000) {
          return content.slice(0, 8000) + '\n\n...（文件过长，已截断）'
        }
        return content
      }
      if (toolCall.tool === 'search_files' && toolCall.keyword) {
        const keyword = toolCall.keyword
        const tree = await window.api.file.getTree(false, [])
        const novelFiles: string[] = []
        const collectNovels = (nodes: Array<{ name: string; path: string; is_directory: boolean; children?: Array<unknown> }>) => {
          for (const n of nodes) {
            if (!n.is_directory && n.name.endsWith('.novel')) {
              novelFiles.push(n.path)
            }
            if (n.is_directory && n.children) {
              collectNovels(n.children as Array<{ name: string; path: string; is_directory: boolean; children?: Array<unknown> }>)
            }
          }
        }
        collectNovels(tree)
        const results: string[] = []
        for (const filePath of novelFiles.slice(0, 20)) {
          try {
            const content = await window.api.file.read(filePath)
            if (content.includes(keyword)) {
              const lines = content.split('\n')
              const matches: string[] = []
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(keyword)) {
                  const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join('\n')
                  matches.push(`  行${i + 1}: ${context.slice(0, 200)}`)
                }
              }
              if (matches.length > 0) {
                results.push(`${filePath}:\n${matches.slice(0, 3).join('\n')}`)
              }
            }
          } catch (_e) {
            /* skip unreadable */
          }
        }
        if (results.length === 0) {
          return `未找到包含 "${keyword}" 的 .novel 文件`
        }
        return `搜索结果（共 ${results.length} 个文件）：\n\n${results.join('\n\n')}`
      }
      return '未知工具'
    } catch (err) {
      return `错误：${err instanceof Error ? err.message : '工具执行失败'}`
    }
  }, [])

  const renderMarkdown = useCallback((text: string) => {
    const rawHtml = marked.parse(text, { async: false }) as string
    return DOMPurify.sanitize(rawHtml)
  }, [])

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      message.success('已复制到剪贴板')
    } catch (_error) {
      message.error('复制失败')
    }
  }, [message])

  const handleInsert = useCallback((content: string) => {
    requestInsertContent(content)
    message.success('已插入到编辑器')
  }, [requestInsertContent, message])

  const handleApply = useCallback((content: string) => {
    const editorStore = useEditorStore.getState()
    const current = editorStore.getCurrentContent()
    const activeTab = editorStore.tabs.find(t => t.id === editorStore.activeTabId)
    const filePath = activeTab?.path || '未命名'
    const fileName = activeTab?.name || '未命名'
    const diffData = textToGitDiff(filePath, current, content)
    editorStore.openDiff(filePath, fileName, diffData)
    editorStore.addPendingAiEdit(filePath, content)
  }, [])

  const shouldShowApply = useCallback((content: string) => {
    const current = getCurrentContent()
    if (!current || !content) return false
    const ratio = content.length / current.length
    return ratio >= 0.8 && ratio <= 1.2
  }, [getCurrentContent])

  const generateTitle = useCallback(async (firstUserContent: string, firstAssistantContent: string) => {
    if (!currentSessionId) return
    try {
      const prompt = `请根据以下对话内容，生成一个简短的中文标题（不超过10个字），直接返回标题文本，不要添加任何解释：

用户：${firstUserContent.slice(0, 100)}
AI：${firstAssistantContent.slice(0, 100)}`
      const result = await window.api.aiAssistant.callApi(prompt, { max_tokens: 30 })
      const title = (result as { content?: string }).content?.trim().replace(/^[""'](.*)[""']$/, '$1') || '新对话'
      const currentMessages = messagesRef.current
      await saveSession({
        id: currentSessionId,
        title,
        messages: currentMessages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (e) {
      console.warn('生成标题失败:', e)
    }
  }, [currentSessionId, saveSession])

  // 使用 ref 避免 useEffect 依赖频繁变化导致重复注册事件监听器
  const messageRef = useRef(message)
  messageRef.current = message
  const parseEditJsonRef = useRef(parseEditJson)
  parseEditJsonRef.current = parseEditJson
  const applyStructuredEditRef = useRef(applyStructuredEdit)
  applyStructuredEditRef.current = applyStructuredEdit
  const generateTitleRef = useRef(generateTitle)
  generateTitleRef.current = generateTitle

  // Agent 事件监听
  useEffect(() => {
    if (hasSubscribedRef.current) return
    hasSubscribedRef.current = true

    agentUnsubscribeRef.current = onAgentEvent((event: AnyAgentEvent) => {
      const ev = event as Record<string, unknown>
      const type = ev.type as string

      if (type === 'text_delta') {
        const delta = (ev.delta as string) || ''
        if (delta) {
          currentAssistantContentRef.current += delta
          setStreamingContent(currentAssistantContentRef.current)
        }
      } else if (type === 'tool_called') {
        const callId = (ev.call_id as string) || ''
        const toolName = (ev.tool_name as string) || ''
        const parameters = (ev.parameters as Record<string, unknown>) || {}
        const toolCall: ToolCallRecord = {
          id: callId,
          callId,
          toolName,
          parameters,
          status: 'running',
          timestamp: Date.now()
        }
        setCurrentToolCalls(prev => new Map(prev).set(callId, toolCall))
      } else if (type === 'tool_result') {
        const callId = (ev.call_id as string) || ''
        const result = ev.result
        const success = ev.success as boolean
        const toolName = (ev.tool_name as string) || ''
        setCurrentToolCalls(prev => {
          const next = new Map(prev)
          const existing = next.get(callId)
          if (existing) {
            next.set(callId, {
              ...existing,
              status: success ? 'success' : 'failed',
              result,
              timestamp: Date.now()
            })
          }
          return next
        })
        // edit 工具成功执行后，在编辑器中打开 diff 标签页
        if (success && toolName === 'edit' && result) {
          const resultObj = result as Record<string, unknown>
          const editedPath = resultObj.path as string
          const original = resultObj.original as string
          const modified = resultObj.modified as string
          if (editedPath && modified !== undefined) {
            const diffData = textToGitDiff(editedPath, original, modified)
            const editorStore = useEditorStore.getState()
            const fileName = editedPath.split('/').pop() || editedPath
            editorStore.openDiff(editedPath, fileName, diffData)
            editorStore.addPendingAiEdit(editedPath, modified)
          }
        }
      } else if (type === 'tool_error') {
        const callId = (ev.call_id as string) || ''
        const errMsg = (ev.message as string) || ''
        setCurrentToolCalls(prev => {
          const next = new Map(prev)
          const existing = next.get(callId)
          if (existing) {
            next.set(callId, {
              ...existing,
              status: 'failed',
              error: errMsg,
              timestamp: Date.now()
            })
          }
          return next
        })
      } else if (type === 'done') {
        setIsStreaming(false)
        setStreamingContent('')
        const content = currentAssistantContentRef.current
        const hasToolCalls = currentToolCallsRef.current.size > 0
        console.warn('[AI Agent] done event, content length:', content.length, 'hasToolCalls:', hasToolCalls)
        if (content || hasToolCalls) {
          const assistantMsgId = Date.now().toString()
          const edit = content ? parseEditJsonRef.current(content) : null
          if (edit) {
            const modified = applyStructuredEditRef.current(edit)
            if (modified) {
              const editorStore = useEditorStore.getState()
              const current = editorStore.getCurrentContent()
              const activeTab = editorStore.tabs.find(t => t.id === editorStore.activeTabId)
              const filePath = activeTab?.path || '未命名'
              const fileName = activeTab?.name || '未命名'
              const diffData = textToGitDiff(filePath, current, modified)
              editorStore.openDiff(filePath, fileName, diffData)
              editorStore.addPendingAiEdit(filePath, modified)
              setMessages(prev => [...prev, {
                id: assistantMsgId,
                role: 'assistant',
                content: '已生成修改建议，请在编辑器 diff 标签页中查看并决定是否接受。',
                timestamp: Date.now(),
                toolCalls: hasToolCalls ? Array.from(currentToolCallsRef.current.values()) : undefined
              }])
            } else {
              setMessages(prev => [...prev, {
                id: assistantMsgId,
                role: 'assistant',
                content,
                timestamp: Date.now(),
                toolCalls: hasToolCalls ? Array.from(currentToolCallsRef.current.values()) : undefined
              }])
            }
          } else {
            setMessages(prev => [...prev, {
              id: assistantMsgId,
              role: 'assistant',
              content,
              timestamp: Date.now(),
              toolCalls: hasToolCalls ? Array.from(currentToolCallsRef.current.values()) : undefined
            }])
          }
          currentAssistantContentRef.current = ''
          setCurrentToolCalls(new Map())
          // 智能标题：如果是第一条 assistant 消息，生成标题
          setTimeout(() => {
            const currentMsgs = messagesRef.current
            const userMsg = currentMsgs.find(m => m.role === 'user')
            const assistantCount = currentMsgs.filter(m => m.role === 'assistant').length
            if (userMsg && assistantCount === 1) {
              generateTitleRef.current(userMsg.content, content)
            }
          }, 100)
        }
      } else if (type === 'error') {
        setIsStreaming(false)
        const err = (ev.error as string) || 'Agent 执行错误'
        messageRef.current.error(err)
      }
    })
    return () => {
      agentUnsubscribeRef.current?.()
      agentUnsubscribeRef.current = null
      hasSubscribedRef.current = false
    }
  }, [onAgentEvent])

  const MAX_TOOL_ROUNDS = 3

  const processConversation = useCallback(async (userContent: string) => {
    if (!userContent.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsStreaming(true)
    setStreamingContent('')
    streamingContentRef.current = ''
    currentAssistantContentRef.current = ''
    setCurrentToolCalls(new Map())

    // 如果没有 Agent 会话，先创建一个
    let agentSessionId = currentAgentSessionId
    if (!agentSessionId) {
      try {
        const agentSession = await createAgentSession()
        setCurrentAgentSessionId(agentSession.id)
        agentSessionId = agentSession.id
      } catch (_e) {
        /* ignore */
      }
    }

    // 自动预加载文件内容
    let enrichedContent = ''
    try {
      const tree = await window.api.file.getTree(false, [])
      const novelFiles: Array<{ name: string; path: string }> = []
      const collectNovels = (nodes: Array<{name: string; path: string; is_directory: boolean; children?: Array<unknown>}>) => {
        for (const n of nodes) {
          if (!n.is_directory && n.name.endsWith('.novel')) {
            novelFiles.push({ name: n.name, path: n.path })
          }
          if (n.is_directory && n.children) {
            collectNovels(n.children as Array<{name: string; path: string; is_directory: boolean; children?: Array<unknown>}>)
          }
        }
      }
      collectNovels(tree)

      if (novelFiles.length > 0) {
        const stopWords = new Set(['把', '的', '和', '了', '在', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们', '帮', '请', '将', '改', '修改', '调整', '变成', '一下', '更加', '有点', '一些', '那个', '这个'])
        const candidates = userContent
          .split(/[\s，。！？；：""''（）【】\n]+/)
          .filter(w => w.length >= 2 && !stopWords.has(w))

        let matchedPath: string | null = null
        let matchedScore = 0
        for (const novel of novelFiles) {
          const nameWithoutExt = novel.name.replace(/\.novel$/, '')
          for (const cand of candidates) {
            if (nameWithoutExt.includes(cand) || cand.includes(nameWithoutExt)) {
              const score = cand.length
              if (score > matchedScore) {
                matchedScore = score
                matchedPath = novel.path
              }
            }
          }
        }

        if (!matchedPath) {
          const chapterPattern = /第[一二三四五六七八九十百千万\d]+章|第[一二三四五六七八九十百千万\d]+节|第[一二三四五六七八九十百千万\d]+回|序章|终章|尾声|前言|引言|楔子/i
          const chapterMatch = userContent.match(chapterPattern)
          if (chapterMatch) {
            const chapterName = chapterMatch[0]
            for (const novel of novelFiles) {
              const nameWithoutExt = novel.name.replace(/\.novel$/, '')
              if (nameWithoutExt.includes(chapterName) || chapterName.includes(nameWithoutExt)) {
                matchedPath = novel.path
                break
              }
            }
          }
        }

        if (matchedPath) {
          const fileContent = await window.api.file.read(matchedPath)
          const truncated = fileContent.length > 5000 ? fileContent.slice(0, 5000) + '...（后略）' : fileContent
          enrichedContent = `【文件内容来自 ${matchedPath}】\n${truncated}`
        } else if (novelFiles.length <= 5) {
          const fileList = novelFiles.map(f => f.path).join('\n')
          enrichedContent = `【项目中的小说文件列表】\n${fileList}`
        }
      }
    } catch (e) {
      console.warn('[AI Agent] 自动预加载失败', e)
    }

    // 使用 Agent 系统
    if (agentSessionId) {
      try {
        await runAgent(userContent, enrichedContent)
      } catch (error) {
        setIsStreaming(false)
        message.error('请求失败：' + (error instanceof Error ? error.message : '未知错误'))
      }
      return
    }

    // 降级：使用旧的流式调用
    let currentMessages: ChatMessage[] = [...messages, userMessage]
    let toolRounds = 0
    let finalAccumulated = ''

    const callApiOnce = async (userPrompt: string, historyMessages: ChatMessage[], sysPrompt: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        let accumulated = ''
        const historyLines: string[] = []
        for (const m of historyMessages) {
          if (m.role === 'system') continue
          if (m.role === 'user' && m.content.startsWith('[工具执行结果]')) {
            historyLines.push(`系统：${m.content}`)
          } else {
            historyLines.push(`${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
          }
        }

        let fullPrompt: string
        if (historyLines.length > 0 && !userPrompt) {
          fullPrompt = historyLines.join('\n\n') + '\n\n请根据以上对话和工具结果继续完成用户的请求，如果需要使用工具请返回工具调用JSON。'
        } else if (historyLines.length > 0) {
          fullPrompt = historyLines.join('\n\n') + '\n\n用户：' + userPrompt
        } else {
          fullPrompt = '用户：' + userPrompt
        }

        console.warn('[AI Agent] === System Prompt 摘要（前800字）===')
        console.warn(sysPrompt.slice(0, 800))
        console.warn('[AI Agent] === User Prompt 摘要（前500字）===')
        console.warn(fullPrompt.slice(0, 500))

        const unsub = window.api.aiAssistant.onStreamChunk((chunk) => {
          const typedChunk = chunk as AiApiStreamChunk
          if (typedChunk.type === 'chunk' && typedChunk.content) {
            accumulated += typedChunk.content
            setStreamingContent(accumulated)
            streamingContentRef.current = accumulated
          } else if (typedChunk.type === 'done') {
            resolve(accumulated)
            unsub?.()
          } else if (typedChunk.type === 'error') {
            reject(new Error(typedChunk.error || '未知错误'))
            unsub?.()
          }
        })

        callApiStream(fullPrompt, { systemPrompt: sysPrompt })
          .catch(reject)
      })
    }

    console.warn('[AI Agent] 开始对话，用户输入:', userContent)
    currentThinkingRef.current = []

    // 自动预加载：把文件内容直接拼进 user prompt，而非 system prompt
    let enrichedUserContent = userContent
    let _autoLoadedFilePath = ''
    try {
      const tree = await window.api.file.getTree(false, [])

      // 收集所有 .novel 文件
      const novelFiles: Array<{ name: string; path: string }> = []
      const collectNovels = (nodes: Array<{name: string; path: string; is_directory: boolean; children?: Array<unknown>}>) => {
        for (const n of nodes) {
          if (!n.is_directory && n.name.endsWith('.novel')) {
            novelFiles.push({ name: n.name, path: n.path })
          }
          if (n.is_directory && n.children) {
            collectNovels(n.children as Array<{name: string; path: string; is_directory: boolean; children?: Array<unknown>}>)
          }
        }
      }
      collectNovels(tree)

      if (novelFiles.length > 0) {
        // 从用户输入中提取可能的文件名关键词（去除常见动词和助词）
        const stopWords = new Set(['把', '的', '和', '了', '在', '是', '我', '你', '他', '她', '它', '我们', '你们', '他们', '帮', '请', '将', '改', '修改', '调整', '变成', '变成', '一下', '更加', '有点', '一些', '那个', '这个'])
        const candidates = userContent
          .split(/[\s，。！？；：""''（）【】\n]+/)
          .filter(w => w.length >= 2 && !stopWords.has(w))

        // 先尝试直接匹配文件名
        let matchedPath: string | null = null
        let matchedScore = 0
        for (const novel of novelFiles) {
          const nameWithoutExt = novel.name.replace(/\.novel$/, '')
          for (const cand of candidates) {
            if (nameWithoutExt.includes(cand) || cand.includes(nameWithoutExt)) {
              const score = cand.length
              if (score > matchedScore) {
                matchedScore = score
                matchedPath = novel.path
              }
            }
          }
        }

        // 再尝试匹配章节关键词（如"第一章"等）在文件名中的出现
        if (!matchedPath) {
          const chapterPattern = /第[一二三四五六七八九十百千万\d]+章|第[一二三四五六七八九十百千万\d]+节|第[一二三四五六七八九十百千万\d]+回|序章|终章|尾声|前言|引言|楔子/i
          const chapterMatch = userContent.match(chapterPattern)
          if (chapterMatch) {
            const chapterName = chapterMatch[0]
            for (const novel of novelFiles) {
              const nameWithoutExt = novel.name.replace(/\.novel$/, '')
              if (nameWithoutExt.includes(chapterName) || chapterName.includes(nameWithoutExt)) {
                matchedPath = novel.path
                break
              }
            }
          }
        }

        if (matchedPath) {
          const fileContent = await window.api.file.read(matchedPath)
          const truncated = fileContent.length > 5000 ? fileContent.slice(0, 5000) + '...（后略）' : fileContent
          enrichedUserContent += `\n\n【以下是你需要修改的文件内容，来自 ${matchedPath}】\n${truncated}\n\n请基于以上内容直接给出修改建议。注意：内容使用 HTML 标签排版，修改时请保留 HTML 标签。`
          _autoLoadedFilePath = matchedPath
          console.warn('[AI Agent] 自动预加载文件:', matchedPath, fileContent.length, '字符')
        } else if (novelFiles.length <= 5) {
          // 如果 .novel 文件很少，直接列出所有文件名供AI参考
          const fileList = novelFiles.map(f => f.path).join('\n')
          enrichedUserContent += `\n\n【项目中的小说文件列表】\n${fileList}\n\n当用户提到某个文件时，你可以使用 read_file 工具读取其内容。`
        }
      }
    } catch (e) {
      console.warn('[AI Agent] 自动预加载失败', e)
    }

    const enhancedSystemPrompt = buildSystemPrompt()

    try {
      while (toolRounds < MAX_TOOL_ROUNDS) {
        const userPrompt = toolRounds === 0 ? enrichedUserContent : ''
        const response = await callApiOnce(userPrompt, currentMessages, enhancedSystemPrompt)
        finalAccumulated = response

        const toolCall = parseToolCall(response)
        if (!toolCall) {
          break
        }

        console.warn('[AI Agent] 检测到工具调用:', toolCall)
        const toolCallLabel = toolCall.tool === 'list_files'
          ? '查找项目文件'
          : toolCall.tool === 'search_files'
            ? `搜索 "${toolCall.keyword}"`
            : `读取 ${toolCall.path}`
        currentThinkingRef.current.push({
          type: 'tool_call',
          content: toolCallLabel,
          timestamp: Date.now()
        })

        const statusContent = toolCall.tool === 'list_files'
          ? 'AI正在查找项目文件...'
          : toolCall.tool === 'search_files'
            ? `AI正在搜索 "${toolCall.keyword}"...`
            : `AI正在读取 \`${toolCall.path}\`...`
        const statusMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'system',
          content: statusContent,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, statusMsg])
        currentMessages = [...currentMessages, statusMsg]

        console.warn('[AI Agent] 执行工具:', toolCall)
        const toolResult = await executeTool(toolCall)
        console.warn('[AI Agent] 工具结果摘要:', toolResult.slice(0, 200))

        currentThinkingRef.current.push({
          type: 'tool_result',
          content: `获取到 ${toolResult.length} 字符`,
          timestamp: Date.now()
        })

        const toolResultMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content: `[工具执行结果]\n${toolResult}`,
          timestamp: Date.now()
        }
        setMessages(prev => {
          const withoutStatus = prev.filter(m => m.id !== statusMsg.id)
          return [...withoutStatus, toolResultMsg]
        })
        currentMessages = [...currentMessages.filter(m => m.id !== statusMsg.id), toolResultMsg]

        toolRounds++
        setStreamingContent('')
        streamingContentRef.current = ''
      }

      if (toolRounds >= MAX_TOOL_ROUNDS) {
        console.warn('[AI Agent] 达到最大工具调用轮次')
      }

      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''

      const assistantMsgId = Date.now().toString()
      const edit = parseEditJson(finalAccumulated)
      if (edit) {
        currentThinkingRef.current.push({
          type: 'thinking',
          content: '生成修改建议',
          timestamp: Date.now()
        })
        const modified = applyStructuredEdit(edit)
        if (modified) {
          const editorStore = useEditorStore.getState()
          const current = editorStore.getCurrentContent()
          const activeTab = editorStore.tabs.find(t => t.id === editorStore.activeTabId)
          const filePath = activeTab?.path || '未命名'
          const fileName = activeTab?.name || '未命名'
          const diffData = textToGitDiff(filePath, current, modified)
          editorStore.openDiff(filePath, fileName, diffData)
          editorStore.addPendingAiEdit(filePath, modified)
          setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: '已生成修改建议，请在编辑器 diff 标签页中查看并决定是否接受。',
            timestamp: Date.now()
          }])
        } else {
          setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: finalAccumulated,
            timestamp: Date.now()
          }])
        }
      } else {
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: 'assistant',
          content: finalAccumulated,
          timestamp: Date.now()
        }])
      }

      if (currentThinkingRef.current.length > 0) {
        setThinkingSteps(prev => {
          const next = new Map(prev)
          next.set(assistantMsgId, [...currentThinkingRef.current])
          return next
        })
      }

      if (toolRounds >= MAX_TOOL_ROUNDS && parseToolCall(finalAccumulated)) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'system',
          content: 'AI 尝试多次查找文件但未完成，请明确指定文件路径',
          timestamp: Date.now()
        }])
      }
    } catch (error) {
      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''
      message.error('请求失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [messages, isStreaming, callApiStream, buildSystemPrompt, message, parseEditJson, applyStructuredEdit, parseToolCall, executeTool, currentAgentSessionId, runAgent, createAgentSession])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      processConversation(inputValue)
    }
  }, [inputValue, processConversation])

  const handleQuickAction = useCallback(
    (promptTemplate: string) => {
      const { content } = getContextContent()
      const prompt = promptTemplate.replace('{content}', content || '（当前文档为空）')
      processConversation(prompt)
    },
    [getContextContent, processConversation]
  )

  const handleClear = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    setMessages([])
    setStreamingContent('')
    streamingContentRef.current = ''
    setIsStreaming(false)
  }, [])

  const handleUndo = useCallback((assistantMsgId: string) => {
    setMessages(prev => {
      const assistantIndex = prev.findIndex(m => m.id === assistantMsgId)
      if (assistantIndex <= 0) return prev
      // 找到对应的 user 消息（assistant 消息前最近的一条 user 消息）
      let userIndex = -1
      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (prev[i].role === 'user') {
          userIndex = i
          break
        }
      }
      if (userIndex === -1) return prev
      return prev.filter((_, i) => i !== assistantIndex && i !== userIndex)
    })
  }, [])

  const handleRetry = useCallback((assistantMsgId: string) => {
    setMessages(prev => {
      const assistantIndex = prev.findIndex(m => m.id === assistantMsgId)
      if (assistantIndex <= 0) return prev
      let userIndex = -1
      let userContent = ''
      for (let i = assistantIndex - 1; i >= 0; i--) {
        if (prev[i].role === 'user') {
          userIndex = i
          userContent = prev[i].content
          break
        }
      }
      if (userIndex === -1 || !userContent) return prev
      // 删除 assistant 消息，保留 user 消息
      const newMessages = prev.filter((_, i) => i !== assistantIndex)
      setTimeout(() => processConversation(userContent), 0)
      return newMessages
    })
  }, [processConversation])

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
            <Space>
              <MessageOutlined />
              <span className={styles.headerTitle}>AI 写作助手</span>
            </Space>
            <Space>
              <Dropdown
                menu={{
                  items: sessions.map(s => ({
                    key: s.id,
                    label: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                        <span>{s.title}</span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(s.id)
                          }}
                        />
                      </div>
                    ),
                    onClick: () => handleSwitchSession(s.id)
                  })),
                  selectedKeys: currentSessionId ? [currentSessionId] : []
                }}
                placement="bottomRight"
              >
                <Button size="small">
                  {currentSessionTitle || '选择会话'} <DownOutlined />
                </Button>
              </Dropdown>
              <Tooltip title="新建会话">
                <Button size="small" icon={<PlusOutlined />} onClick={handleNewSession} />
              </Tooltip>
              <Tooltip title="清空对话">
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={handleClear}
                />
              </Tooltip>
            </Space>
          </div>

          <div className={styles.messagesArea}>
            {messages.length === 0 && !isStreaming && (
              <div style={{ textAlign: 'center', color: 'var(--ant-color-text-secondary)', marginTop: 24 }}>
                <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div>开始与 AI 助手对话</div>
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : msg.role === 'assistant' ? styles.messageRowAssistant : ''}`}
              >
                {msg.role === 'system' && (
                  <div className={styles.systemMessage}>
                    <LoadingOutlined style={{ marginRight: 8 }} />
                    {msg.content}
                  </div>
                )}
                {msg.role !== 'system' && (
                  <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}`}>
                    <div
                      className={styles.messageContent}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                    {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className={styles.toolCallList}>
                        {msg.toolCalls.map(toolCall => (
                          <ToolCallCard key={toolCall.callId} toolCall={toolCall} />
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' && (
                      <div className={styles.messageActions}>
                        <Tooltip title="复制">
                          <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(msg.content)} />
                        </Tooltip>
                        <Tooltip title="插入到编辑器">
                          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleInsert(msg.content)} />
                        </Tooltip>
                        {shouldShowApply(msg.content) && (
                          <Tooltip title="应用修改">
                            <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => handleApply(msg.content)} />
                          </Tooltip>
                        )}
                        <Tooltip title="撤回">
                          <Button type="text" size="small" icon={<RollbackOutlined />} onClick={() => handleUndo(msg.id)} />
                        </Tooltip>
                        <Tooltip title="重试">
                          <Button type="text" size="small" icon={<RedoOutlined />} onClick={() => handleRetry(msg.id)} />
                        </Tooltip>
                      </div>
                    )}
                    {msg.role === 'assistant' && thinkingSteps.get(msg.id) && (
                      <div className={styles.thinkingProcess}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setExpandedThinkingIds(prev => {
                            const next = new Set(prev)
                            if (next.has(msg.id)) next.delete(msg.id)
                            else next.add(msg.id)
                            return next
                          })}
                        >
                          {expandedThinkingIds.has(msg.id) ? '隐藏思考过程' : '思考过程'}
                        </Button>
                        {expandedThinkingIds.has(msg.id) && (
                          <div className={styles.thinkingTimeline}>
                            {thinkingSteps.get(msg.id)?.map((step, i) => (
                              <div key={i} className={styles.thinkingStep}>
                                <div className={styles.thinkingDot} />
                                <div className={styles.thinkingContent}>{step.content}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
                <div className={`${styles.messageBubble} ${styles.messageBubbleAssistant}`}>
                  <div
                    className={styles.messageContent}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
                  />
                  <span className={styles.streamingCursor} />
                  {/* 工具调用卡片 */}
                  {currentToolCalls.size > 0 && (
                    <div className={styles.toolCallList}>
                      {Array.from(currentToolCalls.values()).map(toolCall => (
                        <ToolCallCard key={toolCall.callId} toolCall={toolCall} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <div className={styles.quickActions}>
              {QUICK_ACTIONS.map(action => (
                <Button
                  key={action.key}
                  size="small"
                  icon={action.icon}
                  className={styles.quickActionBtn}
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <Input.TextArea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，Enter 发送，Shift+Enter 换行"
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => processConversation(inputValue)}
                loading={isStreaming}
                disabled={!inputValue.trim()}
              >
                发送
              </Button>
            </div>
          </div>
    </div>
  )
}

export default AiAssistantPanel

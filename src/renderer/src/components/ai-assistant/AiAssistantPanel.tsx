/**
 * AI 写作助手侧边栏面板 — 常驻对话界面
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Input, Space, Tooltip, App } from 'antd'
import {
  SendOutlined,
  ClearOutlined,
  CopyOutlined,
  EditOutlined,
  FileTextOutlined,
  CheckOutlined,
  HighlightOutlined,
  UserOutlined,
  MessageOutlined
} from '@ant-design/icons'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import { useEditorStore } from '@stores/editorStore'
import { useProjectStore } from '@stores/projectStore'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { AiApiStreamChunk } from '@shared/ai-assistant'
import AiDiffPanel from './AiDiffPanel'
import styles from './AiAssistantPanel.module.css'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
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

function AiAssistantPanel(): JSX.Element {
  const { message } = App.useApp()
  const { callApiStream } = useAiAssistantStore()
  const getCurrentContent = useEditorStore(state => state.getCurrentContent)
  const requestInsertContent = useEditorStore(state => state.requestInsertContent)
  const activeTabId = useEditorStore(state => state.activeTabId)
  const tabs = useEditorStore(state => state.tabs)
  const currentProject = useProjectStore(state => state.currentProject)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showDiffPanel, setShowDiffPanel] = useState(false)
  const [pendingModifiedText, setPendingModifiedText] = useState('')
  const streamingContentRef = useRef('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const getContextContent = useCallback(() => {
    const content = getCurrentContent()
    const activeTab = tabs.find(t => t.id === activeTabId)
    const fileName = activeTab?.name || '未命名文档'
    const projectPath = currentProject?.path || ''
    return { content, fileName, projectPath }
  }, [getCurrentContent, activeTabId, tabs, currentProject])

  const buildSystemPrompt = useCallback(() => {
    const { content, fileName, projectPath } = getContextContent()
    let systemPrompt = '你是一名专业的网络小说创作助手。'
    if (projectPath) {
      systemPrompt += `当前工作目录：${projectPath}。`
    }
    systemPrompt += `当前编辑的文档是「${fileName}」。`
    if (content && content.trim()) {
      const truncated = content.length > 3000 ? content.slice(0, 3000) + '...（后略）' : content
      systemPrompt += `\n\n【当前文档内容】\n${truncated}`
    }
    return systemPrompt
  }, [getContextContent])

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
    setPendingModifiedText(content)
    setShowDiffPanel(true)
  }, [])

  const handleAcceptDiff = useCallback(() => {
    useEditorStore.getState().updateContent(pendingModifiedText)
    setShowDiffPanel(false)
    setPendingModifiedText('')
    message.success('已接受修改')
  }, [pendingModifiedText, message])

  const handleRejectDiff = useCallback(() => {
    setShowDiffPanel(false)
    setPendingModifiedText('')
    message.info('已拒绝修改')
  }, [message])

  const shouldShowApply = useCallback((content: string) => {
    const current = getCurrentContent()
    if (!current || !content) return false
    const ratio = content.length / current.length
    return ratio >= 0.8 && ratio <= 1.2
  }, [getCurrentContent])

  const sendMessage = useCallback(async (userContent: string) => {
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

    const systemPrompt = buildSystemPrompt()
    const history = messages.map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n\n')
    const prompt = history ? `${history}\n\n用户：${userContent}` : userContent

    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    let accumulated = ''

    try {
      unsubscribeRef.current = window.api.aiAssistant.onStreamChunk((chunk) => {
        const typedChunk = chunk as AiApiStreamChunk
        if (typedChunk.type === 'chunk' && typedChunk.content) {
          accumulated += typedChunk.content
          setStreamingContent(accumulated)
          streamingContentRef.current = accumulated
        } else if (typedChunk.type === 'done') {
          setIsStreaming(false)
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: accumulated,
            timestamp: Date.now()
          }])
          setStreamingContent('')
          streamingContentRef.current = ''
          unsubscribeRef.current?.()
          unsubscribeRef.current = null
        } else if (typedChunk.type === 'error') {
          setIsStreaming(false)
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: '发生错误：' + (typedChunk.error || '未知错误'),
            timestamp: Date.now()
          }])
          setStreamingContent('')
          streamingContentRef.current = ''
          unsubscribeRef.current?.()
          unsubscribeRef.current = null
        }
      })

      await callApiStream(prompt, { systemPrompt })
    } catch (error) {
      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
      message.error('请求失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }, [messages, isStreaming, callApiStream, buildSystemPrompt, message])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }, [inputValue, sendMessage])

  const handleQuickAction = useCallback((promptTemplate: string) => {
    setInputValue(promptTemplate.replace('{content}', ''))
  }, [])

  const handleClear = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
    setMessages([])
    setStreamingContent('')
    streamingContentRef.current = ''
    setIsStreaming(false)
  }, [])

  return (
    <div className={styles.chatContainer}>
      {showDiffPanel ? (
        <AiDiffPanel
          originalText={getCurrentContent()}
          modifiedText={pendingModifiedText}
          onAccept={handleAcceptDiff}
          onReject={handleRejectDiff}
        />
      ) : (
        <>
          <div className={styles.header}>
            <Space>
              <MessageOutlined />
              <span className={styles.headerTitle}>AI 写作助手</span>
            </Space>
            <Tooltip title="清空对话">
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClear}
              />
            </Tooltip>
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
                className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant}`}
              >
                <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}`}>
                  <div
                    className={styles.messageContent}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
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
                    </div>
                  )}
                </div>
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
                onClick={() => sendMessage(inputValue)}
                loading={isStreaming}
                disabled={!inputValue.trim()}
              >
                发送
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AiAssistantPanel

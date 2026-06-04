/**
 * AI 自由对话对话框
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Input, Button, Spin } from 'antd'
import { SendOutlined, ImportOutlined } from '@ant-design/icons'
import type { Editor } from '@tiptap/react'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import type { AiApiStreamChunk } from '@shared/ai-assistant'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiChatDialogProps {
  open: boolean
  onClose: () => void
  editor: Editor | null
}

export function AiChatDialog({ open, onClose, editor }: AiChatDialogProps) {
  const { callApiStream, onStreamChunk, removeStreamChunkListener } = useAiAssistantStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unlistenRef = useRef<(() => void) | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamContent, scrollToBottom])

  const cleanup = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current()
      unlistenRef.current = null
    }
    removeStreamChunkListener()
  }, [removeStreamChunkListener])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setStreamContent('')

    const historyPrompt = newMessages
      .map(m => (m.role === 'user' ? `用户：${m.content}` : `AI：${m.content}`))
      .join('\n\n')

    const prompt = `${historyPrompt}\n\n用户：${userMessage.content}\n\nAI：`

    const streamChunkHandler = (chunk: AiApiStreamChunk) => {
      if (chunk.type === 'chunk' && chunk.content) {
        setStreamContent(prev => prev + chunk.content)
      } else if (chunk.type === 'error') {
        setStreamContent(prev => prev + '\n[错误: ' + (chunk.error || '未知错误') + ']')
        setIsLoading(false)
      } else if (chunk.type === 'done') {
        setIsLoading(false)
      }
    }

    const unlisten = onStreamChunk(streamChunkHandler)
    unlistenRef.current = unlisten || null

    try {
      const result = await callApiStream(prompt, {
        systemPrompt: '你是一名专业的网络小说写作助手，帮助作者解答写作问题、提供创意建议、分析剧情等。请用中文回答。',
        temperature: 0.7,
        maxTokens: 2000
      })
      if (!result.success) {
        setStreamContent(prev => prev + '\n[错误: ' + (result.error || '调用失败') + ']')
        setIsLoading(false)
      }
    } catch (_error) {
      setStreamContent(prev => prev + '\n[错误: 调用失败]')
      setIsLoading(false)
    } finally {
      cleanup()
    }
  }, [input, isLoading, messages, callApiStream, onStreamChunk, cleanup])

  useEffect(() => {
    if (!isLoading && streamContent) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamContent }])
      setStreamContent('')
    }
  }, [isLoading, streamContent])

  const handleInsert = useCallback(
    (content: string) => {
      if (!editor) return
      editor.chain().focus().insertContent(content).run()
    },
    [editor]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <Modal
      title="询问 AI"
      open={open}
      onCancel={onClose}
      width={700}
      footer={null}
      bodyStyle={{ padding: 0 }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 500
        }}
      >
        {/* 消息列表 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--ant-color-text-secondary)',
                marginTop: 120
              }}
            >
              有任何写作问题都可以问我
            </div>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background:
                  msg.role === 'user'
                    ? 'var(--ant-color-primary-bg)'
                    : 'var(--ant-color-bg-layout)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.content}
              {msg.role === 'assistant' && (
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <Button
                    type="link"
                    size="small"
                    icon={<ImportOutlined />}
                    onClick={() => handleInsert(msg.content)}
                  >
                    插入到编辑器
                  </Button>
                </div>
              )}
            </div>
          ))}
          {isLoading && streamContent && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                background: 'var(--ant-color-bg-layout)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}
            >
              {streamContent}
              <Spin size="small" style={{ marginLeft: 8 }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div
          style={{
            borderTop: '1px solid var(--ant-color-border)',
            padding: 12,
            display: 'flex',
            gap: 8
          }}
        >
          <Input.TextArea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题，按 Enter 发送，Shift+Enter 换行"
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1 }}
            disabled={isLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isLoading}
            disabled={!input.trim()}
          />
        </div>
      </div>
    </Modal>
  )
}

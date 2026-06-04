/**
 * AI 写作共享 Hook
 * 为 Toolbar 和 ContextMenu 提供流式 AI 调用能力
 */

import { useCallback, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import type { AiApiStreamChunk } from '@shared/ai-assistant'

export interface UseAiWritingReturn {
  isStreaming: boolean
  streamingContent: string
  aiPreviewVisible: boolean
  aiCurrentAction: string
  aiLoading: boolean

  startStream: (action: string, prompt: string, options?: Record<string, unknown>) => Promise<void>
  stopStream: () => void
  closePreview: () => void
  applyResult: (editor: Editor | null, replace: boolean, content: string) => void
}

export function useAiWriting(): UseAiWritingReturn {
  const { callApiStream, onStreamChunk, removeStreamChunkListener } = useAiAssistantStore()

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [aiPreviewVisible, setAiPreviewVisible] = useState(false)
  const [aiCurrentAction, setAiCurrentAction] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const unlistenRef = useRef<(() => void) | null>(null)

  const cleanup = useCallback(() => {
    if (unlistenRef.current) {
      unlistenRef.current()
      unlistenRef.current = null
    }
    removeStreamChunkListener()
  }, [removeStreamChunkListener])

  const startStream = useCallback(
    async (action: string, prompt: string, options?: Record<string, unknown>) => {
      setAiCurrentAction(action)
      setAiLoading(true)
      setAiPreviewVisible(true)
      setStreamingContent('')
      setIsStreaming(true)

      const streamChunkHandler = (chunk: AiApiStreamChunk) => {
        if (chunk.type === 'chunk' && chunk.content) {
          setStreamingContent(prev => prev + chunk.content)
        } else if (chunk.type === 'error') {
          setStreamingContent(prev => prev + '\n[错误: ' + (chunk.error || '未知错误') + ']')
          setIsStreaming(false)
          setAiLoading(false)
        } else if (chunk.type === 'done') {
          setIsStreaming(false)
          setAiLoading(false)
        }
      }

      const unlisten = onStreamChunk(streamChunkHandler)
      unlistenRef.current = unlisten || null

      try {
        const result = await callApiStream(prompt, options)
        if (!result.success) {
          setStreamingContent(prev => prev + '\n[错误: ' + (result.error || '调用失败') + ']')
          setIsStreaming(false)
          setAiLoading(false)
        }
      } catch (_error) {
        setStreamingContent(prev => prev + '\n[错误: 调用失败]')
        setIsStreaming(false)
        setAiLoading(false)
      } finally {
        cleanup()
      }
    },
    [callApiStream, onStreamChunk, cleanup]
  )

  const stopStream = useCallback(() => {
    cleanup()
    setIsStreaming(false)
    setAiLoading(false)
    setAiPreviewVisible(false)
    setStreamingContent('')
  }, [cleanup])

  const closePreview = useCallback(() => {
    cleanup()
    setAiPreviewVisible(false)
    setStreamingContent('')
    setIsStreaming(false)
    setAiLoading(false)
  }, [cleanup])

  const applyResult = useCallback(
    (editor: Editor | null, replace: boolean, content: string) => {
      if (!editor || !content) return

      const { from, to } = editor.state.selection
      const hasSelection = from !== to

      if (replace && hasSelection) {
        editor.chain().focus().insertContentAt({ from, to }, content).run()
      } else {
        editor.chain().focus().insertContent(content).run()
      }

      setAiPreviewVisible(false)
      setStreamingContent('')
    },
    []
  )

  return {
    isStreaming,
    streamingContent,
    aiPreviewVisible,
    aiCurrentAction,
    aiLoading,
    startStream,
    stopStream,
    closePreview,
    applyResult
  }
}

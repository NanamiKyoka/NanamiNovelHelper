/**
 * 悬浮卡片状态 Hook
 * 
 * 管理编辑器中词汇高亮悬浮卡片的状态
 */

import { useState, useRef, useCallback } from 'react'
import type { HoverCardConfig } from '@shared/highlight'

interface HoverCardState {
  visible: boolean
  entryId: string
  isSensitive: boolean
  severity?: string
  position: { x: number; y: number }
}

interface UseHoverCardOptions {
  /** 悬浮卡片配置 */
  config?: HoverCardConfig
  /** 默认延迟时间 */
  defaultDelay?: number
}

interface UseHoverCardReturn {
  /** 悬浮卡片状态 */
  state: HoverCardState
  /** 显示悬浮卡片 */
  show: (entryId: string, event: MouseEvent, isSensitive?: boolean, severity?: string) => void
  /** 隐藏悬浮卡片 */
  hide: () => void
  /** 处理悬停事件（带延迟） */
  handleHover: (entryId: string, event: MouseEvent) => void
  /** 取消悬停计时器 */
  cancelHover: () => void
  /** 配置 */
  config?: HoverCardConfig
}

/**
 * 悬浮卡片状态管理 Hook
 */
export function useHoverCard(options: UseHoverCardOptions = {}): UseHoverCardReturn {
  const { config, defaultDelay = 300 } = options

  const [state, setState] = useState<HoverCardState>({
    visible: false,
    entryId: '',
    isSensitive: false,
    severity: undefined,
    position: { x: 0, y: 0 }
  })

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const show = useCallback((
    entryId: string,
    event: MouseEvent,
    isSensitive = false,
    severity?: string
  ) => {
    setState({
      visible: true,
      entryId,
      isSensitive,
      severity,
      position: { x: event.clientX, y: event.clientY }
    })
  }, [])

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }))
  }, [])

  const cancelHover = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  const handleHover = useCallback((entryId: string, event: MouseEvent) => {
    // 清除之前的计时器
    cancelHover()

    // 设置延迟显示
    const delay = config?.delay || defaultDelay
    hoverTimeoutRef.current = setTimeout(() => {
      const target = event.target as HTMLElement
      const highlightEl = target.closest('[data-entry-id]')
      if (highlightEl) {
        const isSensitive = highlightEl.getAttribute('data-sensitive') === 'true'
        const severity = highlightEl.getAttribute('data-severity') || undefined
        show(entryId, event, isSensitive, severity)
      }
    }, delay)
  }, [config, defaultDelay, cancelHover, show])

  return {
    state,
    show,
    hide,
    handleHover,
    cancelHover,
    config
  }
}

export default useHoverCard

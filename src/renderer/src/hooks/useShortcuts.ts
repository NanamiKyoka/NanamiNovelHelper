/**
 * 全局快捷键管理 Hook
 * 
 * 提供全局快捷键注册和管理功能，支持：
 * - 自定义快捷键绑定
 * - 快捷键冲突检测
 * - 按作用域管理快捷键
 */

import { useEffect, useRef } from 'react'

/** 快捷键配置 */
export interface ShortcutConfig {
  /** 快捷键 ID */
  id: string
  /** 快捷键组合（如 'Ctrl+S'） */
  key: string
  /** 回调函数 */
  action: () => void
  /** 是否启用 */
  enabled?: boolean
  /** 阻止默认行为 */
  preventDefault?: boolean
  /** 阻止冒泡 */
  stopPropagation?: boolean
  /** 描述 */
  description?: string
  /** 分类 */
  category?: string
}

/** 已注册的快捷键映射 */
type ShortcutMap = Map<string, ShortcutConfig>

/** 全局快捷键状态 */
const globalShortcuts: ShortcutMap = new Map()

/**
 * 规范化按键字符串
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .split('+')
    .map(k => k.trim())
    .sort((a, b) => {
      // 修饰键优先排序：ctrl, shift, alt, meta
      const order = ['ctrl', 'shift', 'alt', 'meta']
      const aIndex = order.indexOf(a)
      const bIndex = order.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })
    .join('+')
}

/**
 * 从键盘事件生成按键字符串
 */
function eventToKeyString(e: KeyboardEvent): string {
  const keys: string[] = []
  
  if (e.ctrlKey) keys.push('ctrl')
  if (e.shiftKey) keys.push('shift')
  if (e.altKey) keys.push('alt')
  if (e.metaKey) keys.push('meta')
  
  // 主键
  const key = e.key.toLowerCase()
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    keys.push(key)
  }
  
  return normalizeKey(keys.join('+'))
}

/**
 * 注册全局快捷键
 */
export function registerShortcut(config: ShortcutConfig): () => void {
  const normalizedKey = normalizeKey(config.key)
  const id = config.id
  
  globalShortcuts.set(id, { ...config, key: normalizedKey })
  
  // 返回注销函数
  return () => {
    globalShortcuts.delete(id)
  }
}

/**
 * 批量注册快捷键
 */
export function registerShortcuts(configs: ShortcutConfig[]): () => void {
  const unsubscribers = configs.map(config => registerShortcut(config))
  
  return () => {
    unsubscribers.forEach(unsub => unsub())
  }
}

/**
 * 全局键盘事件处理器
 */
function handleKeyDown(e: KeyboardEvent): void {
  // 忽略输入框中的快捷键（除非明确允许）
  const target = e.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.isContentEditable
  
  const keyString = eventToKeyString(e)
  
  // 查找匹配的快捷键
  for (const config of globalShortcuts.values()) {
    if (normalizeKey(config.key) !== keyString) continue
    if (config.enabled === false) continue
    
    // 检查是否在输入框中
    if (isInput) {
      // 在输入框中只响应特定快捷键（如 Ctrl+S 保存）
      const allowedInInput = ['ctrl+s', 'ctrl+shift+s', 'ctrl+o', 'ctrl+n']
      if (!allowedInInput.includes(config.key)) continue
    }
    
    // 执行快捷键动作
    if (config.preventDefault !== false) {
      e.preventDefault()
    }
    if (config.stopPropagation) {
      e.stopPropagation()
    }
    
    config.action()
    return
  }
}

// 初始化全局监听器
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeyDown)
}

/**
 * 使用全局快捷键 Hook
 */
export function useShortcuts(
  shortcuts: ShortcutConfig[],
  deps: React.DependencyList = []
): void {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts
  
  useEffect(() => {
    const unsubscribers: Array<() => void> = []
    
    shortcutsRef.current.forEach(config => {
      const unsub = registerShortcut(config)
      unsubscribers.push(unsub)
    })
    
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, deps)
}

/**
 * 使用单个快捷键
 */
export function useShortcut(
  id: string,
  key: string,
  action: () => void,
  options: {
    enabled?: boolean
    preventDefault?: boolean
    description?: string
    category?: string
  } = {}
): void {
  const { enabled = true, preventDefault = true, description, category } = options
  
  useEffect(() => {
    if (!enabled) return
    
    const unsub = registerShortcut({
      id,
      key,
      action,
      preventDefault,
      description,
      category
    })
    
    return unsub
  }, [id, key, action, enabled, preventDefault, description, category])
}

/**
 * 检查快捷键冲突
 */
export function checkShortcutConflict(key: string, excludeId?: string): ShortcutConfig | null {
  const normalizedKey = normalizeKey(key)
  
  for (const config of globalShortcuts.values()) {
    if (excludeId && config.id === excludeId) continue
    if (normalizeKey(config.key) === normalizedKey) {
      return config
    }
  }
  
  return null
}

/**
 * 获取所有已注册的快捷键
 */
export function getRegisteredShortcuts(): ShortcutConfig[] {
  return Array.from(globalShortcuts.values())
}

/**
 * 快捷键格式化显示
 */
export function formatShortcut(key: string): string {
  return key
    .split('+')
    .map(k => {
      const keyMap: Record<string, string> = {
        'ctrl': 'Ctrl',
        'shift': 'Shift',
        'alt': 'Alt',
        'meta': '⌘',
        'enter': 'Enter',
        'escape': 'Esc',
        'space': 'Space',
        'arrowup': '↑',
        'arrowdown': '↓',
        'arrowleft': '←',
        'arrowright': '→',
        'backspace': '⌫',
        'delete': 'Del',
        'tab': 'Tab'
      }
      return keyMap[k.toLowerCase()] || k.toUpperCase()
    })
    .join(' + ')
}

export default useShortcuts

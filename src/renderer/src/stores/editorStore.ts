/**
 * 编辑器状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  EditorTab,
  EditorSettings,
  EditorFileContent,
  WordCount,
  CursorPosition,
  StatusBarConfig,
  ViewMode,
  ToolbarMode
} from '../types/editor'
import { DEFAULT_EDITOR_SETTINGS as defaultSettings, DEFAULT_STATUS_BAR_CONFIG as defaultStatusBarConfig } from '../types/editor'

interface EditorState {
  // 标签页状态
  tabs: EditorTab[]
  activeTabId: string | null
  /** 预览标签 ID（VSCode 风格：单击预览的标签，会被下一个预览替换） */
  previewTabId: string | null

  // 文件内容缓存
  fileContents: Map<string, EditorFileContent>

  // 编辑器设置
  settings: EditorSettings

  // 字数统计
  wordCount: WordCount

  // 光标位置
  cursorPosition: CursorPosition

  // 状态栏配置
  statusBarConfig: StatusBarConfig

  // 编辑器状态
  isSaving: boolean
  isLoading: boolean
  lastSavedAt: number | null

  // 标签页操作 - 预览模式（单击）
  openPreview: (path: string, name: string, type?: EditorTab['type']) => Promise<void>
  // 兼容旧接口
  openFile: (path: string, name: string, type?: EditorTab['type']) => Promise<void>
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  setActiveTab: (tabId: string) => void
  moveTab: (fromIndex: number, toIndex: number) => void
  markDirty: (tabId: string, isDirty: boolean) => void

  // 文件内容操作
  loadFileContent: (path: string) => Promise<string>
  saveFileContent: (path: string, content: string) => Promise<void>
  updateContent: (content: string) => void
  getCurrentContent: () => string

  // 编辑器状态操作（用于保存/恢复撤销历史）
  saveEditorState: (path: string, state: unknown) => void
  getEditorState: (path: string) => unknown

  // 设置操作
  updateSettings: (settings: Partial<EditorSettings>) => void
  setViewMode: (mode: ViewMode) => void
  setToolbarMode: (mode: ToolbarMode) => void

  // 字数统计
  updateWordCount: (content: string) => void

  // 光标位置
  updateCursorPosition: (position: CursorPosition) => void

  // 状态栏配置
  updateStatusBarConfig: (config: Partial<StatusBarConfig>) => void

  // 跳转到指定行/列（包含文件路径和匹配文本，确保在正确文件上执行）
  goToPositionRequest: { filePath: string; matchText: string } | null
  requestGoToPosition: (filePath: string, matchText: string) => void
  clearGoToPositionRequest: () => void

  // 外部刷新请求（如搜索替换后）
  externalRefreshRequest: string | null
  requestExternalRefresh: (filePath: string) => void
  clearExternalRefreshRequest: () => void

  // 工具方法
  getActiveTab: () => EditorTab | null
  hasUnsavedChanges: () => boolean
  getTabByPath: (path: string) => EditorTab | null
  isPreviewTab: (tabId: string) => boolean
}

/**
 * 标点符号正则（Unicode 标点类别）
 */
const PUNCT_REGEX = /\p{P}/u

/**
 * 判断是否是 ASCII 单词字符
 */
function isAsciiWordChar(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) || // 0-9
    (code >= 0x41 && code <= 0x5A) || // A-Z
    (code >= 0x61 && code <= 0x7A) || // a-z
    code === 0x5F
  ) // _
}

/**
 * 判断是否是 CJK 字符（中日韩文字）
 * 覆盖常见统一表意文字区段
 */
function isHan(code: number): boolean {
  return (
    (code >= 0x3400 && code <= 0x9FFF) || // CJK Unified Ideographs Ext A + Basic
    (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility Ideographs
    (code >= 0x20000 && code <= 0x2FFFF)
  ) // CJK Ext B..G（代理对）
}

/**
 * 计算字数统计（参考 Andrea-novel-helper 的算法）
 * 
 * 统计规则：
 * - 中文字符（CJK）按字计算
 * - 英文按单词计算（连续的字母数字下划线为一个单词）
 * - 总字数 = CJK 字符数 + 英文单词数
 */
function calculateWordCount(content: string): WordCount {
  // 空白内容返回零值
  if (!content || !content.trim()) {
    return {
      cjkChars: 0,
      asciiChars: 0,
      words: 0,
      nonWSChars: 0,
      nonWSNoPunct: 0,
      total: 0,
      lines: 0,
      paragraphs: 0
    }
  }

  let cjkChars = 0
  let asciiChars = 0
  let words = 0
  let nonWSChars = 0
  let nonWSNoPunct = 0

  let inAsciiWord = false

  for (let i = 0; i < content.length; i++) {
    let code = content.charCodeAt(i)

    // 处理代理对（用于处理 CJK 扩展字符）
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < content.length) {
      const next = content.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000
        i++
      }
    }

    // 获取当前字符
    const ch = String.fromCodePoint(code)

    // 非空白字符统计
    if (!/\s/.test(ch)) {
      nonWSChars++
      // 非空白非标点字符统计
      if (!PUNCT_REGEX.test(ch)) {
        nonWSNoPunct++
      }
    }

    // ASCII 字符统计
    if (code <= 0x7f) {
      asciiChars++
    }

    // CJK 字符统计
    if (isHan(code)) {
      cjkChars++
      // CJK 字符会打断 ASCII 单词
      if (inAsciiWord) {
        inAsciiWord = false
      }
      continue
    }

    // ASCII 单词识别（有限状态机）
    if (isAsciiWordChar(code)) {
      if (!inAsciiWord) {
        words++
        inAsciiWord = true
      }
    } else {
      if (inAsciiWord) {
        inAsciiWord = false
      }
    }
  }

  // 行数
  const lines = content.split('\n').length

  // 段落数（非空行）
  const paragraphs = content.split('\n').filter(line => line.trim().length > 0).length

  // 总字数 = CJK 字符数 + 英文单词数
  const total = cjkChars + words

  return {
    cjkChars,
    asciiChars,
    words,
    nonWSChars,
    nonWSNoPunct,
    total,
    lines,
    paragraphs
  }
}

/**
 * 获取文件类型
 */
function getFileType(name: string): EditorTab['type'] {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'md':
    case 'markdown':
      return 'markdown'
    case 'txt':
      return 'text'
    default:
      return 'other'
  }
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // 初始状态
      tabs: [],
      activeTabId: null,
      previewTabId: null,
      fileContents: new Map(),
      settings: defaultSettings,
      wordCount: {
        cjkChars: 0,
        asciiChars: 0,
        words: 0,
        nonWSChars: 0,
        nonWSNoPunct: 0,
        total: 0,
        lines: 0,
        paragraphs: 0
      },
      cursorPosition: {
        line: 1,
        column: 1
      },
      statusBarConfig: defaultStatusBarConfig,
      isSaving: false,
      isLoading: false,
      lastSavedAt: null,
      goToPositionRequest: null,
      externalRefreshRequest: null,

      // 预览模式打开文件（单击）- VSCode 风格
      openPreview: async (path: string, name: string, type: EditorTab['type'] = getFileType(name)) => {
        const state = get()
        
        // 检查是否已经打开
        const existingTab = state.tabs.find(tab => tab.path === path)
        if (existingTab) {
          // 已打开，切换到该标签
          set({ activeTabId: existingTab.id })
          // 更新最后激活时间
          set({
            tabs: state.tabs.map(tab =>
              tab.id === existingTab.id
                ? { ...tab, lastActiveAt: Date.now() }
                : tab
            )
          })
          // 设为预览标签
          set({ previewTabId: existingTab.id })
          return
        }

        // 关闭之前的预览标签（如果存在且未修改）
        if (state.previewTabId) {
          const previewTab = state.tabs.find(t => t.id === state.previewTabId)
          // 只有未修改的预览标签才会被替换
          if (previewTab && !previewTab.isDirty) {
            set(state => ({
              tabs: state.tabs.filter(t => t.id !== state.previewTabId)
            }))
          }
        }

        // 创建新标签
        const newTab: EditorTab = {
          id: uuidv4(),
          path,
          name,
          type,
          isDirty: false,
          lastActiveAt: Date.now()
        }

        // 加载文件内容
        await get().loadFileContent(path)

        // 添加标签并设为预览
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          previewTabId: newTab.id
        }))
      },

      // 打开文件（直接打开，不区分预览/固定）
      openFile: async (path: string, name: string, type: EditorTab['type'] = getFileType(name)) => {
        const state = get()
        
        // 检查是否已经打开
        const existingTab = state.tabs.find(tab => tab.path === path)
        if (existingTab) {
          // 已打开，切换到该标签
          set({ activeTabId: existingTab.id })
          // 更新最后激活时间
          set({
            tabs: state.tabs.map(tab =>
              tab.id === existingTab.id
                ? { ...tab, lastActiveAt: Date.now() }
                : tab
            )
          })
          return
        }

        // 创建新标签
        const newTab: EditorTab = {
          id: uuidv4(),
          path,
          name,
          type,
          isDirty: false,
          lastActiveAt: Date.now()
        }

        // 加载文件内容
        await get().loadFileContent(path)

        // 添加标签
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          previewTabId: null
        }))
      },

      // 关闭标签
      closeTab: (tabId: string) => {
        const state = get()
        const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)
        
        if (tabIndex === -1) return

        const newTabs = state.tabs.filter(tab => tab.id !== tabId)
        
        // 如果关闭的是当前活动标签，切换到其他标签
        let newActiveTabId = state.activeTabId
        if (state.activeTabId === tabId) {
          if (newTabs.length > 0) {
            // 优先切换到右边的标签，否则切换到左边
            const rightTab = newTabs[tabIndex]
            const leftTab = newTabs[tabIndex - 1]
            newActiveTabId = rightTab?.id || leftTab?.id || null
          } else {
            newActiveTabId = null
          }
        }

        // 如果关闭的是预览标签，清除预览状态
        const newPreviewTabId = state.previewTabId === tabId ? null : state.previewTabId

        set({ tabs: newTabs, activeTabId: newActiveTabId, previewTabId: newPreviewTabId })
      },

      // 关闭其他标签
      closeOtherTabs: (tabId: string) => {
        const state = get()
        const activeTab = state.tabs.find(tab => tab.id === tabId)
        
        if (!activeTab) return

        set({
          tabs: [activeTab],
          activeTabId: tabId,
          previewTabId: state.previewTabId === tabId ? tabId : null
        })
      },

      // 关闭所有标签
      closeAllTabs: () => {
        set({ tabs: [], activeTabId: null, previewTabId: null })
      },

      // 设置活动标签
      setActiveTab: (tabId: string) => {
        const state = get()
        const tab = state.tabs.find(t => t.id === tabId)
        
        if (!tab) return

        set({
          activeTabId: tabId,
          tabs: state.tabs.map(t =>
            t.id === tabId ? { ...t, lastActiveAt: Date.now() } : t
          )
        })
      },

      // 移动标签
      moveTab: (fromIndex: number, toIndex: number) => {
        set(state => {
          const newTabs = [...state.tabs]
          const [movedTab] = newTabs.splice(fromIndex, 1)
          newTabs.splice(toIndex, 0, movedTab)
          return { tabs: newTabs }
        })
      },

      // 标记为已修改
      markDirty: (tabId: string, isDirty: boolean) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, isDirty } : tab
          )
        }))
      },

      // 加载文件内容
      loadFileContent: async (path: string) => {
        set({ isLoading: true })
        try {
          const content = await window.electron.file.read(path)
          const fileContent: EditorFileContent = {
            path,
            content,
            loadedAt: Date.now()
          }
          
          set(state => {
            const newContents = new Map(state.fileContents)
            newContents.set(path, fileContent)
            return { fileContents: newContents }
          })

          // 更新字数统计
          get().updateWordCount(content)
          
          return content
        } catch (error) {
          console.error('Failed to load file:', error)
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // 保存文件内容
      saveFileContent: async (path: string, content: string) => {
        set({ isSaving: true })
        try {
          await window.electron.file.write(path, content)
          
          // 更新缓存
          set(state => {
            const newContents = new Map(state.fileContents)
            newContents.set(path, {
              path,
              content,
              loadedAt: Date.now()
            })
            return { 
              fileContents: newContents,
              lastSavedAt: Date.now()
            }
          })

          // 清除 dirty 标记
          const tab = get().getTabByPath(path)
          if (tab) {
            get().markDirty(tab.id, false)
          }
        } catch (error) {
          console.error('Failed to save file:', error)
          throw error
        } finally {
          set({ isSaving: false })
        }
      },

      // 更新内容
      updateContent: (content: string) => {
        const state = get()
        const activeTab = state.getActiveTab()
        
        if (!activeTab) return

        // 更新缓存
        set(state => {
          const newContents = new Map(state.fileContents)
          newContents.set(activeTab.path, {
            path: activeTab.path,
            content,
            loadedAt: Date.now()
          })
          return { fileContents: newContents }
        })

        // 标记为已修改
        get().markDirty(activeTab.id, true)
        // 注意：字数统计在 MarkdownEditor 中单独调用，使用纯文本而非 HTML
      },

      // 保存编辑器状态（包括撤销历史）
      saveEditorState: (path: string, editorState: unknown) => {
        set(state => {
          const newContents = new Map(state.fileContents)
          const existing = newContents.get(path)
          if (existing) {
            newContents.set(path, {
              ...existing,
              editorState
            })
          }
          return { fileContents: newContents }
        })
      },

      // 获取编辑器状态
      getEditorState: (path: string) => {
        const state = get()
        const fileContent = state.fileContents.get(path)
        return fileContent?.editorState
      },

      // 获取当前内容
      getCurrentContent: () => {
        const state = get()
        const activeTab = state.getActiveTab()
        
        if (!activeTab) return ''

        const fileContent = state.fileContents.get(activeTab.path)
        return fileContent?.content || ''
      },

      // 更新设置
      updateSettings: (newSettings: Partial<EditorSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings }
        }))
      },

      // 设置视图模式
      setViewMode: (mode: ViewMode) => {
        get().updateSettings({ viewMode: mode })
      },

      // 设置工具栏模式
      setToolbarMode: (mode: ToolbarMode) => {
        get().updateSettings({ toolbarMode: mode })
      },

      // 更新字数统计
      updateWordCount: (content: string) => {
        const wordCount = calculateWordCount(content)
        set({ wordCount })
      },

      // 更新光标位置
      updateCursorPosition: (position: CursorPosition) => {
        set({ cursorPosition: position })
      },

      // 更新状态栏配置
      updateStatusBarConfig: (config: Partial<StatusBarConfig>) => {
        set(state => ({
          statusBarConfig: { ...state.statusBarConfig, ...config }
        }))
      },

      // 获取活动标签
      getActiveTab: () => {
        const state = get()
        return state.tabs.find(tab => tab.id === state.activeTabId) || null
      },

      // 检查是否有未保存的更改
      hasUnsavedChanges: () => {
        const state = get()
        return state.tabs.some(tab => tab.isDirty)
      },

      // 根据路径获取标签
      getTabByPath: (path: string) => {
        const state = get()
        return state.tabs.find(tab => tab.path === path) || null
      },

      // 判断是否是预览标签
      isPreviewTab: (tabId: string) => {
        const state = get()
        return state.previewTabId === tabId
      },

      // 请求跳转到指定匹配文本（包含文件路径）
      requestGoToPosition: (filePath: string, matchText: string) => {
        set({ goToPositionRequest: { filePath, matchText } })
      },

      // 清除跳转请求
      clearGoToPositionRequest: () => {
        set({ goToPositionRequest: null })
      },

      // 请求外部刷新
      requestExternalRefresh: (filePath: string) => {
        set({ externalRefreshRequest: filePath })
      },

      // 清除外部刷新请求
      clearExternalRefreshRequest: () => {
        set({ externalRefreshRequest: null })
      }
    }),
    {
      name: 'editor-storage',
      partialize: (state) => ({
        // 只持久化设置，不持久化标签和内容
        settings: state.settings
      })
    }
  )
)

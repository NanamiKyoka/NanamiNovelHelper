import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { Sequencer, Limiter } from '@shared/async'
import type {
  EditorTab,
  EditorSettings,
  EditorFileContent,
  WordCount,
  CursorPosition,
  StatusBarConfig
} from '../types/editor'
import {
  DEFAULT_EDITOR_SETTINGS as defaultSettings,
  DEFAULT_STATUS_BAR_CONFIG as defaultStatusBarConfig
} from '../types/editor'
import { LRUCache } from '../utils/lruCache'
import { computeHash } from '../utils/hash'

const FILE_CACHE_MAX = 20
const FILE_CACHE_MAX_AGE = 30 * 60 * 1000
const FILE_READ_CONCURRENCY = 3

function isWhitespace(code: number): boolean {
  return (
    code === 0x09 ||
    code === 0x0a ||
    code === 0x0b ||
    code === 0x0c ||
    code === 0x0d ||
    code === 0x20 ||
    code === 0xa0 ||
    code === 0x1680 ||
    (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 ||
    code === 0x2029 ||
    code === 0x202f ||
    code === 0x205f ||
    code === 0x3000
  )
}

function isPunctuation(code: number): boolean {
  if (
    (code >= 0x21 && code <= 0x2f) ||
    (code >= 0x3a && code <= 0x40) ||
    (code >= 0x5b && code <= 0x60) ||
    (code >= 0x7b && code <= 0x7e)
  ) {
    return true
  }
  if (code >= 0x2010 && code <= 0x206f) return true
  if (code >= 0x2e00 && code <= 0x2e7f) return true
  if (code >= 0x3000 && code <= 0x303f) return true
  if (code >= 0xfe30 && code <= 0xfe4f) return true
  if (code >= 0xff01 && code <= 0xff60) return true
  if (code >= 0xfe50 && code <= 0xfe6f) return true
  return false
}

function isAsciiWordChar(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    code === 0x5f
  )
}

function isHan(code: number): boolean {
  return (
    (code >= 0x3400 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x20000 && code <= 0x2ffff)
  )
}

function calculateWordCount(content: string): WordCount {
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
  let lines = 1
  let paragraphs = 0
  let inAsciiWord = false
  let inNonEmptyLine = false

  for (let i = 0; i < content.length; i++) {
    let code = content.charCodeAt(i)

    if (code >= 0xd800 && code <= 0xdbff && i + 1 < content.length) {
      const next = content.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000
        i++
      }
    }

    if (code === 0x0a) {
      lines++
      if (inNonEmptyLine) paragraphs++
      inNonEmptyLine = false
      inAsciiWord = false
      continue
    }

    if (isWhitespace(code)) {
      inAsciiWord = false
      continue
    }

    nonWSChars++
    if (!isPunctuation(code)) {
      nonWSNoPunct++
    }
    inNonEmptyLine = true

    if (code <= 0x7f) {
      asciiChars++
    }

    if (isHan(code)) {
      cjkChars++
      inAsciiWord = false
      continue
    }

    if (isAsciiWordChar(code)) {
      if (!inAsciiWord) {
        words++
        inAsciiWord = true
      }
    } else {
      inAsciiWord = false
    }
  }

  if (inNonEmptyLine) paragraphs++

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

function getFileType(name: string): EditorTab['type'] {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'novel') {
    return 'novel'
  }
  if (ext === 'md' || ext === 'markdown') {
    return 'markdown'
  }
  return 'text'
}

function createFileCache(): LRUCache<string, EditorFileContent> {
  return new LRUCache<string, EditorFileContent>({
    max: FILE_CACHE_MAX,
    maxAge: FILE_CACHE_MAX_AGE
  })
}

interface EditorState {
  tabs: EditorTab[]
  activeTabId: string | null
  previewTabId: string | null
  fileContents: LRUCache<string, EditorFileContent>
  _cacheVersion: number
  settings: EditorSettings
  wordCount: WordCount
  cursorPosition: CursorPosition
  statusBarConfig: StatusBarConfig
  isSaving: boolean
  isLoading: boolean
  lastSavedAt: number | null

  openPreview: (path: string, name: string, type?: EditorTab['type']) => Promise<void>
  openFile: (path: string, name: string, type?: EditorTab['type']) => Promise<void>
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  closeTabsByPaths: (paths: string[]) => void
  updateTabPath: (oldPath: string, newPath: string, newName: string) => void
  setActiveTab: (tabId: string) => Promise<void>
  moveTab: (fromIndex: number, toIndex: number) => void
  markDirty: (tabId: string, isDirty: boolean) => void

  loadFileContent: (path: string) => Promise<string>
  saveFileContent: (path: string, content: string) => Promise<void>
  updateContent: (content: string) => void
  getCurrentContent: () => string

  saveEditorState: (path: string, state: unknown) => void
  getEditorState: (path: string) => unknown

  updateSettings: (settings: Partial<EditorSettings>) => void

  updateWordCount: (content: string) => void
  updateCursorPosition: (position: CursorPosition) => void
  updateStatusBarConfig: (config: Partial<StatusBarConfig>) => void

  goToPositionRequest: { filePath: string; matchText: string; matchIndex: number } | null
  requestGoToPosition: (filePath: string, matchText: string, matchIndex: number) => void
  clearGoToPositionRequest: () => void

  insertContentRequest: string | null
  requestInsertContent: (content: string) => void
  clearInsertContentRequest: () => void

  externalRefreshRequest: string | null
  requestExternalRefresh: (filePath: string) => void
  clearExternalRefreshRequest: () => void
  refreshAllOpenFiles: () => Promise<void>
  refreshFiles: (paths: string[]) => Promise<void>
  lastRefreshTime: number
  triggerEditorRefresh: () => void
  handleExternalFileChanges: (paths: string[]) => void
  handleExternalFileDeletions: (paths: string[]) => void
  handleBulkOperationEnd: () => void

  getActiveTab: () => EditorTab | null
  hasUnsavedChanges: () => boolean
  getTabByPath: (path: string) => EditorTab | null
  isPreviewTab: (tabId: string) => boolean
  openDiff: (path: string, name: string, diffData: import('@shared/git').GitFileDiff) => void
  openNovelDiff: (path: string, name: string, originalHtml: string, modifiedHtml: string) => void

  pendingAiEdits: Map<string, { path: string; modified: string }>
  addPendingAiEdit: (path: string, modified: string) => void
  acceptAiEdit: (path: string) => Promise<void>
  rejectAiEdit: (path: string) => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      const refreshSequencer = new Sequencer()
      const fileReadLimiter = new Limiter(FILE_READ_CONCURRENCY)

      function removeTabsAndCleanup(
        state: EditorState,
        tabsToRemove: EditorTab[]
      ): {
        tabs: EditorTab[]
        activeTabId: string | null
        previewTabId: string | null
        fileContents: LRUCache<string, EditorFileContent>
        _cacheVersion: number
      } {
        const removeIds = new Set(tabsToRemove.map(t => t.id))
        const newTabs = state.tabs.filter(t => !removeIds.has(t.id))

        let newActiveTabId = state.activeTabId
        if (newActiveTabId && removeIds.has(newActiveTabId)) {
          const idx = state.tabs.findIndex(t => t.id === newActiveTabId)
          const rightTab = newTabs[idx]
          const leftTab = newTabs[idx - 1]
          newActiveTabId = rightTab?.id || leftTab?.id || null
        }

        let newPreviewTabId = state.previewTabId
        if (newPreviewTabId && removeIds.has(newPreviewTabId)) {
          newPreviewTabId = null
        }

        for (const tab of tabsToRemove) {
          state.fileContents.delete(tab.path)
        }

        return {
          tabs: newTabs,
          activeTabId: newActiveTabId,
          previewTabId: newPreviewTabId,
          fileContents: state.fileContents,
          _cacheVersion: state._cacheVersion + 1
        }
      }

      return {
        tabs: [],
        activeTabId: null,
        previewTabId: null,
        fileContents: createFileCache(),
        _cacheVersion: 0,
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
        insertContentRequest: null,
        externalRefreshRequest: null,
        lastRefreshTime: 0,
        pendingAiEdits: new Map(),

        openPreview: async (
          path: string,
          name: string,
          type: EditorTab['type'] = getFileType(name)
        ) => {
          const state = get()

          const existingTab = state.tabs.find(tab => tab.path === path)
          if (existingTab) {
            if (!state.fileContents.has(path)) {
              await get().loadFileContent(path)
            }
            set({ activeTabId: existingTab.id })
            set({
              tabs: state.tabs.map(tab =>
                tab.id === existingTab.id ? { ...tab, lastActiveAt: Date.now() } : tab
              )
            })
            set({ previewTabId: existingTab.id })
            return
          }

          if (state.previewTabId) {
            const previewTab = state.tabs.find(t => t.id === state.previewTabId)
            if (previewTab && !previewTab.isDirty) {
              const cachedContent = state.fileContents.get(previewTab.path)
              if (cachedContent?.editorState && cachedContent?.hash) {
                state.fileContents.set(previewTab.path, {
                  path: previewTab.path,
                  content: '',
                  hash: cachedContent.hash,
                  loadedAt: cachedContent.loadedAt,
                  editorState: cachedContent.editorState
                })
              } else {
                state.fileContents.delete(previewTab.path)
              }
              set(state => ({
                tabs: state.tabs.filter(t => t.id !== state.previewTabId)
              }))
            }
          }

          const newTab: EditorTab = {
            id: uuidv4(),
            path,
            name,
            type,
            isDirty: false,
            lastActiveAt: Date.now()
          }

          const cachedContent = state.fileContents.get(path)
          if (cachedContent?.editorState && cachedContent?.hash) {
            const content = await window.api.file.read(path)
            const newHash = await computeHash(content)

            if (newHash === cachedContent.hash) {
              state.fileContents.set(path, {
                path,
                content,
                hash: newHash,
                loadedAt: Date.now(),
                editorState: cachedContent.editorState
              })
            } else {
              state.fileContents.set(path, {
                path,
                content,
                hash: newHash,
                loadedAt: Date.now()
              })
            }
          } else if (!state.fileContents.has(path)) {
            await get().loadFileContent(path)
          }

          set(state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
            previewTabId: newTab.id,
            _cacheVersion: state._cacheVersion + 1
          }))
        },

        openFile: async (
          path: string,
          name: string,
          type: EditorTab['type'] = getFileType(name)
        ) => {
          const state = get()

          const existingTab = state.tabs.find(tab => tab.path === path)
          if (existingTab) {
            if (!state.fileContents.has(path)) {
              await get().loadFileContent(path)
            }
            set({ activeTabId: existingTab.id })
            set({
              tabs: state.tabs.map(tab =>
                tab.id === existingTab.id ? { ...tab, lastActiveAt: Date.now() } : tab
              )
            })
            return
          }

          const newTab: EditorTab = {
            id: uuidv4(),
            path,
            name,
            type,
            isDirty: false,
            lastActiveAt: Date.now()
          }

          const cachedContent = state.fileContents.get(path)
          if (cachedContent?.editorState && cachedContent?.hash) {
            const content = await window.api.file.read(path)
            const newHash = await computeHash(content)

            if (newHash === cachedContent.hash) {
              state.fileContents.set(path, {
                path,
                content,
                hash: newHash,
                loadedAt: Date.now(),
                editorState: cachedContent.editorState
              })
            } else {
              state.fileContents.set(path, {
                path,
                content,
                hash: newHash,
                loadedAt: Date.now()
              })
            }
          } else if (!state.fileContents.has(path)) {
            await get().loadFileContent(path)
          }

          set(state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
            previewTabId: null,
            _cacheVersion: state._cacheVersion + 1
          }))
        },

        closeTab: (tabId: string) => {
          const state = get()
          const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)

          if (tabIndex === -1) return

          const closedTab = state.tabs.find(tab => tab.id === tabId)
          const newTabs = state.tabs.filter(tab => tab.id !== tabId)

          let newActiveTabId = state.activeTabId
          if (state.activeTabId === tabId) {
            if (newTabs.length > 0) {
              const rightTab = newTabs[tabIndex]
              const leftTab = newTabs[tabIndex - 1]
              newActiveTabId = rightTab?.id || leftTab?.id || null
            } else {
              newActiveTabId = null
            }
          }

          const newPreviewTabId = state.previewTabId === tabId ? null : state.previewTabId

          if (closedTab) {
            const cachedContent = state.fileContents.get(closedTab.path)
            if (cachedContent?.editorState && cachedContent?.hash) {
              state.fileContents.set(closedTab.path, {
                path: closedTab.path,
                content: '',
                hash: cachedContent.hash,
                loadedAt: cachedContent.loadedAt,
                editorState: cachedContent.editorState
              })
            } else {
              state.fileContents.delete(closedTab.path)
            }
          }

          set({
            tabs: newTabs,
            activeTabId: newActiveTabId,
            previewTabId: newPreviewTabId,
            _cacheVersion: state._cacheVersion + 1
          })
        },

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

        closeAllTabs: () => {
          set({ tabs: [], activeTabId: null, previewTabId: null })
        },

        closeTabsByPaths: (paths: string[]) => {
          const state = get()
          const deletedPaths = new Set(paths)

          const tabsToRemove = state.tabs.filter(t => deletedPaths.has(t.path))

          if (tabsToRemove.length === 0) return

          set(removeTabsAndCleanup(state, tabsToRemove))
        },

        updateTabPath: (oldPath: string, newPath: string, newName: string) => {
          const state = get()
          const tab = state.tabs.find(t => t.path === oldPath)
          if (!tab) return

          const existingContent = state.fileContents.get(oldPath)
          if (existingContent) {
            state.fileContents.delete(oldPath)
            state.fileContents.set(newPath, { ...existingContent, path: newPath })
          }

          set({
            tabs: state.tabs.map(t =>
              t.id === tab.id ? { ...t, path: newPath, name: newName } : t
            ),
            fileContents: state.fileContents,
            _cacheVersion: state._cacheVersion + 1
          })
        },

        setActiveTab: async (tabId: string) => {
          const state = get()
          const tab = state.tabs.find(t => t.id === tabId)

          if (!tab) return

          if (!state.fileContents.has(tab.path)) {
            await get().loadFileContent(tab.path)
          }

          set({
            activeTabId: tabId,
            tabs: state.tabs.map(t => (t.id === tabId ? { ...t, lastActiveAt: Date.now() } : t))
          })
        },

        moveTab: (fromIndex: number, toIndex: number) => {
          set(state => {
            const newTabs = [...state.tabs]
            const [movedTab] = newTabs.splice(fromIndex, 1)
            newTabs.splice(toIndex, 0, movedTab)
            return { tabs: newTabs }
          })
        },

        markDirty: (tabId: string, isDirty: boolean) => {
          set(state => {
            const tab = state.tabs.find(t => t.id === tabId)
            if (!tab || tab.isDirty === isDirty) return state
            return {
              tabs: state.tabs.map(t => (t.id === tabId ? { ...t, isDirty } : t))
            }
          })
        },

        loadFileContent: async (path: string) => {
          set({ isLoading: true })
          try {
            const content = await fileReadLimiter.queue(() => window.api.file.read(path))
            const hash = await computeHash(content)
            const fileContent: EditorFileContent = {
              path,
              content,
              hash,
              loadedAt: Date.now()
            }

            set(state => {
              state.fileContents.set(path, fileContent)
              return { fileContents: state.fileContents, _cacheVersion: state._cacheVersion + 1 }
            })

            return content
          } catch (error) {
            console.error('Failed to load file:', error)
            throw error
          } finally {
            set({ isLoading: false })
          }
        },

        saveFileContent: async (path: string, content: string) => {
          set({ isSaving: true })
          try {
            await window.api.file.write(path, content)
            const hash = await computeHash(content)

            set(state => {
              const existing = state.fileContents.get(path)
              state.fileContents.set(path, {
                path,
                content,
                hash,
                loadedAt: Date.now(),
                editorState: existing?.editorState
              })
              return {
                fileContents: state.fileContents,
                _cacheVersion: state._cacheVersion + 1,
                lastSavedAt: Date.now()
              }
            })

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

        updateContent: (content: string, path?: string) => {
          const state = get()
          const targetPath = path || state.getActiveTab()?.path
          if (!targetPath) return

          const tab = state.getTabByPath(targetPath)
          if (!tab) return

          set(state => {
            state.fileContents.set(targetPath, {
              path: targetPath,
              content,
              loadedAt: Date.now()
            })
            return { fileContents: state.fileContents, _cacheVersion: state._cacheVersion + 1 }
          })

          get().markDirty(tab.id, true)
        },

        saveEditorState: (path: string, editorState: unknown) => {
          set(state => {
            const existing = state.fileContents.get(path)
            if (existing) {
              state.fileContents.set(path, {
                ...existing,
                editorState
              })
            }
            return { fileContents: state.fileContents, _cacheVersion: state._cacheVersion + 1 }
          })
        },

        getEditorState: (path: string) => {
          const state = get()
          const fileContent = state.fileContents.get(path)
          return fileContent?.editorState
        },

        getCurrentContent: () => {
          const state = get()
          const activeTab = state.getActiveTab()

          if (!activeTab) return ''

          const fileContent = state.fileContents.get(activeTab.path)
          return fileContent?.content || ''
        },

        updateSettings: (newSettings: Partial<EditorSettings>) => {
          set(state => ({
            settings: { ...state.settings, ...newSettings }
          }))
        },

        updateWordCount: (content: string) => {
          const wordCount = calculateWordCount(content)
          set({ wordCount })
        },

        updateCursorPosition: (position: CursorPosition) => {
          set({ cursorPosition: position })
        },

        updateStatusBarConfig: (config: Partial<StatusBarConfig>) => {
          set(state => ({
            statusBarConfig: { ...state.statusBarConfig, ...config }
          }))
        },

        getActiveTab: () => {
          const state = get()
          return state.tabs.find(tab => tab.id === state.activeTabId) || null
        },

        hasUnsavedChanges: () => {
          const state = get()
          return state.tabs.some(tab => tab.isDirty)
        },

        getTabByPath: (path: string) => {
          const state = get()
          return state.tabs.find(tab => tab.path === path) || null
        },

        isPreviewTab: (tabId: string) => {
          const state = get()
          return state.previewTabId === tabId
        },

        openDiff: (path: string, name: string, diffData) => {
          const state = get()
          const diffTabId = `diff:${path}`
          const existingTab = state.tabs.find(tab => tab.id === diffTabId)
          if (existingTab) {
            set({ activeTabId: existingTab.id })
            return
          }

          const newTab: EditorTab = {
            id: diffTabId,
            path,
            name: `${name} (Diff)`,
            type: 'diff',
            isDirty: false,
            lastActiveAt: Date.now(),
            diffData
          }

          set(state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id
          }))
        },

        openNovelDiff: (path: string, name: string, originalHtml: string, modifiedHtml: string) => {
          const state = get()
          const diffTabId = `diff:${path}`
          const existingTab = state.tabs.find(tab => tab.id === diffTabId)
          if (existingTab) {
            set({ activeTabId: existingTab.id })
            return
          }

          const newTab: EditorTab = {
            id: diffTabId,
            path,
            name: `${name} (Diff)`,
            type: 'diff',
            isDirty: false,
            lastActiveAt: Date.now(),
            novelDiffData: { originalHtml, modifiedHtml }
          }

          set(state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id
          }))
        },

        addPendingAiEdit: (path: string, modified: string) => {
          set(state => {
            const next = new Map(state.pendingAiEdits)
            next.set(path, { path, modified })
            return { pendingAiEdits: next }
          })
        },

        acceptAiEdit: async (path: string) => {
          const state = get()
          const edit = state.pendingAiEdits.get(path)
          if (!edit) return

          try {
            await get().saveFileContent(path, edit.modified)
            // 更新文件内容缓存
            get().loadFileContent(path)
            // 关闭 diff 标签页
            const diffTabId = `diff:${path}`
            get().closeTab(diffTabId)
            // 如果原文件已打开，刷新其内容
            const fileTab = state.tabs.find(t => t.path === path && t.type !== 'diff')
            if (fileTab) {
              set({ activeTabId: fileTab.id })
            }
          } catch (e) {
            console.error('接受 AI 编辑失败:', e)
            throw e
          }

          set(state => {
            const next = new Map(state.pendingAiEdits)
            next.delete(path)
            return { pendingAiEdits: next }
          })
        },

        rejectAiEdit: (path: string) => {
          const diffTabId = `diff:${path}`
          get().closeTab(diffTabId)

          set(state => {
            const next = new Map(state.pendingAiEdits)
            next.delete(path)
            return { pendingAiEdits: next }
          })
        },

        requestGoToPosition: (filePath: string, matchText: string, matchIndex: number) => {
          set({ goToPositionRequest: { filePath, matchText, matchIndex } })
        },

        clearGoToPositionRequest: () => {
          set({ goToPositionRequest: null })
        },

        requestInsertContent: (content: string) => {
          set({ insertContentRequest: content })
        },

        clearInsertContentRequest: () => {
          set({ insertContentRequest: null })
        },

        requestExternalRefresh: (filePath: string) => {
          set({ externalRefreshRequest: filePath })
        },

        clearExternalRefreshRequest: () => {
          set({ externalRefreshRequest: null })
        },

        refreshAllOpenFiles: async () => {
          await refreshSequencer.queue(async () => {
            const state = get()
            const tabs = state.tabs
            if (tabs.length === 0) return

            const dirtyPaths = new Set(tabs.filter(t => t.isDirty).map(t => t.path))

            const tabsToRefresh = tabs.filter(t => !dirtyPaths.has(t.path))
            if (tabsToRefresh.length === 0) return

            const results = await Promise.allSettled(
              tabsToRefresh.map(tab =>
                fileReadLimiter.queue(async () => {
                  const content = await window.api.file.read(tab.path)
                  return { path: tab.path, content }
                })
              )
            )

            const tabsToRemove: EditorTab[] = []
            let hasUpdates = false

            for (let i = 0; i < results.length; i++) {
              const result = results[i]
              const tab = tabsToRefresh[i]

              if (result.status === 'fulfilled') {
                const existing = state.fileContents.get(result.value.path)
                if (!existing || existing.content !== result.value.content) {
                  state.fileContents.set(result.value.path, {
                    path: result.value.path,
                    content: result.value.content,
                    loadedAt: Date.now()
                  })
                  hasUpdates = true
                }
              } else {
                tabsToRemove.push(tab)
              }
            }

            if (tabsToRemove.length > 0) {
              set(removeTabsAndCleanup(state, tabsToRemove))
            } else if (hasUpdates) {
              set({ fileContents: state.fileContents, _cacheVersion: state._cacheVersion + 1 })
            }

            if (hasUpdates || tabsToRemove.length > 0) {
              get().triggerEditorRefresh()
            }
          })
        },

        refreshFiles: async (paths: string[]) => {
          if (paths.length === 0) return

          await refreshSequencer.queue(async () => {
            const state = get()
            const dirtyPaths = new Set(state.tabs.filter(t => t.isDirty).map(t => t.path))

            const pathsToRefresh = paths.filter(p => !dirtyPaths.has(p))
            if (pathsToRefresh.length === 0) return

            const results = await Promise.allSettled(
              pathsToRefresh.map(filePath =>
                fileReadLimiter.queue(async () => {
                  const content = await window.api.file.read(filePath)
                  return { path: filePath, content }
                })
              )
            )

            const tabsToRemove: EditorTab[] = []
            let hasUpdates = false

            for (let i = 0; i < results.length; i++) {
              const result = results[i]
              const filePath = pathsToRefresh[i]

              if (result.status === 'fulfilled') {
                const existing = state.fileContents.get(result.value.path)
                if (!existing || existing.content !== result.value.content) {
                  state.fileContents.set(result.value.path, {
                    path: result.value.path,
                    content: result.value.content,
                    loadedAt: Date.now()
                  })
                  hasUpdates = true
                }
              } else {
                const tab = state.tabs.find(t => t.path === filePath && !t.isDirty)
                if (tab) {
                  tabsToRemove.push(tab)
                }
              }
            }

            if (tabsToRemove.length > 0) {
              set(removeTabsAndCleanup(state, tabsToRemove))
            } else if (hasUpdates) {
              set({ fileContents: state.fileContents, _cacheVersion: state._cacheVersion + 1 })
            }

            if (hasUpdates || tabsToRemove.length > 0) {
              get().triggerEditorRefresh()
            }
          })
        },

        triggerEditorRefresh: () => {
          set({ lastRefreshTime: Date.now() })
        },

        handleExternalFileChanges: (paths: string[]) => {
          const state = get()
          const openPaths = new Set(state.tabs.map(t => t.path))
          const dirtyPaths = new Set(state.tabs.filter(t => t.isDirty).map(t => t.path))

          const pathsToRefresh = paths.filter(p => openPaths.has(p) && !dirtyPaths.has(p))

          if (pathsToRefresh.length > 0) {
            get().refreshFiles(pathsToRefresh)
          }
        },

        handleExternalFileDeletions: (paths: string[]) => {
          const state = get()
          const deletedPaths = new Set(paths)

          const tabsToRemove = state.tabs.filter(t => deletedPaths.has(t.path) && !t.isDirty)

          if (tabsToRemove.length > 0) {
            set(removeTabsAndCleanup(state, tabsToRemove))
          }
        },

        handleBulkOperationEnd: () => {
          const state = get()
          if (state.tabs.length === 0) return

          const checkPromises = state.tabs.map(async tab => {
            const exists = await window.api.file.exists(tab.path)
            return { tab, exists }
          })

          Promise.allSettled(checkPromises).then(results => {
            const tabsToRemove: EditorTab[] = []
            const pathsToRefresh: string[] = []

            for (const result of results) {
              if (result.status === 'fulfilled') {
                if (!result.value.exists) {
                  if (!result.value.tab.isDirty) {
                    tabsToRemove.push(result.value.tab)
                  }
                } else {
                  pathsToRefresh.push(result.value.tab.path)
                }
              }
            }

            let newTabs = state.tabs
            let newActiveTabId = state.activeTabId
            let newPreviewTabId = state.previewTabId

            if (tabsToRemove.length > 0) {
              const partial = removeTabsAndCleanup(state, tabsToRemove)
              newTabs = partial.tabs
              newActiveTabId = partial.activeTabId
              newPreviewTabId = partial.previewTabId
            }

            set({
              tabs: newTabs,
              activeTabId: newActiveTabId,
              previewTabId: newPreviewTabId,
              fileContents: state.fileContents,
              _cacheVersion: state._cacheVersion + 1
            })

            if (pathsToRefresh.length > 0) {
              get().refreshFiles(pathsToRefresh)
            }
          })
        }
      }
    },
    {
      name: 'editor-storage',
      partialize: state => ({
        settings: state.settings
      })
    }
  )
)

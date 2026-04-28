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
  StatusBarConfig,
  ViewMode,
  ToolbarMode
} from '../types/editor'
import {
  DEFAULT_EDITOR_SETTINGS as defaultSettings,
  DEFAULT_STATUS_BAR_CONFIG as defaultStatusBarConfig
} from '../types/editor'
import { LRUCache } from '../utils/lruCache'

const FILE_CACHE_MAX = 20
const FILE_CACHE_MAX_AGE = 30 * 60 * 1000
const FILE_READ_CONCURRENCY = 3

const PUNCT_REGEX = /\p{P}/u

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

  let inAsciiWord = false

  for (let i = 0; i < content.length; i++) {
    let code = content.charCodeAt(i)

    if (code >= 0xd800 && code <= 0xdbff && i + 1 < content.length) {
      const next = content.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = ((code - 0xd800) << 10) + (next - 0xdc00) + 0x10000
        i++
      }
    }

    const ch = String.fromCodePoint(code)

    if (!/\s/.test(ch)) {
      nonWSChars++
      if (!PUNCT_REGEX.test(ch)) {
        nonWSNoPunct++
      }
    }

    if (code <= 0x7f) {
      asciiChars++
    }

    if (isHan(code)) {
      cjkChars++
      if (inAsciiWord) {
        inAsciiWord = false
      }
      continue
    }

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

  const lines = content.split('\n').length
  const paragraphs = content.split('\n').filter(line => line.trim().length > 0).length
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
  switch (ext) {
    case 'novel':
      return 'novel'
    case 'txt':
      return 'text'
    case 'md':
    case 'markdown':
      return 'markdown'
    default:
      return 'other'
  }
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
  setActiveTab: (tabId: string) => void
  moveTab: (fromIndex: number, toIndex: number) => void
  markDirty: (tabId: string, isDirty: boolean) => void

  loadFileContent: (path: string) => Promise<string>
  saveFileContent: (path: string, content: string) => Promise<void>
  updateContent: (content: string) => void
  getCurrentContent: () => string

  saveEditorState: (path: string, state: unknown) => void
  getEditorState: (path: string) => unknown

  updateSettings: (settings: Partial<EditorSettings>) => void
  setViewMode: (mode: ViewMode) => void
  setToolbarMode: (mode: ToolbarMode) => void

  updateWordCount: (content: string) => void
  updateCursorPosition: (position: CursorPosition) => void
  updateStatusBarConfig: (config: Partial<StatusBarConfig>) => void

  goToPositionRequest: { filePath: string; matchText: string; matchIndex: number } | null
  requestGoToPosition: (filePath: string, matchText: string, matchIndex: number) => void
  clearGoToPositionRequest: () => void

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
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => {
      const refreshSequencer = new Sequencer()
      const fileReadLimiter = new Limiter(FILE_READ_CONCURRENCY)

      return {
        tabs: [],
        activeTabId: null,
        previewTabId: null,
        fileContents: createFileCache(),
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
        lastRefreshTime: 0,

        openPreview: async (
          path: string,
          name: string,
          type: EditorTab['type'] = getFileType(name)
        ) => {
          const state = get()

          const existingTab = state.tabs.find(tab => tab.path === path)
          if (existingTab) {
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

          await get().loadFileContent(path)

          set(state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
            previewTabId: newTab.id
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

          await get().loadFileContent(path)

          set(state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id,
            previewTabId: null
          }))
        },

        closeTab: (tabId: string) => {
          const state = get()
          const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)

          if (tabIndex === -1) return

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

          set({ tabs: newTabs, activeTabId: newActiveTabId, previewTabId: newPreviewTabId })
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

        setActiveTab: (tabId: string) => {
          const state = get()
          const tab = state.tabs.find(t => t.id === tabId)

          if (!tab) return

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
          set(state => ({
            tabs: state.tabs.map(tab => (tab.id === tabId ? { ...tab, isDirty } : tab))
          }))
        },

        loadFileContent: async (path: string) => {
          set({ isLoading: true })
          try {
            const content = await fileReadLimiter.queue(() => window.electron.file.read(path))
            const fileContent: EditorFileContent = {
              path,
              content,
              loadedAt: Date.now()
            }

            set(state => {
              state.fileContents.set(path, fileContent)
              return { fileContents: state.fileContents }
            })

            get().updateWordCount(content)

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
            await window.electron.file.write(path, content)

            set(state => {
              state.fileContents.set(path, {
                path,
                content,
                loadedAt: Date.now()
              })
              return {
                fileContents: state.fileContents,
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

        updateContent: (content: string) => {
          const state = get()
          const activeTab = state.getActiveTab()

          if (!activeTab) return

          set(state => {
            state.fileContents.set(activeTab.path, {
              path: activeTab.path,
              content,
              loadedAt: Date.now()
            })
            return { fileContents: state.fileContents }
          })

          get().markDirty(activeTab.id, true)
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
            return { fileContents: state.fileContents }
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

        setViewMode: (mode: ViewMode) => {
          get().updateSettings({ viewMode: mode })
        },

        setToolbarMode: (mode: ToolbarMode) => {
          get().updateSettings({ toolbarMode: mode })
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

        requestGoToPosition: (filePath: string, matchText: string, matchIndex: number) => {
          set({ goToPositionRequest: { filePath, matchText, matchIndex } })
        },

        clearGoToPositionRequest: () => {
          set({ goToPositionRequest: null })
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
                  const content = await window.electron.file.read(tab.path)
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

              set({
                tabs: newTabs,
                activeTabId: newActiveTabId,
                previewTabId: newPreviewTabId,
                fileContents: state.fileContents
              })
            } else if (hasUpdates) {
              set({ fileContents: state.fileContents })
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
                  const content = await window.electron.file.read(filePath)
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

              set({
                tabs: newTabs,
                activeTabId: newActiveTabId,
                previewTabId: newPreviewTabId,
                fileContents: state.fileContents
              })
            } else if (hasUpdates) {
              set({ fileContents: state.fileContents })
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

            set({
              tabs: newTabs,
              activeTabId: newActiveTabId,
              previewTabId: newPreviewTabId,
              fileContents: state.fileContents
            })
          }
        },

        handleBulkOperationEnd: () => {
          const state = get()
          if (state.tabs.length === 0) return

          const checkPromises = state.tabs.map(async tab => {
            const exists = await window.electron.file.exists(tab.path)
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
              const removeIds = new Set(tabsToRemove.map(t => t.id))
              newTabs = state.tabs.filter(t => !removeIds.has(t.id))

              if (newActiveTabId && removeIds.has(newActiveTabId)) {
                const idx = state.tabs.findIndex(t => t.id === newActiveTabId)
                const rightTab = newTabs[idx]
                const leftTab = newTabs[idx - 1]
                newActiveTabId = rightTab?.id || leftTab?.id || null
              }

              if (newPreviewTabId && removeIds.has(newPreviewTabId)) {
                newPreviewTabId = null
              }

              for (const tab of tabsToRemove) {
                state.fileContents.delete(tab.path)
              }
            }

            set({
              tabs: newTabs,
              activeTabId: newActiveTabId,
              previewTabId: newPreviewTabId,
              fileContents: state.fileContents
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

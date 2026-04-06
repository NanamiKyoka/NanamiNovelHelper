import { create } from 'zustand'
import type { 
  VocabularyType, 
  VocabularyEntry, 
  VocabularySettings 
} from '../types/vocabulary'

interface VocabularyState {
  // 状态
  types: VocabularyType[]
  entries: VocabularyEntry[]
  settings: VocabularySettings
  isLoading: boolean
  isLoaded: boolean  // types 已加载
  entriesLoaded: boolean  // entries 已加载
  error: string | null  // 错误信息
  
  // 类型操作
  loadTypes: () => Promise<void>
  saveTypes: (types: VocabularyType[]) => Promise<void>
  addType: (type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<VocabularyType>
  updateType: (id: string, updates: Partial<VocabularyType>) => Promise<void>
  deleteType: (id: string) => Promise<void>
  reorderTypes: (typeIds: string[]) => Promise<void>
  
  // 条目操作
  loadEntries: (typeId?: string) => Promise<void>
  saveEntries: (typeId: string, entries: VocabularyEntry[]) => Promise<void>
  addEntry: (entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<VocabularyEntry>
  updateEntry: (id: string, updates: Partial<VocabularyEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  reorderEntries: (typeId: string, entryIds: string[]) => Promise<void>
  
  // 关联文件操作
  createLinkedFile: (entry: VocabularyEntry) => Promise<string | null>
  linkFile: (entryId: string, filePath: string) => Promise<void>
  unlinkFile: (entryId: string) => Promise<void>
  
  // 设置操作
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<VocabularySettings>) => Promise<void>
  
  // 辅助方法
  getEntryById: (id: string) => VocabularyEntry | undefined
  getEntriesByType: (typeId: string) => VocabularyEntry[]
  getTypeById: (id: string) => VocabularyType | undefined
  findEntry: (id: string) => VocabularyEntry | null
  findType: (id: string) => VocabularyType | null
  clearData: () => void
  // 批量设置方法（用于聚合接口）
  setData: (types: VocabularyType[], entries: VocabularyEntry[]) => void
}

const DEFAULT_SETTINGS: VocabularySettings = {
  autoCreateVocabularyFile: false
}

export const useVocabularyStore = create<VocabularyState>((set, get) => ({
  // 初始状态
  types: [],
  entries: [],
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  isLoaded: false,
  entriesLoaded: false,
  error: null,
  
  // 类型操作
  loadTypes: async () => {
    set({ isLoading: true, error: null })
    try {
      const types = await window.electron.vocabulary.loadTypes()
      set({ types, isLoading: false, isLoaded: true, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载词汇类型失败'
      console.error('Failed to load vocabulary types:', error)
      set({ isLoading: false, isLoaded: false, error: errorMessage })
    }
  },
  
  saveTypes: async (types: VocabularyType[]) => {
    try {
      await window.electron.vocabulary.saveTypes(types)
      set({ types })
    } catch (error) {
      console.error('Failed to save vocabulary types:', error)
      throw error
    }
  },
  
  addType: async (type) => {
    try {
      const newType = await window.electron.vocabulary.addType(type)
      set(state => ({ types: [...state.types, newType] }))
      return newType
    } catch (error) {
      console.error('Failed to add vocabulary type:', error)
      throw error
    }
  },
  
  updateType: async (id, updates) => {
    try {
      const updated = await window.electron.vocabulary.updateType(id, updates)
      if (updated) {
        set(state => ({
          types: state.types.map(t => t.id === id ? updated : t)
        }))
      }
    } catch (error) {
      console.error('Failed to update vocabulary type:', error)
      throw error
    }
  },
  
  deleteType: async (id) => {
    try {
      const success = await window.electron.vocabulary.deleteType(id)
      if (success) {
        set(state => ({
          types: state.types.filter(t => t.id !== id),
          entries: state.entries.filter(e => e.typeId !== id)
        }))
      } else {
        throw new Error('删除失败：词汇类型不存在')
      }
    } catch (error) {
      console.error('Failed to delete vocabulary type:', error)
      throw error
    }
  },
  
  reorderTypes: async (typeIds: string[]) => {
    const { types } = get()
    // 保存原始数据以便回滚
    const originalTypes = [...types]
    
    // 根据 typeIds 顺序重新排列并更新 order 字段
    const reorderedTypes = typeIds.map((id, index) => {
      const type = types.find(t => t.id === id)
      if (!type) throw new Error(`类型 ${id} 不存在`)
      return { ...type, order: index, updatedAt: new Date().toISOString() }
    })
    
    // 乐观更新：先更新本地状态
    set({ types: reorderedTypes })
    
    try {
      await window.electron.vocabulary.saveTypes(reorderedTypes)
    } catch (error) {
      console.error('Failed to reorder vocabulary types:', error)
      // 回滚到原始状态
      set({ types: originalTypes })
      throw error
    }
  },
  
  // 条目操作
  loadEntries: async (typeId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const entries = await window.electron.vocabulary.loadEntries(typeId)
      if (typeId) {
        // 只更新指定类型的条目
        set(state => ({
          entries: [
            ...state.entries.filter(e => e.typeId !== typeId),
            ...entries
          ],
          isLoading: false,
          entriesLoaded: true,
          error: null
        }))
      } else {
        set({ entries, isLoading: false, entriesLoaded: true, error: null })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载词汇条目失败'
      console.error('Failed to load vocabulary entries:', error)
      set({ isLoading: false, entriesLoaded: false, error: errorMessage })
    }
  },
  
  saveEntries: async (typeId, entries) => {
    try {
      await window.electron.vocabulary.saveEntries(typeId, entries)
      set(state => ({
        entries: [
          ...state.entries.filter(e => e.typeId !== typeId),
          ...entries
        ]
      }))
    } catch (error) {
      console.error('Failed to save vocabulary entries:', error)
      throw error
    }
  },
  
  addEntry: async (entry) => {
    try {
      const newEntry = await window.electron.vocabulary.addEntry(entry)
      set(state => ({ entries: [...state.entries, newEntry] }))
      return newEntry
    } catch (error) {
      console.error('Failed to add vocabulary entry:', error)
      throw error
    }
  },
  
  updateEntry: async (id, updates) => {
    try {
      const updated = await window.electron.vocabulary.updateEntry(id, updates)
      if (updated) {
        set(state => ({
          entries: state.entries.map(e => e.id === id ? updated : e)
        }))
      }
    } catch (error) {
      console.error('Failed to update vocabulary entry:', error)
      throw error
    }
  },
  
  deleteEntry: async (id) => {
    try {
      const success = await window.electron.vocabulary.deleteEntry(id)
      if (success) {
        set(state => ({
          entries: state.entries.filter(e => e.id !== id)
        }))
      }
    } catch (error) {
      console.error('Failed to delete vocabulary entry:', error)
      throw error
    }
  },
  
  reorderEntries: async (typeId: string, entryIds: string[]) => {
    const { entries } = get()
    // 保存原始数据以便回滚
    const originalEntries = entries.filter(e => e.typeId === typeId)
    
    // 获取当前类型的所有条目
    const typeEntries = entries.filter(e => e.typeId === typeId)
    // 根据 entryIds 顺序重新排列并更新 order 字段
    const reorderedEntries = entryIds.map((id, index) => {
      const entry = typeEntries.find(e => e.id === id)
      if (!entry) throw new Error(`条目 ${id} 不存在`)
      return { ...entry, order: index, updatedAt: new Date().toISOString() }
    })
    
    // 乐观更新：先更新本地状态
    set(state => ({
      entries: [
        ...state.entries.filter(e => e.typeId !== typeId),
        ...reorderedEntries
      ]
    }))
    
    try {
      await window.electron.vocabulary.saveEntries(typeId, reorderedEntries)
    } catch (error) {
      console.error('Failed to reorder vocabulary entries:', error)
      // 回滚到原始状态
      set(state => ({
        entries: [
          ...state.entries.filter(e => e.typeId !== typeId),
          ...originalEntries
        ]
      }))
      throw error
    }
  },
  
  // 关联文件操作
  createLinkedFile: async (entry) => {
    try {
      const filePath = await window.electron.vocabulary.createLinkedFile(entry)
      if (filePath) {
        set(state => ({
          entries: state.entries.map(e => 
            e.id === entry.id ? { ...e, linkedFilePath: filePath } : e
          )
        }))
      }
      return filePath
    } catch (error) {
      console.error('Failed to create linked file:', error)
      throw error
    }
  },
  
  linkFile: async (entryId, filePath) => {
    try {
      const success = await window.electron.vocabulary.linkFile(entryId, filePath)
      if (success) {
        set(state => ({
          entries: state.entries.map(e => 
            e.id === entryId ? { ...e, linkedFilePath: filePath } : e
          )
        }))
      }
    } catch (error) {
      console.error('Failed to link file:', error)
      throw error
    }
  },
  
  unlinkFile: async (entryId) => {
    try {
      const success = await window.electron.vocabulary.unlinkFile(entryId)
      if (success) {
        set(state => ({
          entries: state.entries.map(e => 
            e.id === entryId ? { ...e, linkedFilePath: undefined } : e
          )
        }))
      }
    } catch (error) {
      console.error('Failed to unlink file:', error)
      throw error
    }
  },
  
  // 设置操作
  loadSettings: async () => {
    try {
      const settings = await window.electron.vocabulary.getSettings()
      set({ settings })
    } catch (error) {
      console.error('Failed to load vocabulary settings:', error)
    }
  },
  
  updateSettings: async (settings) => {
    try {
      await window.electron.vocabulary.updateSettings(settings)
      set(state => ({ settings: { ...state.settings, ...settings } }))
    } catch (error) {
      console.error('Failed to update vocabulary settings:', error)
      throw error
    }
  },
  
  // 辅助方法
  getEntryById: (id: string) => {
    return get().entries.find(e => e.id === id)
  },
  
  getEntriesByType: (typeId: string) => {
    return get().entries.filter(e => e.typeId === typeId)
  },
  
  getTypeById: (id: string) => {
    return get().types.find(t => t.id === id)
  },
  
  findEntry: (id: string) => {
    return get().entries.find(e => e.id === id) || null
  },
  
  findType: (id: string) => {
    return get().types.find(t => t.id === id) || null
  },
  
  clearData: () => {
    set({
      types: [],
      entries: [],
      settings: DEFAULT_SETTINGS,
      isLoaded: false,
      entriesLoaded: false,
      error: null
    })
  },

  // 批量设置数据（用于聚合接口）
  setData: (types: VocabularyType[], entries: VocabularyEntry[]) => {
    set({
      types,
      entries,
      isLoaded: true,
      entriesLoaded: true,
      isLoading: false,
      error: null
    })
  }
}))

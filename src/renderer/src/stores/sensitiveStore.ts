import { create } from 'zustand'
import type { SensitiveWord } from '@shared/sensitive'

interface SensitiveState {
  // 状态
  words: SensitiveWord[]
  isLoading: boolean
  isLoaded: boolean
  error: string | null // 错误信息

  // 操作
  loadWords: () => Promise<void>
  saveWords: (words: SensitiveWord[]) => Promise<void>
  addWord: (word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SensitiveWord>
  updateWord: (id: string, updates: Partial<SensitiveWord>) => Promise<void>
  deleteWord: (id: string) => Promise<void>
  importWords: (
    words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<number>

  // 辅助方法
  getWordById: (id: string) => SensitiveWord | undefined
  findWord: (id: string) => SensitiveWord | null
  checkText: (text: string) => Array<{ word: SensitiveWord; position: number }>
  // 批量设置方法（用于聚合接口）
  setWords: (words: SensitiveWord[]) => void
  clearData: () => void
  // 重排序
  reorderWords: (wordIds: string[]) => Promise<void>
}

export const useSensitiveStore = create<SensitiveState>((set, get) => ({
  // 初始状态
  words: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // 操作
  loadWords: async () => {
    set({ isLoading: true, error: null })
    try {
      const words = await window.api.sensitive.loadWords()
      set({ words: words || [], isLoading: false, isLoaded: true, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载敏感词失败'
      console.error('Failed to load sensitive words:', error)
      set({ isLoading: false, isLoaded: false, error: errorMessage })
    }
  },

  saveWords: async (words: SensitiveWord[]) => {
    try {
      await window.api.sensitive.saveWords(words)
      set({ words })
    } catch (error) {
      console.error('Failed to save sensitive words:', error)
      throw error
    }
  },

  addWord: async word => {
    try {
      const newWord = await window.api.sensitive.addWord(word)
      set(state => ({ words: [...state.words, newWord] }))
      return newWord
    } catch (error) {
      console.error('Failed to add sensitive word:', error)
      throw error
    }
  },

  updateWord: async (id, updates) => {
    try {
      const updated = await window.api.sensitive.updateWord(id, updates)
      if (updated) {
        set(state => ({
          words: state.words.map(w => (w.id === id ? updated : w))
        }))
      }
    } catch (error) {
      console.error('Failed to update sensitive word:', error)
      throw error
    }
  },

  deleteWord: async id => {
    try {
      const success = await window.api.sensitive.deleteWord(id)
      if (success) {
        set(state => ({
          words: state.words.filter(w => w.id !== id)
        }))
      }
    } catch (error) {
      console.error('Failed to delete sensitive word:', error)
      throw error
    }
  },

  importWords: async words => {
    try {
      const imported = await window.api.sensitive.importWords(words)
      // 重新加载所有敏感词
      await get().loadWords()
      return imported
    } catch (error) {
      console.error('Failed to import sensitive words:', error)
      throw error
    }
  },

  // 辅助方法
  getWordById: (id: string) => {
    return get().words.find(w => w.id === id)
  },

  findWord: (id: string) => {
    return get().words.find(w => w.id === id) || null
  },

  checkText: (text: string) => {
    const results: Array<{ word: SensitiveWord; position: number }> = []
    const { words } = get()

    for (const word of words) {
      // 检查主词
      let pos = text.indexOf(word.name)
      if (pos !== -1) {
        results.push({ word, position: pos })
        continue
      }

      // 检查别名
      for (const alias of word.aliases) {
        pos = text.indexOf(alias)
        if (pos !== -1) {
          results.push({ word, position: pos })
          break
        }
      }
    }

    return results
  },

  clearData: () => {
    set({
      words: [],
      isLoaded: false,
      error: null
    })
  },

  // 批量设置数据（用于聚合接口）
  setWords: (words: SensitiveWord[]) => {
    set({
      words,
      isLoaded: true,
      isLoading: false,
      error: null
    })
  },

  // 重排序敏感词
  reorderWords: async (wordIds: string[]) => {
    try {
      const { words } = get()
      // 根据 wordIds 顺序重新排列并更新 order 字段
      const reorderedWords = wordIds.map((id, index) => {
        const word = words.find(w => w.id === id)
        if (!word) throw new Error(`敏感词 ${id} 不存在`)
        return { ...word, order: index, updatedAt: new Date().toISOString() }
      })
      await window.api.sensitive.saveWords(reorderedWords)
      set({ words: reorderedWords })
    } catch (error) {
      console.error('Failed to reorder sensitive words:', error)
      throw error
    }
  }
}))

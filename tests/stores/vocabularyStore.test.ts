import { describe, it, expect, beforeEach } from 'vitest'
import { useVocabularyStore } from '@renderer/stores/vocabularyStore'
import type { VocabularyType, VocabularyEntry } from '@shared/vocabulary'

function createType(overrides: Partial<VocabularyType> & { id: string; name: string }): VocabularyType {
  return {
    icon: undefined,
    color: '#1890ff',
    fields: [],
    tableConfig: [],
    isBuiltIn: false,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createEntry(overrides: Partial<VocabularyEntry> & { id: string; name: string; typeId: string }): VocabularyEntry {
  return {
    aliases: [],
    color: '#1890ff',
    typeName: '角色',
    fields: {},
    tags: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

const sampleTypes: VocabularyType[] = [
  createType({ id: 'character', name: '角色', isBuiltIn: true, order: 0 }),
  createType({ id: 'location', name: '地点', isBuiltIn: true, order: 1 }),
  createType({ id: 'item', name: '道具', isBuiltIn: false, order: 2 }),
]

const sampleEntries: VocabularyEntry[] = [
  createEntry({ id: 'e1', name: '张三', typeId: 'character', typeName: '角色', order: 0 }),
  createEntry({ id: 'e2', name: '李四', typeId: 'character', typeName: '角色', order: 1 }),
  createEntry({ id: 'e3', name: '北京', typeId: 'location', typeName: '地点', order: 0 }),
  createEntry({ id: 'e4', name: '魔剑', typeId: 'item', typeName: '道具', order: 0 }),
]

describe('VocabularyStore - 辅助查询方法', () => {
  beforeEach(() => {
    useVocabularyStore.setState({
      types: [],
      entries: [],
      settings: { autoCreateVocabularyFile: false },
      isLoading: false,
      isLoaded: false,
      entriesLoaded: false,
      error: null,
    })
  })

  function setupStore() {
    useVocabularyStore.setState({
      types: sampleTypes,
      entries: sampleEntries,
      isLoaded: true,
      entriesLoaded: true,
    })
  }

  describe('getEntryById', () => {
    it('应该返回指定ID的条目', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const entry = store.getEntryById('e1')
      expect(entry).toBeDefined()
      expect(entry?.name).toBe('张三')
    })

    it('不存在的ID应返回undefined', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      expect(store.getEntryById('nonexistent')).toBeUndefined()
    })
  })

  describe('getEntriesByType', () => {
    it('应该返回指定类型的所有条目', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const characterEntries = store.getEntriesByType('character')
      expect(characterEntries.length).toBe(2)
      expect(characterEntries.map((e) => e.id)).toContain('e1')
      expect(characterEntries.map((e) => e.id)).toContain('e2')
    })

    it('没有条目的类型应返回空数组', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const emptyEntries = store.getEntriesByType('nonexistent')
      expect(emptyEntries).toEqual([])
    })

    it('地点类型应该只返回地点条目', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const locationEntries = store.getEntriesByType('location')
      expect(locationEntries.length).toBe(1)
      expect(locationEntries[0].name).toBe('北京')
    })
  })

  describe('getTypeById', () => {
    it('应该返回指定ID的类型', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const type = store.getTypeById('character')
      expect(type).toBeDefined()
      expect(type?.name).toBe('角色')
    })

    it('不存在的ID应返回undefined', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      expect(store.getTypeById('nonexistent')).toBeUndefined()
    })
  })

  describe('findEntry', () => {
    it('应该返回指定ID的条目', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const entry = store.findEntry('e3')
      expect(entry).toBeDefined()
      expect(entry?.name).toBe('北京')
    })

    it('不存在的ID应返回null', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      expect(store.findEntry('nonexistent')).toBeNull()
    })
  })

  describe('findType', () => {
    it('应该返回指定ID的类型', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      const type = store.findType('item')
      expect(type).toBeDefined()
      expect(type?.name).toBe('道具')
    })

    it('不存在的ID应返回null', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      expect(store.findType('nonexistent')).toBeNull()
    })
  })

  describe('clearData', () => {
    it('应该重置所有状态', () => {
      setupStore()
      const store = useVocabularyStore.getState()
      store.clearData()

      const state = useVocabularyStore.getState()
      expect(state.types).toEqual([])
      expect(state.entries).toEqual([])
      expect(state.isLoaded).toBe(false)
      expect(state.entriesLoaded).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setData', () => {
    it('应该批量设置类型和条目数据', () => {
      const store = useVocabularyStore.getState()
      store.setData(sampleTypes, sampleEntries)

      const state = useVocabularyStore.getState()
      expect(state.types).toEqual(sampleTypes)
      expect(state.entries).toEqual(sampleEntries)
      expect(state.isLoaded).toBe(true)
      expect(state.entriesLoaded).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('设置空数据也应正常工作', () => {
      const store = useVocabularyStore.getState()
      store.setData([], [])

      const state = useVocabularyStore.getState()
      expect(state.types).toEqual([])
      expect(state.entries).toEqual([])
      expect(state.isLoaded).toBe(true)
    })
  })
})

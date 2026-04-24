import { ipcMain } from 'electron'
import { vocabularyService } from '../services/vocabulary'
import { validateParams, validators } from '../utils/validation'
import type {
  VocabularyType,
  VocabularyEntry,
  SensitiveWord
} from '../types'

let registered = false

export function registerVocabularyHandlers(): void {
  if (registered) return
  registered = true

  // ============================================
  // 词汇类型 IPC 处理器
  // ============================================

  ipcMain.handle('vocabulary:loadTypes', (): VocabularyType[] => {
    return vocabularyService.loadVocabularyTypes()
  })

  ipcMain.handle('vocabulary:saveTypes', (_event, types: VocabularyType[]): void => {
    validateParams('vocabulary:saveTypes')
      .array(types, 'types')
      .validate()
    vocabularyService.saveVocabularyTypes(types)
  })

  ipcMain.handle('vocabulary:addType', (_event, type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>): VocabularyType => {
    validateParams('vocabulary:addType')
      .object(type, 'type')
      .nonEmptyString((type as Record<string, unknown>).name as string, 'type.name')
      .validate()
    return vocabularyService.addVocabularyType(type)
  })

  ipcMain.handle('vocabulary:updateType', (_event, id: string, updates: Partial<VocabularyType>): VocabularyType | null => {
    validateParams('vocabulary:updateType')
      .nonEmptyString(id, 'id')
      .object(updates, 'updates')
      .validate()
    return vocabularyService.updateVocabularyType(id, updates)
  })

  ipcMain.handle('vocabulary:deleteType', (_event, id: string): boolean => {
    validateParams('vocabulary:deleteType')
      .nonEmptyString(id, 'id')
      .validate()
    return vocabularyService.deleteVocabularyType(id)
  })

  // ============================================
  // 词汇条目 IPC 处理器
  // ============================================

  ipcMain.handle('vocabulary:loadEntries', (_event, typeId?: string): VocabularyEntry[] => {
    if (typeId !== undefined) {
      validateParams('vocabulary:loadEntries')
        .nonEmptyString(typeId, 'typeId')
        .validate()
    }
    return vocabularyService.loadVocabularyEntries(typeId)
  })

  ipcMain.handle('vocabulary:saveEntries', (_event, typeId: string, entries: VocabularyEntry[]): void => {
    validateParams('vocabulary:saveEntries')
      .nonEmptyString(typeId, 'typeId')
      .array(entries, 'entries')
      .validate()
    vocabularyService.saveVocabularyEntries(typeId, entries)
  })

  ipcMain.handle('vocabulary:addEntry', (_event, entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt'>): VocabularyEntry => {
    validateParams('vocabulary:addEntry')
      .object(entry, 'entry')
      .nonEmptyString((entry as Record<string, unknown>).name as string, 'entry.name')
      .nonEmptyString((entry as Record<string, unknown>).typeId as string, 'entry.typeId')
      .validate()
    return vocabularyService.addVocabularyEntry(entry)
  })

  ipcMain.handle('vocabulary:updateEntry', (_event, id: string, updates: Partial<VocabularyEntry>): VocabularyEntry | null => {
    validateParams('vocabulary:updateEntry')
      .nonEmptyString(id, 'id')
      .object(updates, 'updates')
      .validate()
    return vocabularyService.updateVocabularyEntry(id, updates)
  })

  ipcMain.handle('vocabulary:deleteEntry', (_event, id: string): boolean => {
    validateParams('vocabulary:deleteEntry')
      .nonEmptyString(id, 'id')
      .validate()
    return vocabularyService.deleteVocabularyEntry(id)
  })

  ipcMain.handle('vocabulary:createLinkedFile', (_event, entry: VocabularyEntry): string | null => {
    validateParams('vocabulary:createLinkedFile')
      .object(entry, 'entry')
      .nonEmptyString((entry as Record<string, unknown>).id as string, 'entry.id')
      .validate()
    return vocabularyService.createLinkedNovelFile(entry)
  })

  ipcMain.handle('vocabulary:linkFile', (_event, entryId: string, filePath: string): boolean => {
    validateParams('vocabulary:linkFile')
      .nonEmptyString(entryId, 'entryId')
      .nonEmptyString(filePath, 'filePath')
      .validate()
    return vocabularyService.linkToFile(entryId, filePath)
  })

  ipcMain.handle('vocabulary:unlinkFile', (_event, entryId: string): boolean => {
    validateParams('vocabulary:unlinkFile')
      .nonEmptyString(entryId, 'entryId')
      .validate()
    return vocabularyService.unlinkFile(entryId)
  })

  // ============================================
  // 敏感词 IPC 处理器
  // ============================================

  ipcMain.handle('sensitive:loadWords', (): SensitiveWord[] => {
    return vocabularyService.loadSensitiveWords()
  })

  ipcMain.handle('sensitive:saveWords', (_event, words: SensitiveWord[]): void => {
    validateParams('sensitive:saveWords')
      .array(words, 'words')
      .validate()
    vocabularyService.saveSensitiveWords(words)
  })

  ipcMain.handle('sensitive:addWord', (_event, word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>): SensitiveWord => {
    validateParams('sensitive:addWord')
      .object(word, 'word')
      .nonEmptyString((word as Record<string, unknown>).name as string, 'word.name')
      .validate()
    return vocabularyService.addSensitiveWord(word)
  })

  ipcMain.handle('sensitive:updateWord', (_event, id: string, updates: Partial<SensitiveWord>): SensitiveWord | null => {
    validateParams('sensitive:updateWord')
      .nonEmptyString(id, 'id')
      .object(updates, 'updates')
      .validate()
    return vocabularyService.updateSensitiveWord(id, updates)
  })

  ipcMain.handle('sensitive:deleteWord', (_event, id: string): boolean => {
    validateParams('sensitive:deleteWord')
      .nonEmptyString(id, 'id')
      .validate()
    return vocabularyService.deleteSensitiveWord(id)
  })

  ipcMain.handle('sensitive:importWords', (_event, words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>): number => {
    validateParams('sensitive:importWords')
      .array(words, 'words')
      .validate()
    return vocabularyService.importSensitiveWords(words)
  })

  // ============================================
  // 设置 IPC 处理器
  // ============================================

  ipcMain.handle('vocabulary:getSettings', () => {
    return vocabularyService.getSettings()
  })

  ipcMain.handle('vocabulary:updateSettings', (_event, settings: { autoCreateVocabularyFile?: boolean }) => {
    validateParams('vocabulary:updateSettings')
      .object(settings, 'settings')
      .validate()
    vocabularyService.updateSettings(settings)
  })
}

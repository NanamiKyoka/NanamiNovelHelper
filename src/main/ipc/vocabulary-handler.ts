import { ipcMain } from 'electron'
import { vocabularyService } from '../services/vocabulary'
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
    vocabularyService.saveVocabularyTypes(types)
  })

  ipcMain.handle('vocabulary:addType', (_event, type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>): VocabularyType => {
    return vocabularyService.addVocabularyType(type)
  })

  ipcMain.handle('vocabulary:updateType', (_event, id: string, updates: Partial<VocabularyType>): VocabularyType | null => {
    return vocabularyService.updateVocabularyType(id, updates)
  })

  ipcMain.handle('vocabulary:deleteType', (_event, id: string): boolean => {
    return vocabularyService.deleteVocabularyType(id)
  })

  // ============================================
  // 词汇条目 IPC 处理器
  // ============================================

  ipcMain.handle('vocabulary:loadEntries', (_event, typeId?: string): VocabularyEntry[] => {
    return vocabularyService.loadVocabularyEntries(typeId)
  })

  ipcMain.handle('vocabulary:saveEntries', (_event, typeId: string, entries: VocabularyEntry[]): void => {
    vocabularyService.saveVocabularyEntries(typeId, entries)
  })

  ipcMain.handle('vocabulary:addEntry', (_event, entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt'>): VocabularyEntry => {
    return vocabularyService.addVocabularyEntry(entry)
  })

  ipcMain.handle('vocabulary:updateEntry', (_event, id: string, updates: Partial<VocabularyEntry>): VocabularyEntry | null => {
    return vocabularyService.updateVocabularyEntry(id, updates)
  })

  ipcMain.handle('vocabulary:deleteEntry', (_event, id: string): boolean => {
    return vocabularyService.deleteVocabularyEntry(id)
  })

  ipcMain.handle('vocabulary:createLinkedFile', (_event, entry: VocabularyEntry): string | null => {
    return vocabularyService.createLinkedMarkdownFile(entry)
  })

  ipcMain.handle('vocabulary:linkFile', (_event, entryId: string, filePath: string): boolean => {
    return vocabularyService.linkToMarkdownFile(entryId, filePath)
  })

  ipcMain.handle('vocabulary:unlinkFile', (_event, entryId: string): boolean => {
    return vocabularyService.unlinkMarkdownFile(entryId)
  })

  // ============================================
  // 敏感词 IPC 处理器
  // ============================================

  ipcMain.handle('sensitive:loadWords', (): SensitiveWord[] => {
    return vocabularyService.loadSensitiveWords()
  })

  ipcMain.handle('sensitive:saveWords', (_event, words: SensitiveWord[]): void => {
    vocabularyService.saveSensitiveWords(words)
  })

  ipcMain.handle('sensitive:addWord', (_event, word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>): SensitiveWord => {
    return vocabularyService.addSensitiveWord(word)
  })

  ipcMain.handle('sensitive:updateWord', (_event, id: string, updates: Partial<SensitiveWord>): SensitiveWord | null => {
    return vocabularyService.updateSensitiveWord(id, updates)
  })

  ipcMain.handle('sensitive:deleteWord', (_event, id: string): boolean => {
    return vocabularyService.deleteSensitiveWord(id)
  })

  ipcMain.handle('sensitive:importWords', (_event, words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>): number => {
    return vocabularyService.importSensitiveWords(words)
  })

  // ============================================
  // 设置 IPC 处理器
  // ============================================

  ipcMain.handle('vocabulary:getSettings', () => {
    return vocabularyService.getSettings()
  })

  ipcMain.handle('vocabulary:updateSettings', (_event, settings: { autoCreateVocabularyFile?: boolean }) => {
    vocabularyService.updateSettings(settings)
  })
}

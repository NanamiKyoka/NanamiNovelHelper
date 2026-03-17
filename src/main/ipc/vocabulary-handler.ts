import { ipcMain } from 'electron'
import { vocabularyService } from '../services/vocabulary'
import type {
  VocabularyType,
  VocabularyEntry,
  SensitiveWord
} from '../types'

// ============================================
// 词汇类型 IPC 处理器
// ============================================

// 加载词汇类型
ipcMain.handle('vocabulary:loadTypes', (): VocabularyType[] => {
  return vocabularyService.loadVocabularyTypes()
})

// 保存词汇类型
ipcMain.handle('vocabulary:saveTypes', (_event, types: VocabularyType[]): void => {
  vocabularyService.saveVocabularyTypes(types)
})

// 添加词汇类型
ipcMain.handle('vocabulary:addType', (_event, type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>): VocabularyType => {
  return vocabularyService.addVocabularyType(type)
})

// 更新词汇类型
ipcMain.handle('vocabulary:updateType', (_event, id: string, updates: Partial<VocabularyType>): VocabularyType | null => {
  return vocabularyService.updateVocabularyType(id, updates)
})

// 删除词汇类型
ipcMain.handle('vocabulary:deleteType', (_event, id: string): boolean => {
  return vocabularyService.deleteVocabularyType(id)
})

// ============================================
// 词汇条目 IPC 处理器
// ============================================

// 加载词汇条目
ipcMain.handle('vocabulary:loadEntries', (_event, typeId?: string): VocabularyEntry[] => {
  return vocabularyService.loadVocabularyEntries(typeId)
})

// 保存词汇条目
ipcMain.handle('vocabulary:saveEntries', (_event, typeId: string, entries: VocabularyEntry[]): void => {
  vocabularyService.saveVocabularyEntries(typeId, entries)
})

// 添加词汇条目
ipcMain.handle('vocabulary:addEntry', (_event, entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt'>): VocabularyEntry => {
  return vocabularyService.addVocabularyEntry(entry)
})

// 更新词汇条目
ipcMain.handle('vocabulary:updateEntry', (_event, id: string, updates: Partial<VocabularyEntry>): VocabularyEntry | null => {
  return vocabularyService.updateVocabularyEntry(id, updates)
})

// 删除词汇条目
ipcMain.handle('vocabulary:deleteEntry', (_event, id: string): boolean => {
  return vocabularyService.deleteVocabularyEntry(id)
})

// 创建关联的 Markdown 文件
ipcMain.handle('vocabulary:createLinkedFile', (_event, entry: VocabularyEntry): string | null => {
  return vocabularyService.createLinkedMarkdownFile(entry)
})

// 链接到现有文件
ipcMain.handle('vocabulary:linkFile', (_event, entryId: string, filePath: string): boolean => {
  return vocabularyService.linkToMarkdownFile(entryId, filePath)
})

// 取消链接
ipcMain.handle('vocabulary:unlinkFile', (_event, entryId: string): boolean => {
  return vocabularyService.unlinkMarkdownFile(entryId)
})

// ============================================
// 敏感词 IPC 处理器
// ============================================

// 加载敏感词
ipcMain.handle('sensitive:loadWords', (): SensitiveWord[] => {
  return vocabularyService.loadSensitiveWords()
})

// 保存敏感词
ipcMain.handle('sensitive:saveWords', (_event, words: SensitiveWord[]): void => {
  vocabularyService.saveSensitiveWords(words)
})

// 添加敏感词
ipcMain.handle('sensitive:addWord', (_event, word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>): SensitiveWord => {
  return vocabularyService.addSensitiveWord(word)
})

// 更新敏感词
ipcMain.handle('sensitive:updateWord', (_event, id: string, updates: Partial<SensitiveWord>): SensitiveWord | null => {
  return vocabularyService.updateSensitiveWord(id, updates)
})

// 删除敏感词
ipcMain.handle('sensitive:deleteWord', (_event, id: string): boolean => {
  return vocabularyService.deleteSensitiveWord(id)
})

// 批量导入敏感词
ipcMain.handle('sensitive:importWords', (_event, words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>): number => {
  return vocabularyService.importSensitiveWords(words)
})

// ============================================
// 设置 IPC 处理器
// ============================================

// 获取词汇设置
ipcMain.handle('vocabulary:getSettings', () => {
  return vocabularyService.getSettings()
})

// 更新词汇设置
ipcMain.handle('vocabulary:updateSettings', (_event, settings: { autoCreateVocabularyFile?: boolean }) => {
  vocabularyService.updateSettings(settings)
})

export function registerVocabularyHandlers(): void {
  // 所有处理器已通过 ipcMain.handle 注册
  // 此函数用于显式调用，方便在主进程初始化时统一注册
}

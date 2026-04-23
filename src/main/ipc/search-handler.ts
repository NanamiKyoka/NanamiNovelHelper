/**
 * 搜索功能 IPC 处理器
 */

import { ipcMain } from 'electron'
import { searchService, SearchOptions, SearchResult } from '../services/search'
import { validateParams } from '../utils/validation'

/**
 * 注册搜索相关的 IPC 处理器
 */
export function registerSearchHandlers(): void {
  // 执行搜索
  ipcMain.handle('search:content', async (_event, options: SearchOptions): Promise<SearchResult> => {
    validateParams('search:content').object(options, 'options').validate()
    return await searchService.search(options)
  })

  ipcMain.handle(
    'search:replace',
    async (
      _event,
      filePath: string,
      searchQuery: string,
      replaceText: string,
      options: {
        caseSensitive?: boolean
        wholeWord?: boolean
        useRegex?: boolean
        replaceAll?: boolean
        line?: number
        column?: number
      }
    ) => {
      validateParams('search:replace')
        .nonEmptyString(filePath, 'filePath')
        .nonEmptyString(searchQuery, 'searchQuery')
        .string(replaceText, 'replaceText')
        .validate()
      return await searchService.replace(filePath, searchQuery, replaceText, options)
    }
  )
}

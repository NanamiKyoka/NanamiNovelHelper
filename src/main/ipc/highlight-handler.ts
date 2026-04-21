/**
 * 高亮配置 IPC 处理器
 */

import { ipcMain } from 'electron'
import { highlightService } from '../services/highlight'
import type { HighlightConfig } from '../types/highlight'

let registered = false

export function registerHighlightHandlers(): void {
  if (registered) return
  registered = true

  ipcMain.handle('highlight:loadConfig', (): HighlightConfig => {
    return highlightService.loadConfig()
  })

  ipcMain.handle('highlight:saveConfig', (_event, config: Partial<HighlightConfig>): void => {
    highlightService.saveConfig(config)
  })
}

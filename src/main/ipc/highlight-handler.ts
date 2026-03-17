/**
 * 高亮配置 IPC 处理器
 */

import { ipcMain } from 'electron'
import { highlightService } from '../services/highlight'
import type { HighlightConfig } from '../types/highlight'

// 加载高亮配置
ipcMain.handle('highlight:loadConfig', (): HighlightConfig => {
  return highlightService.loadConfig()
})

// 保存高亮配置
ipcMain.handle('highlight:saveConfig', (_event, config: Partial<HighlightConfig>): void => {
  highlightService.saveConfig(config)
})

export function registerHighlightHandlers(): void {
  // 所有处理器已通过 ipcMain.handle 注册
  // 此函数用于显式调用，方便在主进程初始化时统一注册
}

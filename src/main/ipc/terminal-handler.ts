/**
 * 终端 IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron'
import { terminalService } from '../services/terminal'
import { TerminalChannels, TerminalSize } from '../types/terminal'

export function registerTerminalHandlers(): void {
  // 创建终端
  ipcMain.handle(TerminalChannels.CREATE, (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      throw new Error('无法获取窗口实例')
    }
    return terminalService.create(options, window)
  })

  // 写入数据
  ipcMain.handle(TerminalChannels.WRITE, (_, id: string, data: string) => {
    return terminalService.write(id, data)
  })

  // 调整尺寸
  ipcMain.on(TerminalChannels.RESIZE, (_, id: string, size: TerminalSize) => {
    terminalService.resize(id, size)
  })

  // 销毁终端
  ipcMain.handle(TerminalChannels.DESTROY, (_, id: string) => {
    return terminalService.destroy(id)
  })

  // 获取终端列表
  ipcMain.handle(TerminalChannels.LIST, () => {
    return terminalService.list()
  })

  // 获取可用的 Shell 列表
  ipcMain.handle(TerminalChannels.GET_SHELLS, () => {
    return terminalService.getShells()
  })

  // 设置工作目录 (通过创建新终端实现)
  ipcMain.handle(TerminalChannels.SET_CWD, (event, id: string, cwd: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      throw new Error('无法获取窗口实例')
    }
    // 先销毁旧终端
    terminalService.destroy(id)
    // 创建新终端并设置工作目录
    return terminalService.create({ cwd }, window)
  })
}

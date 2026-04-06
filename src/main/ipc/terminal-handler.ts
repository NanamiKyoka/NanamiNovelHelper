/**
 * 终端 IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron'
import { terminalService } from '../services/terminal'
import { TerminalChannels, TerminalSize } from '../types/terminal'
import { validateParams } from '../utils/validation'

export function registerTerminalHandlers(): void {
  // 创建终端
  ipcMain.handle(TerminalChannels.CREATE, (event, options) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) {
      throw new Error('无法获取窗口实例')
    }
    // 参数验证（options 可选）
    if (options !== undefined && options !== null) {
      validateParams('terminal:create ').object(options, 'options').validate()
    }
    return terminalService.create(options, window)
  })

  // 写入数据
  ipcMain.handle(TerminalChannels.WRITE, (_, id: string, data: string) => {
    // 参数验证
    validateParams('terminal:write ')
      .nonEmptyString(id, 'id')
      .string(data, 'data')
      .validate()
    return terminalService.write(id, data)
  })

  // 调整尺寸
  ipcMain.on(TerminalChannels.RESIZE, (_, id: string, size: TerminalSize) => {
    // 参数验证
    validateParams('terminal:resize ')
      .nonEmptyString(id, 'id')
      .object(size, 'size')
      .positiveInt((size as TerminalSize).cols, 'size.cols')
      .positiveInt((size as TerminalSize).rows, 'size.rows')
      .validate()
    terminalService.resize(id, size)
  })

  // 销毁终端
  ipcMain.handle(TerminalChannels.DESTROY, (_, id: string) => {
    // 参数验证
    validateParams('terminal:destroy ').nonEmptyString(id, 'id').validate()
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
    // 参数验证
    validateParams('terminal:setCwd ')
      .nonEmptyString(id, 'id')
      .nonEmptyString(cwd, 'cwd')
      .validate()
    // 先销毁旧终端
    terminalService.destroy(id)
    // 创建新终端并设置工作目录
    return terminalService.create({ cwd }, window)
  })
}

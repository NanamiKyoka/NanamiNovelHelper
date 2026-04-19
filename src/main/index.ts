import { app, BrowserWindow, shell, ipcMain, protocol } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import { registerProjectHandlers } from './ipc/project-handler'
import { registerVocabularyHandlers } from './ipc/vocabulary-handler'
import { registerFileHandlers } from './ipc/file-handler'
import { registerHighlightHandlers } from './ipc/highlight-handler'
import { registerSettingsHandlers } from './ipc/settings-handler'
import { registerRelationshipHandlers } from './ipc/relationship-handler'
import { registerImageHandlers } from './ipc/image-handler'
import { registerTimelineHandlers } from './ipc/timeline-handler'
import { registerSequenceChartHandlers } from './ipc/sequence-chart-handler'
import { registerOrganizationHandlers } from './ipc/organization-handler'
import { registerMapHandlers } from './ipc/map-handler'
import { registerTerminalHandlers } from './ipc/terminal-handler'
import { registerGitHandlers } from './ipc/git-handler'
import { registerAiAssistantHandlers } from './ipc/ai-assistant-handler'
import { registerDynamicSkillHandlers } from './ipc/dynamic-skill-handler'
import { registerSearchHandlers } from './ipc/search-handler'
import { terminalService } from './services/terminal'
import { dynamicSkillService } from './services/dynamicSkill'
import { fileService } from './services/file'
import { aiAssistantService } from './services/aiAssistant'

let mainWindow: BrowserWindow | null = null
let terminalWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // Windows/Linux 使用无边框窗口，配合自定义标题栏
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 10 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // 窗口最大化状态变化时通知渲染进程
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 创建终端独立窗口

function createTerminalWindow(): BrowserWindow {

  // 确保清理旧的终端进程

  terminalService.destroyAll()

  

  terminalWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    show: false,
    autoHideMenuBar: true,
    title: '终端 - NanamiNovelHelper',
    // Windows/Linux 使用无边框窗口
    frame: process.platform === 'darwin',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  terminalWindow.on('ready-to-show', () => {
    terminalWindow?.show()
    // 通知主窗口终端窗口已打开
    mainWindow?.webContents.send('terminal-window-opened')
  })

  terminalWindow.on('closed', () => {
    // 清理所有 PTY 进程
    terminalService.destroyAll()
    terminalWindow = null
    // 通知主窗口终端窗口已关闭
    mainWindow?.webContents.send('terminal-window-closed')
  })

  terminalWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Terminal window failed to load:', errorCode, errorDescription)
  })

  // 加载终端页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const rendererUrl = process.env['ELECTRON_RENDERER_URL']
    const terminalUrl = rendererUrl.endsWith('/') 
      ? `${rendererUrl}terminal.html` 
      : `${rendererUrl}/terminal.html`
    terminalWindow.loadURL(terminalUrl)
  } else {
    terminalWindow.loadFile(join(__dirname, '../renderer/terminal.html'))
  }

  return terminalWindow
}

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false
})

// 全屏模式控制
ipcMain.on('window-set-fullscreen', (_, isFullscreen: boolean) => {
  mainWindow?.setFullScreen(isFullscreen)
})

ipcMain.handle('window-is-fullscreen', () => {
  return mainWindow?.isFullScreen() ?? false
})

// 全屏状态变化通知
mainWindow?.on('enter-full-screen', () => {
  mainWindow?.webContents.send('window-fullscreen-change', true)
})

mainWindow?.on('leave-full-screen', () => {
  mainWindow?.webContents.send('window-fullscreen-change', false)
})

// 终端窗口 IPC 处理
ipcMain.handle('terminal-window:create', () => {
  if (terminalWindow) {
    terminalWindow.focus()
    return true
  }
  createTerminalWindow()
  return true
})

ipcMain.handle('terminal-window:is-open', () => {
  return terminalWindow !== null
})

ipcMain.on('terminal-window:close', () => {
  terminalWindow?.close()
})

ipcMain.on('terminal-window:show', () => {
  if (terminalWindow) {
    terminalWindow.show()
    terminalWindow.focus()
  }
})

ipcMain.on('terminal-window:minimize', () => {
  terminalWindow?.minimize()
})

ipcMain.on('terminal-window:maximize', () => {
  if (terminalWindow?.isMaximized()) {
    terminalWindow.unmaximize()
  } else {
    terminalWindow?.maximize()
  }
})

ipcMain.handle('terminal-window:is-maximized', () => {
  return terminalWindow?.isMaximized() ?? false
})

ipcMain.handle('shell:open-external', async (_event, url: string) => {
  try {
    await shell.openExternal(url)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('updater:check-for-updates', async () => {
  return false
})

ipcMain.handle('updater:download-update', async () => {
  return false
})

ipcMain.on('updater:quit-and-install', () => {
})

// 注册 local:// 协议为特权协议（必须在 app.ready 之前）
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

app.whenReady().then(() => {
  // 注册 local:// 协议用于加载本地图片
  protocol.handle('local', (request) => {
    // URL 格式：local://file/E%3A/path/to/file.png
    // 其中 E%3A 是 URL 编码后的盘符（避免浏览器把盘符当作主机名）
    const url = request.url

    // 去掉 local://file/ 前缀
    const filePath = decodeURIComponent(url.slice('local://file/'.length))

    try {
      const data = fs.readFileSync(filePath)
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'gif' ? 'image/gif' :
                       ext === 'webp' ? 'image/webp' :
                       ext === 'svg' ? 'image/svg+xml' : 'image/png'
      return new Response(data, {
        headers: { 'content-type': mimeType }
      })
    } catch {
      return new Response(null, { status: 404 })
    }
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.nanami.novel-helper')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 注册 IPC 处理器
  registerProjectHandlers()
  registerVocabularyHandlers()
  registerFileHandlers()
  registerHighlightHandlers()
  registerSettingsHandlers()
  registerRelationshipHandlers()
  registerImageHandlers()
  registerTimelineHandlers()
  registerSequenceChartHandlers()
  registerOrganizationHandlers()
  registerMapHandlers()
  registerTerminalHandlers()
  registerGitHandlers()
  registerAiAssistantHandlers()
  registerDynamicSkillHandlers()
  registerSearchHandlers()

  // 初始化服务
  aiAssistantService.initGlobal()
  dynamicSkillService.initialize()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// macOS 应用通常在用户按 Cmd+Q 退出前保持运行
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
/**
 * 终端服务
 * 管理 PTY 进程的创建、销毁、数据传输
 */

import { BrowserWindow, app } from 'electron'
import * as pty from 'node-pty'
import { platform } from 'os'
import { join } from 'path'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { TerminalCreateOptions, TerminalInstance, TerminalSize, ShellInfo } from '../types/terminal'

/**
 * 终端进程实例 (内部使用)
 */
interface TerminalProcess {
  id: string
  name: string
  pty: pty.IPty
  cwd: string
  exited: boolean
  exitCode?: number
}

/**
 * 终端服务类
 */
class TerminalService {
  private terminals: Map<string, TerminalProcess> = new Map()
  private defaultShell: string | null = null
  private availableShells: ShellInfo[] = []

  constructor() {
    this.detectShells()
  }

  /**
   * 检测系统可用的 Shell
   */
  private detectShells(): void {
    const osPlatform = platform()
    const shells: ShellInfo[] = []

    if (osPlatform === 'win32') {
      // Windows: 检测 PowerShell, cmd, Git Bash
      const powerShellPaths = [
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe'
      ]

      for (const pshPath of powerShellPaths) {
        if (existsSync(pshPath)) {
          const isPwsh = pshPath.includes('PowerShell\\7')
          shells.push({
            name: isPwsh ? 'PowerShell 7' : 'Windows PowerShell',
            path: pshPath,
            isDefault: !this.defaultShell && pshPath.includes('PowerShell\\7')
          })
          if (!this.defaultShell && pshPath.includes('PowerShell\\7')) {
            this.defaultShell = pshPath
          }
        }
      }

      // Git Bash
      const gitBashPaths = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe')
      ]
      for (const gitPath of gitBashPaths) {
        if (existsSync(gitPath)) {
          shells.push({
            name: 'Git Bash',
            path: gitPath
          })
          break
        }
      }

      // CMD
      const cmdPath = 'C:\\Windows\\System32\\cmd.exe'
      if (existsSync(cmdPath)) {
        shells.push({
          name: 'Command Prompt',
          path: cmdPath
        })
      }

      // 默认使用 PowerShell 7 或 Windows PowerShell
      if (!this.defaultShell) {
        const pwsh = shells.find(s => s.name === 'PowerShell 7' || s.name === 'Windows PowerShell')
        if (pwsh) {
          this.defaultShell = pwsh.path
          pwsh.isDefault = true
        } else if (shells.length > 0) {
          this.defaultShell = shells[0].path
          shells[0].isDefault = true
        }
      }
    } else {
      // Unix-like: 检测 bash, zsh, fish, sh
      const unixShells = [
        { name: 'bash', path: '/bin/bash' },
        { name: 'zsh', path: '/bin/zsh' },
        { name: 'zsh', path: '/usr/local/bin/zsh' },
        { name: 'fish', path: '/usr/local/bin/fish' },
        { name: 'fish', path: '/usr/bin/fish' },
        { name: 'sh', path: '/bin/sh' }
      ]

      // 从环境变量获取默认 shell
      const envShell = process.env.SHELL || '/bin/bash'

      for (const shell of unixShells) {
        if (existsSync(shell.path)) {
          const isDefault = shell.path === envShell
          shells.push({
            name: shell.name,
            path: shell.path,
            isDefault
          })
          if (isDefault) {
            this.defaultShell = shell.path
          }
        }
      }

      // 如果没有匹配到环境变量的 shell，使用第一个可用的
      if (!this.defaultShell && shells.length > 0) {
        this.defaultShell = shells[0].path
        shells[0].isDefault = true
      }
    }

    this.availableShells = shells
  }

  /**
   * 获取可用的 Shell 列表
   */
  getShells(): ShellInfo[] {
    return this.availableShells
  }

  /**
   * 获取默认 Shell
   */
  getDefaultShell(): string {
    return this.defaultShell || (platform() === 'win32' ? 'powershell.exe' : '/bin/bash')
  }

  /**
   * 创建终端实例
   */
  create(options: TerminalCreateOptions, window: BrowserWindow): TerminalInstance {
    const id = uuidv4()
    const shell = options.shellPath || this.getDefaultShell()
    const name = options.name || 'Terminal'
    const cwd = options.cwd || app.getPath('home')

    // 准备环境变量
    const env: Record<string, string> = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      ...options.env
    }

    // 准备 shell 参数
    let args: string[] = options.shellArgs || []
    if (platform() === 'win32') {
      // Windows 特殊处理
      if (shell.toLowerCase().includes('powershell') || shell.toLowerCase().includes('pwsh')) {
        args = args.length > 0 ? args : ['-NoLogo']
      }
    }

    // 创建 PTY 进程选项
    const ptyOptions: pty.IPtyForkOptions = {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env
    }

    // Windows 不支持 encoding 选项，只在 Unix 系统上设置
    if (platform() !== 'win32') {
      ptyOptions.encoding = 'utf8'
    }

    // 创建 PTY 进程
    const ptyProcess = pty.spawn(shell, args, ptyOptions)

    const terminalProcess: TerminalProcess = {
      id,
      name,
      pty: ptyProcess,
      cwd,
      exited: false
    }

    // 监听数据输出
    ptyProcess.onData((data: string) => {
      if (!window.isDestroyed()) {
        window.webContents.send(`terminal:data:${id}`, data)
      }
    })

    // 监听退出事件
    ptyProcess.onExit(({ exitCode }) => {
      terminalProcess.exited = true
      terminalProcess.exitCode = exitCode
      if (!window.isDestroyed()) {
        window.webContents.send(`terminal:exit:${id}`, { exitCode })
      }
    })

    this.terminals.set(id, terminalProcess)

    return {
      id,
      name,
      pid: ptyProcess.pid,
      cwd,
      exited: false
    }
  }

  /**
   * 向终端写入数据
   */
  write(id: string, data: string): boolean {
    const terminal = this.terminals.get(id)
    if (!terminal || terminal.exited) {
      return false
    }
    terminal.pty.write(data)
    return true
  }

  /**
   * 调整终端尺寸
   */
  resize(id: string, size: TerminalSize): boolean {
    const terminal = this.terminals.get(id)
    if (!terminal || terminal.exited) {
      return false
    }
    terminal.pty.resize(size.cols, size.rows)
    return true
  }

  /**
   * 销毁终端实例
   */
  destroy(id: string): boolean {
    const terminal = this.terminals.get(id)
    if (!terminal) {
      return false
    }
    if (!terminal.exited) {
      terminal.pty.kill()
    }
    this.terminals.delete(id)
    return true
  }

  /**
   * 获取终端信息
   */
  get(id: string): TerminalInstance | undefined {
    const terminal = this.terminals.get(id)
    if (!terminal) {
      return undefined
    }
    return {
      id: terminal.id,
      name: terminal.name,
      pid: terminal.pty.pid,
      cwd: terminal.cwd,
      exited: terminal.exited,
      exitCode: terminal.exitCode
    }
  }

  /**
   * 获取所有终端
   */
  list(): TerminalInstance[] {
    const list: TerminalInstance[] = []
    this.terminals.forEach(terminal => {
      list.push({
        id: terminal.id,
        name: terminal.name,
        pid: terminal.pty.pid,
        cwd: terminal.cwd,
        exited: terminal.exited,
        exitCode: terminal.exitCode
      })
    })
    return list
  }

  /**
   * 销毁所有终端
   */
  destroyAll(): void {
    this.terminals.forEach(terminal => {
      if (!terminal.exited) {
        terminal.pty.kill()
      }
    })
    this.terminals.clear()
  }
}

export const terminalService = new TerminalService()

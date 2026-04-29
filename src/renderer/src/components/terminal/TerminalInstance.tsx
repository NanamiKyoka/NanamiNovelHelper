/**
 * 终端实例组件
 * 封装 xterm.js，处理单个终端的渲染和交互
 */

import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { useThemeStore } from '@stores/themeStore'
import { useTerminalStore } from '@stores/terminalStore'
import styles from './TerminalInstance.module.css'

interface TerminalContainerElement extends HTMLDivElement {
  fitTerminal?: () => void
}

interface TerminalInstanceProps {
  id: string
  cwd?: string
}

export function TerminalInstance({ id, cwd: _cwd }: TerminalInstanceProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const isInitializedRef = useRef(false)

  const resolvedMode = useThemeStore(state => state.resolvedMode)
  const { destroyTerminal } = useTerminalStore()

  // 判断是否为暗色主题
  const isDark = resolvedMode === 'dark'

  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  // 初始化终端
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return
    isInitializedRef.current = true

    // 创建终端实例
    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      lineHeight: 1.2,
      theme: isDarkRef.current
        ? {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            cursorAccent: '#000000',
            selectionBackground: '#264f78',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#e5e5e5'
          }
        : {
            background: '#ffffff',
            foreground: '#333333',
            cursor: '#000000',
            cursorAccent: '#ffffff',
            selectionBackground: '#add6ff',
            black: '#000000',
            red: '#cd3131',
            green: '#00bc00',
            yellow: '#949800',
            blue: '#0451a5',
            magenta: '#bc05bc',
            cyan: '#0598bc',
            white: '#555555',
            brightBlack: '#666666',
            brightRed: '#cd3131',
            brightGreen: '#14ce14',
            brightYellow: '#b5ba00',
            brightBlue: '#0451a5',
            brightMagenta: '#bc05bc',
            brightCyan: '#0598bc',
            brightWhite: '#a5a5a5'
          }
    })

    // 创建插件
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    // 加载插件
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)

    // 打开终端
    terminal.open(containerRef.current)

    // 自适应尺寸
    fitAddon.fit()
    fitAddonRef.current = fitAddon
    terminalRef.current = terminal

    // 通知主进程调整 PTY 尺寸
    const { cols, rows } = terminal
    window.electron.terminal.resize(id, cols, rows)

    // 监听用户输入
    const onDataDisposable = terminal.onData(data => {
      window.electron.terminal.write(id, data)
    })

    // 监听终端输出
    const removeDataListener = window.electron.terminal.onData(id, data => {
      terminal.write(data)
    })

    // 监听终端退出
    const removeExitListener = window.electron.terminal.onExit(id, exitCode => {
      terminal.writeln(`\r\n\x1b[33m进程已退出，退出码: ${exitCode}\x1b[0m`)
      terminal.writeln('\x1b[90m按 Enter 键关闭终端\x1b[0m')

      // 监听 Enter 键关闭
      const onEnterDisposable = terminal.onData(data => {
        if (data === '\r') {
          destroyTerminal(id)
          onEnterDisposable.dispose()
        }
      })
    })

    // 保存清理函数
    cleanupRef.current = () => {
      onDataDisposable.dispose()
      removeDataListener()
      removeExitListener()
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
      isInitializedRef.current = false
    }
  }, [id, destroyTerminal])

  // 主题变化时更新终端主题
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = isDark
        ? {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#ffffff',
            cursorAccent: '#000000',
            selectionBackground: '#264f78',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#e5e5e5'
          }
        : {
            background: '#ffffff',
            foreground: '#333333',
            cursor: '#000000',
            cursorAccent: '#ffffff',
            selectionBackground: '#add6ff',
            black: '#000000',
            red: '#cd3131',
            green: '#00bc00',
            yellow: '#949800',
            blue: '#0451a5',
            magenta: '#bc05bc',
            cyan: '#0598bc',
            white: '#555555',
            brightBlack: '#666666',
            brightRed: '#cd3131',
            brightGreen: '#14ce14',
            brightYellow: '#b5ba00',
            brightBlue: '#0451a5',
            brightMagenta: '#bc05bc',
            brightCyan: '#0598bc',
            brightWhite: '#a5a5a5'
          }
    }
  }, [isDark])

  // 窗口大小变化时调整终端尺寸
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        const { cols, rows } = terminalRef.current
        window.electron.terminal.resize(id, cols, rows)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [id])

  // 自适应尺寸的方法（供父组件调用）
  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      window.electron.terminal.resize(id, cols, rows)
    }
  }, [id])

  // 暴露 fit 方法
  useEffect(() => {
    if (containerRef.current) {
      ;(containerRef.current as TerminalContainerElement).fitTerminal = fit
    }
  }, [fit])

  return <div ref={containerRef} className={styles.terminalContainer} />
}

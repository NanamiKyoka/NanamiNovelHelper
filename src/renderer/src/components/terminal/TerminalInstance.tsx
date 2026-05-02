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
import { TERMINAL_THEMES } from '@shared/constants/colors'
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
      theme: isDarkRef.current ? TERMINAL_THEMES.dark : TERMINAL_THEMES.light
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
      terminalRef.current.options.theme = isDark ? TERMINAL_THEMES.dark : TERMINAL_THEMES.light
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

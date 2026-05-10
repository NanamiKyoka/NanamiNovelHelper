/**
 * 终端实例组件
 * 封装 xterm.js，处理单个终端的渲染和交互
 */

import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { UnlistenFn } from '@tauri-apps/api/event'
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
  const unlistenDataRef = useRef<UnlistenFn | null>(null)
  const unlistenExitRef = useRef<UnlistenFn | null>(null)
  const onDataDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const isMountedRef = useRef(false)
  const isInitializedRef = useRef(false)

  const resolvedMode = useThemeStore(state => state.resolvedMode)
  const { destroyTerminal } = useTerminalStore()

  const isDark = resolvedMode === 'dark'
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    if (isInitializedRef.current) return

    let canceled = false

    const init = async () => {
      try {
        unlistenDataRef.current = await window.api.terminal.onDataAsync(id, (data: string) => {
          if (terminalRef.current && isMountedRef.current) {
            terminalRef.current.write(data)
          }
        })

        if (canceled) {
          unlistenDataRef.current()
          return
        }

        unlistenExitRef.current = await window.api.terminal.onExitAsync(id, (exitCode: number) => {
          if (terminalRef.current && isMountedRef.current) {
            terminalRef.current.writeln(`\r\n\x1b[33m进程已退出，退出码: ${exitCode}\x1b[0m`)
            terminalRef.current.writeln('\x1b[90m按 Enter 键关闭终端\x1b[0m')

            const onEnterDisposable = terminalRef.current.onData(data => {
              if (data === '\r') {
                destroyTerminal(id)
                onEnterDisposable.dispose()
              }
            })
          }
        })

        if (canceled) {
          unlistenDataRef.current()
          unlistenExitRef.current?.()
          return
        }
      } catch (_error) {
        return
      }

      if (!isMountedRef.current || canceled) return

      const terminal = new XTerm({
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        lineHeight: 1.2,
        theme: isDarkRef.current ? TERMINAL_THEMES.dark : TERMINAL_THEMES.light
      })

      const fitAddon = new FitAddon()
      const webLinksAddon = new WebLinksAddon()

      terminal.loadAddon(fitAddon)
      terminal.loadAddon(webLinksAddon)

      if (!isMountedRef.current || canceled || !containerRef.current) {
        terminal.dispose()
        return
      }

      try {
        terminal.open(containerRef.current)
      } catch (_error) {
        terminal.dispose()
        return
      }

      if (!isMountedRef.current || canceled) {
        terminal.dispose()
        return
      }

      fitAddon.fit()
      fitAddonRef.current = fitAddon
      terminalRef.current = terminal
      isInitializedRef.current = true

      const { cols, rows } = terminal

      try {
        await window.api.terminal.resize(id, cols, rows)
      } catch (_err) {
        // resize失败不影响终端使用
      }

      onDataDisposableRef.current = terminal.onData(data => {
        window.api.terminal.write(id, data).catch(() => {})
      })
    }

    init()

    return () => {
      canceled = true

      onDataDisposableRef.current?.dispose()
      onDataDisposableRef.current = null

      unlistenDataRef.current?.()
      unlistenDataRef.current = null

      unlistenExitRef.current?.()
      unlistenExitRef.current = null

      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
      }
      fitAddonRef.current = null
      isInitializedRef.current = false
    }
  }, [id, destroyTerminal])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = isDark ? TERMINAL_THEMES.dark : TERMINAL_THEMES.light
    }
  }, [isDark])

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        const { cols, rows } = terminalRef.current
        window.api.terminal.resize(id, cols, rows).catch(() => {})
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [id])

  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      fitAddonRef.current.fit()
      const { cols, rows } = terminalRef.current
      window.api.terminal.resize(id, cols, rows).catch(() => {})
    }
  }, [id])

  useEffect(() => {
    if (containerRef.current) {
      ;(containerRef.current as TerminalContainerElement).fitTerminal = fit
    }
  }, [fit])

  return <div ref={containerRef} className={styles.terminalContainer} />
}

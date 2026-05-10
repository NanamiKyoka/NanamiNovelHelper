/**
 * 终端独立窗口入口
 */

import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { TerminalWindowApp } from './terminal/TerminalWindowApp'
import { useThemeStore } from '@stores/themeStore'
import { useProjectStore } from '@stores/projectStore'
import { useTerminalStore } from '@stores/terminalStore'
import { initTauriApi } from '@services/tauri/init'
import '@renderer/styles/global.css'

initTauriApi()

// 主题提供者组件
function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const config = useThemeStore(state => state.config)
  const resolvedMode = useThemeStore(state => state.resolvedMode)

  // 更新 CSS 变量和 body 类
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-size', `${config.fontSize}px`)
    root.style.setProperty('--font-family', config.fontFamily)
    root.style.setProperty('--primary-color', config.primaryColor)

    // 更新 body 类
    document.body.classList.remove('light', 'dark')
    document.body.classList.add(resolvedMode)

    // 更新 data 属性（用于 CSS 选择器）
    root.setAttribute('data-theme', resolvedMode)
  }, [config.fontSize, config.fontFamily, config.primaryColor, resolvedMode])

  const antdTheme = {
    algorithm: resolvedMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: true,
    token: {
      colorPrimary: config.primaryColor,
      borderRadius: 4,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily
    }
  }

  return (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  )
}

function TerminalWindow() {
  useEffect(() => {
    const init = async () => {
      try {
        const project = await window.api.project.getCurrent()
        if (project) {
          useProjectStore.setState({ currentProject: project })
        }
      } catch (error) {
        console.error('Failed to load project:', error)
      }

      try {
        const terminals = await window.api.terminal.list()
        useTerminalStore.setState({
          terminals,
          activeTerminalId: terminals.length > 0 ? terminals[0].id : null,
          isPanelVisible: true
        })

        if (terminals.length === 0) {
          const cwd = useProjectStore.getState().currentProject?.path
          useTerminalStore.getState().createTerminal({ cwd })
        }
      } catch (error) {
        console.error('Failed to load terminals:', error)
      }

      useTerminalStore.getState().loadAvailableShells()
    }

    init()
  }, [])

  return (
    <ThemeProvider>
      <TerminalWindowApp />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TerminalWindow />
  </React.StrictMode>
)

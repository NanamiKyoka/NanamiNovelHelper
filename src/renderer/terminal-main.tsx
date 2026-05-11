import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { TerminalWindowApp } from './terminal/TerminalWindowApp'
import { useThemeStore } from '@stores/themeStore'
import { useProjectStore } from '@stores/projectStore'
import { useTerminalStore } from '@stores/terminalStore'
import { initTauriApi } from '@services/tauri/init'
import { disableBrowserAutofill, disableContextMenu } from '@utils/html'
import '@renderer/styles/global.css'

initTauriApi()
disableBrowserAutofill()
disableContextMenu()

function removeSplashScreen() {
  const splash = document.getElementById('splash-screen')
  if (splash) {
    splash.classList.add('fade-out')
    setTimeout(() => {
      splash.remove()
    }, 300)
  }
}

function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const config = useThemeStore(state => state.config)
  const resolvedMode = useThemeStore(state => state.resolvedMode)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-size', `${config.fontSize}px`)
    root.style.setProperty('--font-family', config.fontFamily)
    root.style.setProperty('--primary-color', config.primaryColor)

    document.body.classList.remove('light', 'dark')
    document.body.classList.add(resolvedMode)

    root.setAttribute('data-theme', resolvedMode)
  }, [config.fontSize, config.fontFamily, config.primaryColor, resolvedMode])

  const antdTheme = {
    algorithm: resolvedMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { key: 'app' },
    hashed: false,
    token: {
      colorPrimary: config.primaryColor,
      borderRadius: 4,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily
    }
  }

  return (
    <ConfigProvider locale={zhCN} theme={antdTheme} getPopupContainer={() => document.body}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  )
}

function TerminalWindow() {
  const hasRemovedSplash = useRef(false)

  useEffect(() => {
    const init = async () => {
      try {
        const project = await window.api.project.getCurrent()
        if (project) {
          useProjectStore.setState({ currentProject: project })
        }
      } catch (_error) {
        // 获取项目信息失败
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
          await useTerminalStore.getState().createTerminal({ cwd })
        }
      } catch (_error) {
        // 加载终端列表失败
      }

      try {
        await useTerminalStore.getState().loadAvailableShells()
      } catch (_error) {
        // 加载Shell列表失败
      }

      if (!hasRemovedSplash.current) {
        hasRemovedSplash.current = true
        removeSplashScreen()
      }
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

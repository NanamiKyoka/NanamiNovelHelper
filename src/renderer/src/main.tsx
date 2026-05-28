import React, { useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antTheme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import { useThemeStore } from '@stores/themeStore'
import { useSettingsStore } from '@stores/settingsStore'
import { applyPrimaryColorToRoot } from '@utils/theme'
import { disableBrowserAutofill, disableContextMenu } from '@utils/html'
import { initTauriApi } from '@services/tauri/init'
import { installGlobalErrorHandlers } from '@utils/globalErrorHandler'
import './styles/global.css'

initTauriApi()
installGlobalErrorHandlers()
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

    document.body.classList.remove('light', 'dark')
    document.body.classList.add(resolvedMode)

    root.setAttribute('data-theme', resolvedMode)
  }, [config.fontSize, config.fontFamily, resolvedMode])

  useEffect(() => {
    applyPrimaryColorToRoot(config.primaryColor, resolvedMode === 'dark')
  }, [config.primaryColor, resolvedMode])

  useEffect(() => {
    const root = document.documentElement
    const titlebarHeight = window.api?.platform === 'macos' ? '0px' : '32px'
    root.style.setProperty('--titlebar-height', titlebarHeight)
  }, [])

  const antdTheme = {
    algorithm: resolvedMode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
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

function GlobalSettingsInitializer({ children }: { children: React.ReactNode }): JSX.Element {
  const initGlobalSettings = useSettingsStore(state => state.initGlobalSettings)
  const isInitialized = useSettingsStore(state => state.isInitialized)
  const hasRemovedSplash = useRef(false)

  useEffect(() => {
    initGlobalSettings().catch(err => {
      console.error('Failed to initialize global settings:', err)
    })
  }, [initGlobalSettings])

  useEffect(() => {
    if (isInitialized && !hasRemovedSplash.current) {
      hasRemovedSplash.current = true
      removeSplashScreen()
    }
  }, [isInitialized])

  if (!isInitialized) {
    return <></>
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <GlobalSettingsInitializer>
        <App />
      </GlobalSettingsInitializer>
    </ThemeProvider>
  </React.StrictMode>
)

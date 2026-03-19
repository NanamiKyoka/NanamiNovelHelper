import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antTheme, App as AntApp, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import { useThemeStore } from '@stores/themeStore'
import { useSettingsStore } from '@stores/settingsStore'
import './styles/global.css'

// 主题提供者组件
function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const config = useThemeStore((state) => state.config)
  const resolvedMode = useThemeStore((state) => state.resolvedMode)

  // 更新 CSS 变量和 body 类
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-size', `${config.fontSize}px`)
    root.style.setProperty('--font-family', config.fontFamily)
    
    // 更新 body 类
    document.body.classList.remove('light', 'dark')
    document.body.classList.add(resolvedMode)
    
    // 更新 data 属性（用于 CSS 选择器）
    root.setAttribute('data-theme', resolvedMode)
  }, [config.fontSize, config.fontFamily, resolvedMode])

  // 设置标题栏高度 CSS 变量（用于全屏模式）
  useEffect(() => {
    const root = document.documentElement
    const titlebarHeight = window.electron?.platform === 'darwin' ? '0px' : '32px'
    root.style.setProperty('--titlebar-height', titlebarHeight)
  }, [])

  const antdTheme = {
    algorithm: resolvedMode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
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
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  )
}

// 全局设置初始化组件
function GlobalSettingsInitializer({ children }: { children: React.ReactNode }): JSX.Element {
  const initGlobalSettings = useSettingsStore((state) => state.initGlobalSettings)
  const isInitialized = useSettingsStore((state) => state.isInitialized)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initGlobalSettings().catch((err) => {
      console.error('Failed to initialize global settings:', err)
      setError(err.message)
    })
  }, [initGlobalSettings])

  if (error) {
    // 即使初始化失败也继续渲染，使用默认设置
    console.warn('Using default settings due to initialization error')
  }

  // 等待初始化完成
  if (!isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    )
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
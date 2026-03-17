import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme as antTheme, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import { useThemeStore } from '@stores/themeStore'
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
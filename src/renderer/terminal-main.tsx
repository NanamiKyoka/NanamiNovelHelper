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
import '@renderer/styles/global.css'

// 主题提供者组件
function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const config = useThemeStore((state) => state.config)
  const resolvedMode = useThemeStore((state) => state.resolvedMode)

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
      <AntApp>
        {children}
      </AntApp>
    </ConfigProvider>
  )
}

// 初始化项目
const initProject = async () => {
  try {
    const project = await window.electron.project.getCurrent()
    if (project) {
      useProjectStore.setState({ currentProject: project })
    }
  } catch (error) {
    console.error('Failed to load project:', error)
  }
}

// 初始化终端
const initTerminals = async () => {
  try {
    const terminals = await window.electron.terminal.list()
    useTerminalStore.setState({ 
      terminals,
      activeTerminalId: terminals.length > 0 ? terminals[0].id : null,
      isPanelVisible: true
    })
    
    // 如果没有终端，创建一个
    if (terminals.length === 0) {
      const cwd = useProjectStore.getState().currentProject?.path
      await useTerminalStore.getState().createTerminal({ cwd })
    }
  } catch (error) {
    console.error('Failed to load terminals:', error)
  }
  
  // 加载可用 Shell
  useTerminalStore.getState().loadAvailableShells()
}

// 初始化
initProject()
initTerminals()

function TerminalWindow() {
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

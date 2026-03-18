import { useState, useCallback } from 'react'
import { Layout } from 'antd'
import FileTree from '@components/file-tree/FileTree'
import { SearchPanel } from '@components/search'
import { VisualizationPanel } from '@components/visualization'
import { GitPanel } from '@components/git'
import VocabularyPanel from '@components/vocabulary/VocabularyPanel'
import SensitiveWordPanel from '@components/vocabulary/SensitiveWordPanel'
import styles from './Sidebar.module.css'

const { Sider } = Layout

interface SidebarProps {
  collapsed: boolean
  activePanel: string
  onCollapse: (collapsed: boolean) => void
}

function Sidebar({ collapsed, activePanel, onCollapse }: SidebarProps): JSX.Element {
  const [width, setWidth] = useState(260)

  const handleResize = useCallback(
    (e: MouseEvent) => {
      const newWidth = e.clientX - 48 // 48px 是 ActivityBar 的宽度
      if (newWidth >= 200 && newWidth <= 600) {
        setWidth(newWidth)
      }
    },
    [setWidth]
  )

  const handleResizeEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = ''
  }, [handleResize])

  const handleResizeStart = useCallback(() => {
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = 'col-resize'
  }, [handleResize, handleResizeEnd])

  const renderContent = (): JSX.Element => {
    switch (activePanel) {
      case 'files':
        return <FileTree />
      case 'search':
        return <SearchPanel />
      case 'vocabulary':
        return <VocabularyPanel />
      case 'sensitive':
        return <SensitiveWordPanel />
      case 'git':
        return <GitPanel />
      case 'visualization':
        return <VisualizationPanel />
      default:
        return <div className={styles.panelContent}>未知面板</div>
    }
  }

  // 设置页面在 MainContent 中全屏显示，不需要 Sidebar
  if (activePanel === 'settings') {
    return null
  }

  if (collapsed) {
    return <div className={styles.collapsed} />
  }

  return (
    <Sider
      width={width}
      className={styles.sidebar}
      collapsed={collapsed}
      collapsedWidth={0}
      trigger={null}
    >
      <div className={styles.content}>{renderContent()}</div>
      <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />
    </Sider>
  )
}

export default Sidebar

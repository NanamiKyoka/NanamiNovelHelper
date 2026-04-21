import { useCallback } from 'react'
import { Layout, Button, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import FileTree from '@components/file-tree/FileTree'
import { SearchPanel } from '@components/search'
import { VisualizationPanel } from '@components/visualization'
import { GitPanel } from '@components/git'
import VocabularyPanel from '@components/vocabulary/VocabularyPanel'
import SensitiveWordPanel from '@components/vocabulary/SensitiveWordPanel'
import RelationshipPanel from '@components/visualization/relationship/RelationshipPanel'
import TimelinePanel from '@components/visualization/timeline/TimelinePanel'
import { SequenceChartPanel } from '@components/visualization/sequence-chart'
import { OrganizationPanel } from '@components/visualization/organization'
import { AiAssistantPanel } from '@components/ai-assistant'
import { MapPanel } from '@components/visualization/map'
import { useSettingsStore } from '@stores/settingsStore'
import styles from './Sidebar.module.css'

const { Sider } = Layout
const { Text } = Typography

interface SidebarProps {
  collapsed: boolean
  activePanel: string
  onCollapse: (collapsed: boolean) => void
}

// 面板标题映射
const PANEL_TITLES: Record<string, string> = {
  files: '文件',
  search: '搜索',
  vocabulary: '词汇查询',
  sensitive: '敏感词',
  git: 'Git',
  visualization: '可视化工具',
  relationship: '关系图',
  timeline: '时间线',
  sequenceChart: '事序图',
  organization: '组织架构',
  aiAssistant: 'AI写作助手',
  map: '地图'
}

// 全屏功能面板列表（这些面板需要返回按钮）
const FULLSCREEN_PANELS = ['vocabulary', 'sensitive', 'relationship', 'timeline', 'sequenceChart', 'organization', 'aiAssistant', 'map']

function Sidebar({ collapsed, activePanel, onCollapse }: SidebarProps): JSX.Element {
  const sidebarWidth = useSettingsStore((state) => state.globalSettings.sidebarWidth)
  const setSidebarWidth = useSettingsStore((state) => state.setSidebarWidth)

  const handleResize = useCallback(
    (e: MouseEvent) => {
      const newWidth = e.clientX - 48 // 48px 是 ActivityBar 的宽度
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    },
    [setSidebarWidth]
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
      case 'relationship':
        return <RelationshipPanel />
      case 'timeline':
        return <TimelinePanel />
      case 'sequenceChart':
        return <SequenceChartPanel />
      case 'organization':
        return <OrganizationPanel />
      case 'aiAssistant':
        return <AiAssistantPanel />
      case 'map':
        return <MapPanel />
      default:
        return <div className={styles.panelContent}>未知面板</div>
    }
  }

  // 返回主面板（文件树）
  const handleBackToFiles = useCallback(() => {
    // 通过触发 ActivityBar 的点击来切换回文件面板
    // 这里需要一种方式通知 ActivityBar 切换面板
    // 暂时使用自定义事件
    window.dispatchEvent(new CustomEvent('sidebar-back-to-files'))
  }, [])

  // 设置页面在 MainContent 中全屏显示，不需要 Sidebar
  if (activePanel === 'settings') {
    return null
  }

  if (collapsed) {
    return <div className={styles.collapsed} />
  }

  // 判断是否显示返回按钮
  const showBackButton = FULLSCREEN_PANELS.includes(activePanel)
  const panelTitle = PANEL_TITLES[activePanel] || '面板'

  return (
    <Sider
      width={sidebarWidth}
      className={styles.sidebar}
      collapsed={collapsed}
      collapsedWidth={0}
      trigger={null}
      aria-label="侧边栏"
    >
      {showBackButton && (
        <div className={styles.panelHeader}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBackToFiles}
            className={styles.backButton}
            aria-label="返回文件面板"
          />
          <Text strong className={styles.panelTitle}>{panelTitle}</Text>
        </div>
      )}
      <div className={`${styles.content} ${showBackButton ? styles.withHeader : ''}`} role="region" aria-label={`${panelTitle}面板`}>
        {renderContent()}
      </div>
      <div 
        className={styles.resizeHandle} 
        onMouseDown={handleResizeStart}
        role="separator"
        aria-label="调整侧边栏宽度"
        tabIndex={0}
      />
    </Sider>
  )
}

export default Sidebar
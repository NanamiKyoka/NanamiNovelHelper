import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout, theme, message, Button, Tooltip } from 'antd'
import { TagOutlined, WarningOutlined, UserAddOutlined, ApartmentOutlined, ClockCircleOutlined, TableOutlined, TeamOutlined, CodeOutlined } from '@ant-design/icons'
import ActivityBar from '@components/layout/ActivityBar'
import Sidebar from '@components/layout/Sidebar'
import MainContent from '@components/layout/MainContent'
import StatusBar from '@components/layout/StatusBar'
import TitleBar from '@components/layout/TitleBar'
import { DraggableBadgeContainer } from '@components/layout'
import { WelcomePage, CreateProjectModal, OpenProjectModal } from '@components/project'
import { VocabularyPanel, SensitiveWordPanel } from '@components/vocabulary'
import { RandomNamePanel } from '@components/random-name'
import { RelationshipPanel } from '@components/visualization/relationship'
import { TimelinePanel } from '@components/visualization/timeline'
import { SequenceChartPanel } from '@components/visualization/sequence-chart'
import { OrganizationPanel } from '@components/visualization/organization'
import { TerminalPanel } from '@components/terminal'
import { useProjectStore } from '@stores/projectStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { useRelationshipStore } from '@stores/relationshipStore'
import { useTimelineStore } from '@stores/timelineStore'
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import { useOrganizationStore } from '@stores/organizationStore'
import { useTerminalStore } from '@stores/terminalStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useUIStore } from '@stores/uiStore'
import { useHighlightService } from '@services/highlightService'
import { DEFAULT_BADGE_VISIBILITY } from '@types/settings'
import styles from './App.module.css'

const { Content } = Layout

// 右侧面板类型
type RightPanelKey = 'vocabulary' | 'sensitive' | 'relationship' | 'timeline' | 'sequenceChart' | 'organization' | 'terminal' | null

function App(): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePanel, setActivePanel] = useState<string>('files')
  const [rightPanelKey, setRightPanelKey] = useState<RightPanelKey>(null)
  
  const {
    token: { colorBgContainer }
  } = theme.useToken()
  
  // 项目状态
  const currentProject = useProjectStore((state) => state.currentProject)
  const error = useProjectStore((state) => state.error)
  const clearError = useProjectStore((state) => state.clearError)

  // 词汇和敏感词状态
  const entries = useVocabularyStore((state) => state.entries) || []
  const words = useSensitiveStore((state) => state.words) || []
  const graphs = useRelationshipStore((state) => state.graphs) || []
  const timelines = useTimelineStore((state) => state.timelines) || []
  const charts = useSequenceChartStore((state) => state.charts) || []
  const organizations = useOrganizationStore((state) => state.graphs) || []
  // 终端状态
  const terminals = useTerminalStore((state) => state.terminals) || []
  const loadTypes = useVocabularyStore((state) => state.loadTypes)
  const loadEntries = useVocabularyStore((state) => state.loadEntries)
  const loadWords = useSensitiveStore((state) => state.loadWords)
  const loadGraphList = useRelationshipStore((state) => state.loadList)
  const loadTimelineList = useTimelineStore((state) => state.loadList)
  const loadChartList = useSequenceChartStore((state) => state.loadList)
  const loadOrganizationList = useOrganizationStore((state) => state.loadList)
  const isVocabLoaded = useVocabularyStore((state) => state.isLoaded)
  const isSensitiveLoaded = useSensitiveStore((state) => state.isLoaded)
  const selectedText = useUIStore((state) => state.selectedText)
  const createProjectModalOpen = useUIStore((state) => state.createProjectModalOpen)
  const openProjectModalOpen = useUIStore((state) => state.openProjectModalOpen)
  const closeCreateProjectModal = useUIStore((state) => state.closeCreateProjectModal)
  const closeOpenProjectModal = useUIStore((state) => state.closeOpenProjectModal)
  
  // 高亮服务状态
  const loadHighlightConfig = useHighlightService((state) => state.loadConfig)
  const highlightInitialized = useHighlightService((state) => state.initialized)
  
  // 徽章可见性设置
  const projectSettings = useSettingsStore((state) => state.projectSettings)
  const badgeVisibility = projectSettings?.badgeVisibility || DEFAULT_BADGE_VISIBILITY

  // 错误提示
  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  // 预加载词汇和敏感词数据
  useEffect(() => {
    if (currentProject && !isVocabLoaded) {
      loadTypes()
      loadEntries()
    }
    if (currentProject && !isSensitiveLoaded) {
      loadWords()
    }
    // 加载关系图列表
    if (currentProject) {
      loadGraphList()
    }
    // 加载时间线列表
    if (currentProject) {
      loadTimelineList()
    }
    // 加载事序图列表
    if (currentProject) {
      loadChartList()
    }
    // 加载组织架构图列表
    if (currentProject) {
      loadOrganizationList()
    }
    // 加载高亮配置
    if (currentProject && !highlightInitialized) {
      loadHighlightConfig()
    }
  }, [currentProject, isVocabLoaded, isSensitiveLoaded, highlightInitialized, loadTypes, loadEntries, loadWords, loadGraphList, loadTimelineList, loadChartList, loadOrganizationList, loadHighlightConfig])

  const handleActivityBarClick = (panelId: string): void => {
    if (activePanel === panelId) {
      setSidebarCollapsed(!sidebarCollapsed)
    } else {
      setActivePanel(panelId)
      if (sidebarCollapsed) {
        setSidebarCollapsed(false)
      }
    }
  }

  // 切换右侧面板
  const toggleRightPanel = useCallback((key: Exclude<RightPanelKey, null>) => {
    setRightPanelKey(prev => prev === key ? null : key)
  }, [])

  // 关闭右侧面板
  const closeRightPanel = useCallback(() => {
    setRightPanelKey(null)
  }, [])

  // 徽章配置
  const badgeItems = useMemo(() => {
    const items = [
      {
        id: 'vocabulary' as const,
        visible: badgeVisibility.vocabulary,
        content: (
          <Tooltip title="词汇查询" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'vocabulary' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('vocabulary')}
            >
              <TagOutlined />
              {entries.length > 0 && (
                <span className={styles.badge}>{entries.length}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'sensitive' as const,
        visible: badgeVisibility.sensitive,
        content: (
          <Tooltip title="敏感词" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'sensitive' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('sensitive')}
            >
              <WarningOutlined />
              {words.length > 0 && (
                <span className={styles.badge}>{words.length}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'randomName' as const,
        visible: badgeVisibility.randomName,
        content: (
          <RandomNamePanel>
            <Tooltip title="随机起名" placement="left">
              <div className={styles.triggerBtn}>
                <UserAddOutlined />
              </div>
            </Tooltip>
          </RandomNamePanel>
        )
      },
      {
        id: 'relationship' as const,
        visible: badgeVisibility.relationship,
        content: (
          <Tooltip title="关系图" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'relationship' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('relationship')}
            >
              <ApartmentOutlined />
              {graphs.length > 0 && (
                <span className={styles.badge}>{graphs.length}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'timeline' as const,
        visible: badgeVisibility.timeline,
        content: (
          <Tooltip title="时间线" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'timeline' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('timeline')}
            >
              <ClockCircleOutlined />
              {timelines.length > 0 && (
                <span className={styles.badge}>{timelines.length}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'sequenceChart' as const,
        visible: badgeVisibility.sequenceChart,
        content: (
          <Tooltip title="事序图" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'sequenceChart' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('sequenceChart')}
            >
              <TableOutlined />
              {charts.length > 0 && (
                <span className={styles.badge}>{charts.length}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'organization' as const,
        visible: badgeVisibility.organization,
        content: (
          <Tooltip title="组织架构" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'organization' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('organization')}
            >
              <TeamOutlined />
              {organizations.length > 0 && (
                <span className={styles.badge}>{organizations.length}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'terminal' as const,
        visible: badgeVisibility.terminal,
        content: (
          <Tooltip title="终端" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'terminal' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('terminal')}
            >
              <CodeOutlined />
              {terminals.length > 0 && (
                <span className={styles.badge}>{terminals.length}</span>
              )}
            </div>
          </Tooltip>
        )
      }
    ]
    
    return items.filter(item => item.visible)
  }, [entries.length, words.length, graphs.length, timelines.length, charts.length, organizations.length, terminals.length, rightPanelKey, toggleRightPanel, badgeVisibility])

  // 如果没有打开项目，显示欢迎页面
  if (!currentProject) {
    return (
      <div className={styles.app}>
        {window.electron?.platform !== 'darwin' && <TitleBar />}
        <div className={styles.mainLayout}>
          <Content 
            className={styles.mainContent}
            style={{ background: colorBgContainer }}
          >
            <WelcomePage />
          </Content>
        </div>
        
        {/* 全局模态框 */}
        <CreateProjectModal
          open={createProjectModalOpen}
          onCancel={closeCreateProjectModal}
          onSuccess={closeCreateProjectModal}
        />
        <OpenProjectModal
          open={openProjectModalOpen}
          onCancel={closeOpenProjectModal}
          onSuccess={closeOpenProjectModal}
        />
      </div>
    )
  }

  return (
    <div className={styles.app}>
      {/* 自定义标题栏 - 仅在 Windows/Linux 显示 */}
      {window.electron?.platform !== 'darwin' && <TitleBar />}
      
      {/* 主布局区域 */}
      <div className={styles.mainLayout}>
        <ActivityBar
          activePanel={activePanel}
          onPanelClick={handleActivityBarClick}
        />
        <div className={styles.contentLayout}>
          <Sidebar
            collapsed={sidebarCollapsed}
            activePanel={activePanel}
            onCollapse={setSidebarCollapsed}
          />
          <Content
            className={styles.mainContent}
            style={{ background: colorBgContainer, marginRight: rightPanelKey ? 420 : 60 }}
          >
            <MainContent activePanel={activePanel} />
          </Content>
        </div>
      </div>

      {/* 右侧浮动触发按钮 - 可拖拽排序 */}
      <DraggableBadgeContainer badges={badgeItems} />

      {/* 右侧面板 */}
      {rightPanelKey && (
        <div className={styles.rightSidebar}>
          <div className={styles.rightSidebarHeader}>
            <span>
              {rightPanelKey === 'vocabulary' ? '词汇查询' : 
               rightPanelKey === 'sensitive' ? '敏感词管理' : 
               rightPanelKey === 'relationship' ? '关系图' : 
               rightPanelKey === 'timeline' ? '时间线' : 
               rightPanelKey === 'sequenceChart' ? '事序图' : 
               rightPanelKey === 'terminal' ? '终端' :
               '组织架构'}
            </span>
            <Button type="text" size="small" onClick={closeRightPanel}>
              关闭
            </Button>
          </div>
          <div className={styles.rightSidebarBody}>
            {rightPanelKey === 'vocabulary' && (
              <VocabularyPanel 
                readOnly={false} 
                externalSearchText={selectedText}
              />
            )}
            {rightPanelKey === 'sensitive' && (
              <SensitiveWordPanel readOnly={false} />
            )}
            {rightPanelKey === 'relationship' && (
              <RelationshipPanel />
            )}
            {rightPanelKey === 'timeline' && (
              <TimelinePanel />
            )}
            {rightPanelKey === 'sequenceChart' && (
              <SequenceChartPanel />
            )}
            {rightPanelKey === 'organization' && (
              <OrganizationPanel />
            )}
            {rightPanelKey === 'terminal' && (
              <TerminalPanel onClose={closeRightPanel} />
            )}
          </div>
        </div>
      )}
      
      <StatusBar />
      
      {/* 全局模态框 */}
      <CreateProjectModal
        open={createProjectModalOpen}
        onCancel={closeCreateProjectModal}
        onSuccess={closeCreateProjectModal}
      />
      <OpenProjectModal
        open={openProjectModalOpen}
        onCancel={closeOpenProjectModal}
        onSuccess={closeOpenProjectModal}
      />
    </div>
  )
}

export default App
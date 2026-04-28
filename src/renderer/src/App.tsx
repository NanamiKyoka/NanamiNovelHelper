import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Layout, theme, Button, Tooltip, Spin } from 'antd'
import {
  TagOutlined,
  WarningOutlined,
  UserAddOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  TableOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  CodeOutlined
} from '@ant-design/icons'
import ActivityBar from '@components/layout/ActivityBar'
import Sidebar from '@components/layout/Sidebar'
import MainContent from '@components/layout/MainContent'
import StatusBar from '@components/layout/StatusBar'
import TitleBar from '@components/layout/TitleBar'
import { DraggableBadgeContainer } from '@components/layout'
import { WelcomePage, CreateProjectModal, OpenProjectModal } from '@components/project'
import { RandomNamePanel } from '@components/random-name'
import { ErrorBoundary, GlobalLoading, AboutModal } from '@components/common'
import { useProjectActions, useShortcuts } from '@hooks'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { useRelationshipStore } from '@stores/relationshipStore'
import { useTimelineStore } from '@stores/timelineStore'
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import { useOrganizationStore } from '@stores/organizationStore'
import { useMapStore } from '@stores/mapStore'
import { useTerminalStore } from '@stores/terminalStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useUIStore } from '@stores/uiStore'
import { useLoadingStore } from '@stores/loadingStore'
import { useEditorStore } from '@stores/editorStore'
import { DEFAULT_BADGE_VISIBILITY } from '@shared/settings'
import type { ShortcutConfig } from '@hooks/useShortcuts'
import styles from './App.module.css'

const VocabularyPanel = lazy(() =>
  import('@components/vocabulary/VocabularyPanel').then(m => ({ default: m.VocabularyPanel }))
)
const SensitiveWordPanel = lazy(() =>
  import('@components/vocabulary/SensitiveWordPanel').then(m => ({ default: m.SensitiveWordPanel }))
)
const RelationshipPanel = lazy(
  () => import('@components/visualization/relationship/RelationshipPanel')
)
const TimelinePanel = lazy(() => import('@components/visualization/timeline/TimelinePanel'))
const SequenceChartPanel = lazy(
  () => import('@components/visualization/sequence-chart/SequenceChartPanel')
)
const OrganizationPanel = lazy(
  () => import('@components/visualization/organization/OrganizationPanel')
)
const MapPanel = lazy(() => import('@components/visualization/map/MapPanel'))
const TerminalPanel = lazy(() =>
  import('@components/terminal/TerminalPanel').then(m => ({ default: m.TerminalPanel }))
)

const BADGE_COUNT_THRESHOLD = 0

const { Content } = Layout

// 右侧面板类型
type RightPanelKey =
  | 'vocabulary'
  | 'sensitive'
  | 'relationship'
  | 'timeline'
  | 'sequenceChart'
  | 'organization'
  | 'map'
  | 'terminal'
  | null

function App(): JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePanel, setActivePanel] = useState<string>('files')
  const [rightPanelKey, setRightPanelKey] = useState<RightPanelKey>(null)

  const {
    token: { colorBgContainer }
  } = theme.useToken()

  // 项目状态（使用 useProjectActions 统一管理）
  const { currentProject, error, isLoading: projectLoading, clearError } = useProjectActions()

  // 词汇和敏感词数量（只订阅数量，避免订阅整个数组导致不必要的重渲染）
  const entriesCount = useVocabularyStore(state => state.entries.length)
  const wordsCount = useSensitiveStore(state => state.words.length)
  const graphsCount = useRelationshipStore(state => state.graphs.length)
  const timelinesCount = useTimelineStore(state => state.timelines.length)
  const chartsCount = useSequenceChartStore(state => state.charts.length)
  const organizationsCount = useOrganizationStore(state => state.graphs.length)
  const mapsCount = useMapStore(state => state.maps.length)
  const terminalsCount = useTerminalStore(state => state.terminals.length)

  const selectedText = useUIStore(state => state.selectedText)
  const createProjectModalOpen = useUIStore(state => state.createProjectModalOpen)
  const openProjectModalOpen = useUIStore(state => state.openProjectModalOpen)
  const closeCreateProjectModal = useUIStore(state => state.closeCreateProjectModal)
  const closeOpenProjectModal = useUIStore(state => state.closeOpenProjectModal)

  // 全局加载状态
  const startLoading = useLoadingStore(s => s.startLoading)
  const endLoading = useLoadingStore(s => s.endLoading)

  // 徽章可见性设置
  const globalSettings = useSettingsStore(state => state.globalSettings)
  const badgeVisibility = globalSettings.layout?.badgeVisibility || DEFAULT_BADGE_VISIBILITY

  // 错误提示
  useEffect(() => {
    if (error) {
      // 动态导入 message 避免循环依赖
      import('antd').then(({ message }) => {
        message.error(error)
      })
      clearError()
    }
  }, [error, clearError])

  // 项目加载状态同步到全局 Loading Store
  useEffect(() => {
    if (projectLoading) {
      startLoading('project-init', 'project', '加载项目中...')
    } else {
      endLoading('project-init')
    }
  }, [projectLoading, startLoading, endLoading])

  // 文件变化监听（外部修改文件时刷新编辑器）
  useEffect(() => {
    if (!currentProject) return

    const handleFileChange = (
      event:
        | {
            changes: { type: 'add' | 'change' | 'unlink'; path: string }[]
            timestamp: number
          }
        | { type: 'bulk-operation-end'; timestamp: number }
    ) => {
      if ('type' in event && event.type === 'bulk-operation-end') {
        useEditorStore.getState().handleBulkOperationEnd()
        return
      }

      if ('changes' in event) {
        const changedPaths: string[] = []
        const deletedPaths: string[] = []

        for (const change of event.changes) {
          if (change.type === 'change' || change.type === 'add') {
            changedPaths.push(change.path)
          } else if (change.type === 'unlink') {
            deletedPaths.push(change.path)
          }
        }

        if (changedPaths.length > 0) {
          useEditorStore.getState().handleExternalFileChanges(changedPaths)
        }
        if (deletedPaths.length > 0) {
          useEditorStore.getState().handleExternalFileDeletions(deletedPaths)
        }
      }
    }

    window.electron?.window.onFileChange(handleFileChange)

    return () => {
      window.electron?.window.removeFileChangeListener()
    }
  }, [currentProject])

  // 全局快捷键
  const shortcuts: ShortcutConfig[] = useMemo(
    () => [
      // 文件操作
      {
        id: 'file.save',
        key: 'Ctrl+S',
        action: () => {
          // 触发保存当前文件
          window.dispatchEvent(new CustomEvent('shortcut:save'))
        },
        description: '保存当前文件',
        category: '文件'
      },
      {
        id: 'file.saveAll',
        key: 'Ctrl+Shift+S',
        action: () => {
          window.dispatchEvent(new CustomEvent('shortcut:saveAll'))
        },
        description: '保存所有文件',
        category: '文件'
      },
      // 视图操作
      {
        id: 'view.sidebar',
        key: 'Ctrl+B',
        action: () => setSidebarCollapsed(prev => !prev),
        description: '切换侧边栏',
        category: '视图'
      },
      // 工具面板切换
      {
        id: 'tools.vocabulary',
        key: 'Ctrl+Shift+V',
        action: () => toggleRightPanel('vocabulary'),
        description: '词汇面板',
        category: '工具'
      },
      {
        id: 'tools.relationship',
        key: 'Ctrl+Shift+R',
        action: () => toggleRightPanel('relationship'),
        description: '关系图面板',
        category: '工具'
      },
      {
        id: 'tools.timeline',
        key: 'Ctrl+Shift+T',
        action: () => toggleRightPanel('timeline'),
        description: '时间线面板',
        category: '工具'
      },
      {
        id: 'tools.terminal',
        key: 'Ctrl+`',
        action: () => toggleRightPanel('terminal'),
        description: '终端面板',
        category: '工具'
      }
    ],
    []
  )

  useShortcuts(shortcuts, [])

  useEffect(() => {
    const handleOpenSettings = () => {
      setActivePanel('settings')
      setSidebarCollapsed(false)
    }

    const handleToggleSidebar = () => {
      setSidebarCollapsed(prev => !prev)
    }

    window.addEventListener('menu:openSettings', handleOpenSettings)
    window.addEventListener('menu:toggleSidebar', handleToggleSidebar)

    return () => {
      window.removeEventListener('menu:openSettings', handleOpenSettings)
      window.removeEventListener('menu:toggleSidebar', handleToggleSidebar)
    }
  }, [])

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
    setRightPanelKey(prev => (prev === key ? null : key))
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
              {entriesCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{entriesCount}</span>
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
              {wordsCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{wordsCount}</span>
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
              {graphsCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{graphsCount}</span>
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
              {timelinesCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{timelinesCount}</span>
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
              {chartsCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{chartsCount}</span>
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
              {organizationsCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{organizationsCount}</span>
              )}
            </div>
          </Tooltip>
        )
      },
      {
        id: 'map' as const,
        visible: badgeVisibility.map,
        content: (
          <Tooltip title="地图设计" placement="left">
            <div
              className={`${styles.triggerBtn} ${rightPanelKey === 'map' ? styles.active : ''}`}
              onClick={() => toggleRightPanel('map')}
            >
              <EnvironmentOutlined />
              {mapsCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{mapsCount}</span>
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
              {terminalsCount > BADGE_COUNT_THRESHOLD && (
                <span className={styles.badge}>{terminalsCount}</span>
              )}
            </div>
          </Tooltip>
        )
      }
    ]

    return items.filter(item => item.visible)
  }, [
    entriesCount,
    wordsCount,
    graphsCount,
    timelinesCount,
    chartsCount,
    organizationsCount,
    mapsCount,
    terminalsCount,
    rightPanelKey,
    toggleRightPanel,
    badgeVisibility
  ])

  // 如果没有打开项目，显示欢迎页面
  if (!currentProject) {
    return (
      <div className={styles.app} role="application" aria-label="Nanami Novel Helper">
        {window.electron?.platform !== 'darwin' && <TitleBar />}
        <div className={styles.mainLayout}>
          <Content
            className={styles.mainContent}
            style={{ background: colorBgContainer }}
            role="main"
          >
            <WelcomePage />
          </Content>
        </div>

        {/* 全局加载指示器 */}
        <GlobalLoading />

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
    <div className={styles.app} role="application" aria-label="Nanami Novel Helper">
      {/* 自定义标题栏 - 仅在 Windows/Linux 显示 */}
      {window.electron?.platform !== 'darwin' && <TitleBar />}

      {/* 主布局区域 */}
      <div className={styles.mainLayout}>
        <nav aria-label="主导航">
          <ActivityBar
            activePanel={activePanel}
            sidebarCollapsed={sidebarCollapsed}
            onPanelClick={handleActivityBarClick}
          />
        </nav>
        <div className={styles.contentLayout}>
          <aside aria-label="侧边栏">
            <ErrorBoundary moduleName="Sidebar">
              <Sidebar
                collapsed={sidebarCollapsed}
                activePanel={activePanel}
                onCollapse={setSidebarCollapsed}
              />
            </ErrorBoundary>
          </aside>
          <Content
            className={styles.mainContent}
            style={{ background: colorBgContainer, marginRight: rightPanelKey ? 420 : 60 }}
            role="main"
          >
            <ErrorBoundary moduleName="MainContent">
              <MainContent activePanel={activePanel} />
            </ErrorBoundary>
          </Content>
        </div>
      </div>

      {/* 右侧浮动触发按钮 - 可拖拽排序 */}
      <nav aria-label="工具面板导航">
        <DraggableBadgeContainer badges={badgeItems} />
      </nav>

      {/* 右侧面板 */}
      {rightPanelKey && (
        <aside
          className={styles.rightSidebar}
          aria-label={`${
            rightPanelKey === 'vocabulary'
              ? '词汇查询'
              : rightPanelKey === 'sensitive'
                ? '敏感词管理'
                : rightPanelKey === 'relationship'
                  ? '关系图'
                  : rightPanelKey === 'timeline'
                    ? '时间线'
                    : rightPanelKey === 'sequenceChart'
                      ? '事序图'
                      : rightPanelKey === 'organization'
                        ? '组织架构'
                        : rightPanelKey === 'map'
                          ? '地图设计'
                          : rightPanelKey === 'terminal'
                            ? '终端'
                            : '面板'
          }面板`}
        >
          <div className={styles.rightSidebarHeader}>
            <span id={`right-panel-title-${rightPanelKey}`}>
              {rightPanelKey === 'vocabulary'
                ? '词汇查询'
                : rightPanelKey === 'sensitive'
                  ? '敏感词管理'
                  : rightPanelKey === 'relationship'
                    ? '关系图'
                    : rightPanelKey === 'timeline'
                      ? '时间线'
                      : rightPanelKey === 'sequenceChart'
                        ? '事序图'
                        : rightPanelKey === 'organization'
                          ? '组织架构'
                          : rightPanelKey === 'map'
                            ? '地图设计'
                            : rightPanelKey === 'terminal'
                              ? '终端'
                              : '面板'}
            </span>
            <Button type="text" size="small" onClick={closeRightPanel} aria-label="关闭面板">
              关闭
            </Button>
          </div>
          <div
            className={styles.rightSidebarBody}
            role="region"
            aria-labelledby={`right-panel-title-${rightPanelKey}`}
          >
            <ErrorBoundary moduleName={rightPanelKey}>
              <Suspense
                fallback={
                  <div className={styles.panelLoading}>
                    <Spin />
                  </div>
                }
              >
                {rightPanelKey === 'vocabulary' && (
                  <VocabularyPanel readOnly={false} externalSearchText={selectedText} />
                )}
                {rightPanelKey === 'sensitive' && <SensitiveWordPanel readOnly={false} />}
                {rightPanelKey === 'relationship' && <RelationshipPanel />}
                {rightPanelKey === 'timeline' && <TimelinePanel />}
                {rightPanelKey === 'sequenceChart' && <SequenceChartPanel />}
                {rightPanelKey === 'organization' && <OrganizationPanel />}
                {rightPanelKey === 'map' && <MapPanel />}
                {rightPanelKey === 'terminal' && <TerminalPanel onClose={closeRightPanel} />}
              </Suspense>
            </ErrorBoundary>
          </div>
        </aside>
      )}

      <StatusBar />

      {/* 全局加载指示器 */}
      <GlobalLoading />

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
      <AboutModal />
    </div>
  )
}

export default App

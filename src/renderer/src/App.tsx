import { useState, useEffect, useMemo } from 'react'
import { Layout, theme, App as AntApp } from 'antd'
import ActivityBar from '@components/layout/ActivityBar'
import Sidebar from '@components/layout/Sidebar'
import MainContent from '@components/layout/MainContent'
import StatusBar from '@components/layout/StatusBar'
import TitleBar from '@components/layout/TitleBar'
import { SecondarySidebar } from '@components/layout'
import { WelcomePage, CreateProjectModal, OpenProjectModal } from '@components/project'
import { ErrorBoundary, GlobalLoading, AboutModal } from '@components/common'
import { useProjectActions, useShortcuts } from '@hooks'
import { useUIStore } from '@stores/uiStore'
import { useLoadingStore } from '@stores/loadingStore'
import { useEditorStore } from '@stores/editorStore'
import { useGitStore } from '@stores/gitStore'
import { useFileTreeStore } from '@stores/fileTreeStore'
import { useViewStore } from '@stores/viewStore'
import { VIEW_DEFINITIONS } from '@constants/views'
import type { ShortcutConfig } from '@hooks/useShortcuts'
import styles from './App.module.css'

const { Content } = Layout

function App(): JSX.Element {
  const { message } = AntApp.useApp()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePanel, setActivePanel] = useState<string>('files')

  const {
    token: { colorBgContainer }
  } = theme.useToken()

  // 项目状态（使用 useProjectActions 统一管理）
  const { currentProject, error, isLoading: projectLoading, clearError } = useProjectActions()

  const createProjectModalOpen = useUIStore(state => state.createProjectModalOpen)

  const openProjectModalOpen = useUIStore(state => state.openProjectModalOpen)
  const closeCreateProjectModal = useUIStore(state => state.closeCreateProjectModal)
  const closeOpenProjectModal = useUIStore(state => state.closeOpenProjectModal)

  // 全局加载状态
  const startLoading = useLoadingStore(s => s.startLoading)
  const endLoading = useLoadingStore(s => s.endLoading)

  // 错误提示

  // 错误提示
  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError, message])

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
        useGitStore.getState().refresh()
        useFileTreeStore.getState().refreshTree()
        return
      }

      if ('changes' in event) {
        const changedPaths: string[] = []
        const deletedPaths: string[] = []
        let hasFileStructureChange = false

        for (const change of event.changes) {
          if (change.type === 'change' || change.type === 'add') {
            changedPaths.push(change.path)
          } else if (change.type === 'unlink') {
            deletedPaths.push(change.path)
          }
          if (change.type === 'add' || change.type === 'unlink') {
            hasFileStructureChange = true
          }
        }

        if (changedPaths.length > 0) {
          useEditorStore.getState().handleExternalFileChanges(changedPaths)
        }
        if (deletedPaths.length > 0) {
          useEditorStore.getState().handleExternalFileDeletions(deletedPaths)
        }

        if (changedPaths.length > 0 || deletedPaths.length > 0) {
          useGitStore.getState().scheduleRefresh()
        }
        if (hasFileStructureChange) {
          useFileTreeStore.getState().refreshTree()
        }
      }
    }

    window.api?.window.onFileChange(handleFileChange)

    return () => {
      window.api?.window.removeFileChangeListener()
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
      {
        id: 'view.secondarySidebar',
        key: 'Ctrl+Shift+B',
        action: () => useViewStore.getState().toggleSecondary(),
        description: '切换辅助侧边栏',
        category: '视图'
      },
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

  // 视图系统初始化
  useEffect(() => {
    const { registerViews, loadConfig } = useViewStore.getState()
    registerViews(VIEW_DEFINITIONS)
    loadConfig()
  }, [])

  // 连接 ActivityBar 点击到视图切换
  useEffect(() => {
    const unsub = useViewStore.subscribe(state => {
      if (state.activePrimaryId && state.activePrimaryId !== activePanel) {
        setActivePanel(state.activePrimaryId)
      }
    })
    return unsub
  }, [activePanel])

  // 如果没有打开项目，显示欢迎页面
  if (!currentProject) {
    return (
      <div className={styles.app} role="application" aria-label="Nanami Novel Helper">
        {window.api?.platform !== 'macos' && <TitleBar />}
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
      {window.api?.platform !== 'macos' && <TitleBar />}

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
            style={{ background: colorBgContainer }}
            role="main"
          >
            <ErrorBoundary moduleName="MainContent">
              <MainContent activePanel={activePanel} />
            </ErrorBoundary>
          </Content>

          {/* 辅助侧边栏（Secondary Sidebar） */}
          <SecondarySidebar />
        </div>
      </div>

      <StatusBar />

      <GlobalLoading />

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
